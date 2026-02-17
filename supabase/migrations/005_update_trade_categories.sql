-- Migration: Update Trade Categories
-- Add: Carpentry, Interior Doors, Exterior Doors, Stairs
-- Remove: Solar, Security Systems, Acoustical Ceilings

-- ============================================
-- ADD NEW TRADE CATEGORIES
-- ============================================

INSERT INTO trade_categories (name, sort_order) VALUES
  ('Carpentry', 32),
  ('Interior Doors', 33),
  ('Exterior Doors', 34),
  ('Stairs', 35)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- REMOVE TRADE CATEGORIES
-- Note: We need to handle foreign key constraints
-- First, update any quotes/vendor_trades referencing these categories
-- ============================================

-- Get the IDs of categories to delete
DO $$
DECLARE
  solar_id UUID;
  security_id UUID;
  acoustical_id UUID;
  other_id UUID;
BEGIN
  -- Get the 'Other' category ID as fallback
  SELECT id INTO other_id FROM trade_categories WHERE name = 'Other';

  -- Get IDs of categories to delete
  SELECT id INTO solar_id FROM trade_categories WHERE name = 'Solar';
  SELECT id INTO security_id FROM trade_categories WHERE name = 'Security Systems';
  SELECT id INTO acoustical_id FROM trade_categories WHERE name = 'Acoustical Ceilings';

  -- Update quotes to use 'Other' category if they reference deleted categories
  IF solar_id IS NOT NULL THEN
    UPDATE quotes SET trade_category_id = other_id WHERE trade_category_id = solar_id;
    DELETE FROM vendor_trades WHERE trade_category_id = solar_id;
  END IF;

  IF security_id IS NOT NULL THEN
    UPDATE quotes SET trade_category_id = other_id WHERE trade_category_id = security_id;
    DELETE FROM vendor_trades WHERE trade_category_id = security_id;
  END IF;

  IF acoustical_id IS NOT NULL THEN
    UPDATE quotes SET trade_category_id = other_id WHERE trade_category_id = acoustical_id;
    DELETE FROM vendor_trades WHERE trade_category_id = acoustical_id;
  END IF;
END $$;

-- Now delete the categories
DELETE FROM trade_categories WHERE name IN ('Solar', 'Security Systems', 'Acoustical Ceilings');

-- ============================================
-- REORDER SORT ORDER FOR CLEANER DISPLAY
-- ============================================

-- Update sort_order to be alphabetical
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name) as new_order
  FROM trade_categories
)
UPDATE trade_categories
SET sort_order = ordered.new_order
FROM ordered
WHERE trade_categories.id = ordered.id;
