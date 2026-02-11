-- Migration: Quote-to-Budget Linking & Design Team Status
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Add design_team to poc_type enum
-- ============================================
ALTER TYPE poc_type ADD VALUE IF NOT EXISTS 'design_team';

-- ============================================
-- 2. Add waiting_on_design_team to rfi_status enum
-- ============================================
ALTER TYPE rfi_status ADD VALUE IF NOT EXISTS 'waiting_on_design_team' AFTER 'waiting_on_contractor';

-- ============================================
-- 3. Add budget_line_item_id to quotes table
-- ============================================
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS budget_line_item_id UUID REFERENCES budget_line_items(id) ON DELETE SET NULL;

-- ============================================
-- 4. Add awarded_quote_id to budget_line_items
--    (tracks which quote won, locks the actual)
-- ============================================
ALTER TABLE budget_line_items
ADD COLUMN IF NOT EXISTS awarded_quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL;

-- ============================================
-- 5. Create index for faster quote lookups
-- ============================================
CREATE INDEX IF NOT EXISTS idx_quotes_budget_line_item
ON quotes(budget_line_item_id)
WHERE budget_line_item_id IS NOT NULL;

-- ============================================
-- 6. Update quote_comparison view to include budget line item info
-- ============================================
CREATE OR REPLACE VIEW quote_comparison AS
SELECT
  q.*,
  p.name AS project_name,
  p.user_id,
  tc.name AS trade_name,
  v.company_name AS vendor_name,
  v.poc_name AS vendor_poc,
  v.phone AS vendor_phone,
  v.email AS vendor_email,
  bli.item_name AS budget_item_name,
  bli.budgeted_amount AS budget_item_budgeted,
  bli.actual_amount AS budget_item_actual,
  bli.awarded_quote_id,
  CASE
    WHEN q.budget_amount IS NOT NULL AND q.quoted_price IS NOT NULL
    THEN q.quoted_price - q.budget_amount
    ELSE NULL
  END AS budget_variance,
  CASE
    WHEN q.budget_amount IS NOT NULL AND q.budget_amount > 0 AND q.quoted_price IS NOT NULL
    THEN ROUND(((q.quoted_price - q.budget_amount) / q.budget_amount * 100)::NUMERIC, 1)
    ELSE NULL
  END AS budget_variance_percent
FROM quotes q
JOIN projects p ON q.project_id = p.id
LEFT JOIN trade_categories tc ON q.trade_category_id = tc.id
LEFT JOIN vendors v ON q.vendor_id = v.id
LEFT JOIN budget_line_items bli ON q.budget_line_item_id = bli.id;

-- ============================================
-- 7. Function to update budget line item actual from lowest quote
-- ============================================
CREATE OR REPLACE FUNCTION update_budget_line_item_actual()
RETURNS TRIGGER AS $$
DECLARE
  v_budget_line_item_id UUID;
  v_lowest_price DECIMAL(12, 2);
  v_awarded_quote_id UUID;
  v_current_actual DECIMAL(12, 2);
  v_awarded_price DECIMAL(12, 2);
  v_user_id UUID;
BEGIN
  -- Get the budget_line_item_id from the quote (NEW for insert/update, OLD for delete)
  IF TG_OP = 'DELETE' THEN
    v_budget_line_item_id := OLD.budget_line_item_id;
    v_user_id := OLD.user_id;
  ELSE
    v_budget_line_item_id := NEW.budget_line_item_id;
    v_user_id := NEW.user_id;
  END IF;

  -- If no budget line item linked, exit
  IF v_budget_line_item_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Check if there's an awarded quote for this budget line item
  SELECT awarded_quote_id, actual_amount
  INTO v_awarded_quote_id, v_current_actual
  FROM budget_line_items
  WHERE id = v_budget_line_item_id;

  -- If awarded, check if the awarded quote price should be used
  IF v_awarded_quote_id IS NOT NULL THEN
    -- Get the awarded quote's price
    SELECT quoted_price INTO v_awarded_price
    FROM quotes
    WHERE id = v_awarded_quote_id;

    -- Update actual to awarded price if different
    IF v_current_actual IS DISTINCT FROM v_awarded_price THEN
      UPDATE budget_line_items
      SET actual_amount = v_awarded_price,
          updated_at = NOW()
      WHERE id = v_budget_line_item_id;

      -- Log the change
      INSERT INTO change_log (record_type, record_id, field_name, old_value, new_value, changed_by, note)
      VALUES (
        'budget_line_item',
        v_budget_line_item_id,
        'actual_amount',
        v_current_actual::TEXT,
        v_awarded_price::TEXT,
        v_user_id,
        'Actual updated to match awarded quote price'
      );
    END IF;
  ELSE
    -- No award yet - find lowest quoted price from non-declined quotes
    SELECT MIN(quoted_price) INTO v_lowest_price
    FROM quotes
    WHERE budget_line_item_id = v_budget_line_item_id
      AND quoted_price IS NOT NULL
      AND status NOT IN ('declined');

    -- Update actual if different
    IF v_current_actual IS DISTINCT FROM v_lowest_price THEN
      UPDATE budget_line_items
      SET actual_amount = v_lowest_price,
          updated_at = NOW()
      WHERE id = v_budget_line_item_id;

      -- Log the change
      INSERT INTO change_log (record_type, record_id, field_name, old_value, new_value, changed_by, note)
      VALUES (
        'budget_line_item',
        v_budget_line_item_id,
        'actual_amount',
        COALESCE(v_current_actual::TEXT, '—'),
        COALESCE(v_lowest_price::TEXT, '—'),
        v_user_id,
        CASE
          WHEN TG_OP = 'INSERT' THEN 'New quote received, actual updated to lowest price'
          WHEN TG_OP = 'UPDATE' THEN 'Quote updated, actual recalculated to lowest price'
          ELSE 'Quote removed, actual recalculated to lowest price'
        END
      );
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. Trigger to auto-update budget line item actual
-- ============================================
DROP TRIGGER IF EXISTS quote_budget_sync ON quotes;
CREATE TRIGGER quote_budget_sync
  AFTER INSERT OR UPDATE OF quoted_price, budget_line_item_id, status OR DELETE
  ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_line_item_actual();

-- ============================================
-- 9. Function to lock actual when quote is awarded
-- ============================================
CREATE OR REPLACE FUNCTION lock_budget_on_award()
RETURNS TRIGGER AS $$
DECLARE
  v_current_actual DECIMAL(12, 2);
BEGIN
  -- Check if status changed to an "awarded" status
  IF NEW.status IN ('approved', 'signed', 'contract_sent', 'in_progress', 'completed')
     AND (OLD.status IS NULL OR OLD.status NOT IN ('approved', 'signed', 'contract_sent', 'in_progress', 'completed'))
     AND NEW.budget_line_item_id IS NOT NULL THEN

    -- Get current actual
    SELECT actual_amount INTO v_current_actual
    FROM budget_line_items
    WHERE id = NEW.budget_line_item_id;

    -- Set awarded_quote_id and update actual to this quote's price
    UPDATE budget_line_items
    SET awarded_quote_id = NEW.id,
        actual_amount = NEW.quoted_price,
        updated_at = NOW()
    WHERE id = NEW.budget_line_item_id;

    -- Log the award
    INSERT INTO change_log (record_type, record_id, field_name, old_value, new_value, changed_by, note)
    VALUES (
      'budget_line_item',
      NEW.budget_line_item_id,
      'actual_amount',
      COALESCE(v_current_actual::TEXT, '—'),
      NEW.quoted_price::TEXT,
      NEW.user_id,
      'Vendor awarded - actual locked to awarded price'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. Trigger to lock budget on award
-- ============================================
DROP TRIGGER IF EXISTS quote_award_lock ON quotes;
CREATE TRIGGER quote_award_lock
  AFTER UPDATE OF status
  ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION lock_budget_on_award();
