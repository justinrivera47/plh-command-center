-- PLH Command Center Database Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE project_status AS ENUM ('active', 'on_hold', 'completed', 'archived');
CREATE TYPE rfi_status AS ENUM (
  'open',
  'waiting_on_client',
  'waiting_on_vendor',
  'waiting_on_contractor',
  'waiting_on_me',
  'follow_up',
  'completed',
  'dead'
);
CREATE TYPE priority AS ENUM ('P1', 'P2', 'P3');
CREATE TYPE poc_type AS ENUM ('client', 'vendor', 'contractor', 'internal');
CREATE TYPE stall_reason AS ENUM ('avoiding_contact', 'unclear_next_step', 'missing_info', 'deprioritized');
CREATE TYPE quote_status AS ENUM (
  'pending',
  'quoted',
  'approved',
  'declined',
  'contract_sent',
  'signed',
  'in_progress',
  'completed'
);
CREATE TYPE vendor_status AS ENUM ('active', 'inactive');
CREATE TYPE rating AS ENUM ('great', 'good', 'fair', 'poor', 'unknown');
CREATE TYPE user_role AS ENUM ('project_coordinator', 'builder_gc', 'designer_architect', 'other');
CREATE TYPE message_channel AS ENUM ('email', 'phone', 'text');

-- ============================================
-- USER PROFILES
-- ============================================

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role,
  follow_up_days_client INTEGER NOT NULL DEFAULT 3,
  follow_up_days_vendor INTEGER NOT NULL DEFAULT 5,
  follow_up_days_contractor INTEGER NOT NULL DEFAULT 3,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- CORE TABLES
-- ============================================

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  status project_status NOT NULL DEFAULT 'active',
  total_budget DECIMAL(12, 2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE trade_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  poc_name TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  license_number TEXT,
  quality_rating rating NOT NULL DEFAULT 'unknown',
  communication_rating rating NOT NULL DEFAULT 'unknown',
  status vendor_status NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vendor_trades (
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  trade_category_id UUID NOT NULL REFERENCES trade_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (vendor_id, trade_category_id)
);

-- ============================================
-- TASK TRACKING
-- ============================================

CREATE TABLE rfis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task TEXT NOT NULL,
  scope TEXT,
  poc_type poc_type,
  poc_name TEXT,
  status rfi_status NOT NULL DEFAULT 'open',
  priority priority NOT NULL DEFAULT 'P3',
  start_date DATE,
  end_date DATE,
  next_action_date DATE,
  follow_up_days INTEGER NOT NULL DEFAULT 5,
  last_contacted_at TIMESTAMPTZ,
  latest_update TEXT,
  is_complete BOOLEAN NOT NULL DEFAULT FALSE,
  is_blocking BOOLEAN NOT NULL DEFAULT FALSE,
  blocks_description TEXT,
  blocked_by_rfi_id UUID REFERENCES rfis(id) ON DELETE SET NULL,
  stall_reason stall_reason,
  stall_note TEXT,
  milestone TEXT,
  deliverable TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent circular blocking references
CREATE OR REPLACE FUNCTION check_circular_blocking()
RETURNS TRIGGER AS $$
DECLARE
  current_id UUID;
  visited_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  IF NEW.blocked_by_rfi_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Cannot block yourself
  IF NEW.blocked_by_rfi_id = NEW.id THEN
    RAISE EXCEPTION 'An RFI cannot be blocked by itself';
  END IF;

  -- Check for circular reference
  current_id := NEW.blocked_by_rfi_id;
  WHILE current_id IS NOT NULL LOOP
    IF current_id = NEW.id THEN
      RAISE EXCEPTION 'Circular blocking reference detected';
    END IF;

    IF current_id = ANY(visited_ids) THEN
      EXIT; -- Already visited, stop to prevent infinite loop
    END IF;

    visited_ids := array_append(visited_ids, current_id);

    SELECT blocked_by_rfi_id INTO current_id
    FROM rfis
    WHERE id = current_id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_circular_blocking
  BEFORE INSERT OR UPDATE ON rfis
  FOR EACH ROW
  EXECUTE FUNCTION check_circular_blocking();

CREATE TABLE rfi_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfi_id UUID NOT NULL REFERENCES rfis(id) ON DELETE CASCADE,
  previous_status rfi_status,
  new_status rfi_status NOT NULL,
  note TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- FINANCIAL
-- ============================================

CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  trade_category_id UUID REFERENCES trade_categories(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  plan_provided_date DATE,
  scope_provided_date DATE,
  quote_received_date DATE,
  due_date DATE,
  budget_amount DECIMAL(12, 2),
  quoted_price DECIMAL(12, 2),
  status quote_status NOT NULL DEFAULT 'pending',
  decision_approved_by TEXT,
  builder_confirmation_sent BOOLEAN NOT NULL DEFAULT FALSE,
  contract_signed BOOLEAN NOT NULL DEFAULT FALSE,
  scope_notes TEXT,
  availability TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project_budget_areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  area_name TEXT NOT NULL,
  budgeted_amount DECIMAL(12, 2),
  actual_amount DECIMAL(12, 2),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE budget_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_area_id UUID NOT NULL REFERENCES project_budget_areas(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  budgeted_amount DECIMAL(12, 2),
  actual_amount DECIMAL(12, 2),
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- COMMUNICATION
-- ============================================

CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  subject_template TEXT,
  body_template TEXT NOT NULL,
  channel message_channel NOT NULL DEFAULT 'email',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- AUDIT
-- ============================================

CREATE TABLE change_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  record_type TEXT NOT NULL,
  record_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- VIEWS
-- ============================================

CREATE OR REPLACE VIEW war_room AS
SELECT
  r.*,
  p.name AS project_name,
  p.address AS project_address,
  CASE
    WHEN r.last_contacted_at IS NOT NULL
    THEN EXTRACT(DAY FROM NOW() - r.last_contacted_at)::INTEGER
    ELSE NULL
  END AS days_since_contact,
  CASE
    WHEN r.next_action_date IS NOT NULL AND r.next_action_date < CURRENT_DATE
    THEN TRUE
    WHEN r.last_contacted_at IS NOT NULL
      AND r.last_contacted_at + (r.follow_up_days || ' days')::INTERVAL < NOW()
      AND r.status IN ('waiting_on_client', 'waiting_on_vendor', 'waiting_on_contractor')
    THEN TRUE
    ELSE FALSE
  END AS is_overdue,
  blocker.task AS blocked_by_task_name
FROM rfis r
JOIN projects p ON r.project_id = p.id
LEFT JOIN rfis blocker ON r.blocked_by_rfi_id = blocker.id
WHERE r.is_complete = FALSE
  AND r.status != 'dead'
  AND p.status = 'active';

CREATE OR REPLACE VIEW quote_comparison AS
SELECT
  q.*,
  p.name AS project_name,
  tc.name AS trade_name,
  v.company_name AS vendor_name,
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
LEFT JOIN vendors v ON q.vendor_id = v.id;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_rfis_user_id ON rfis(user_id);
CREATE INDEX idx_rfis_project_id ON rfis(project_id);
CREATE INDEX idx_rfis_status ON rfis(status);
CREATE INDEX idx_rfis_priority ON rfis(priority);
CREATE INDEX idx_rfis_is_blocking ON rfis(is_blocking) WHERE is_blocking = TRUE;
CREATE INDEX idx_rfis_next_action_date ON rfis(next_action_date) WHERE next_action_date IS NOT NULL;
CREATE INDEX idx_quotes_user_id ON quotes(user_id);
CREATE INDEX idx_quotes_project_id ON quotes(project_id);
CREATE INDEX idx_quotes_vendor_id ON quotes(vendor_id);
CREATE INDEX idx_vendors_user_id ON vendors(user_id);
CREATE INDEX idx_vendors_status ON vendors(status);
CREATE INDEX idx_change_log_record ON change_log(record_type, record_id);
CREATE INDEX idx_rfi_activity_log_rfi_id ON rfi_activity_log(rfi_id);
CREATE INDEX idx_budget_line_items_area_id ON budget_line_items(budget_area_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_budget_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfi_activity_log ENABLE ROW LEVEL SECURITY;

-- User profiles: users can only see/edit their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Projects: users can only see/edit their own projects
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- Vendors: users can only see/edit their own vendors
CREATE POLICY "Users can view own vendors"
  ON vendors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vendors"
  ON vendors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vendors"
  ON vendors FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vendors"
  ON vendors FOR DELETE
  USING (auth.uid() = user_id);

-- RFIs: users can only see/edit their own RFIs
CREATE POLICY "Users can view own rfis"
  ON rfis FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rfis"
  ON rfis FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rfis"
  ON rfis FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own rfis"
  ON rfis FOR DELETE
  USING (auth.uid() = user_id);

-- Quotes: users can only see/edit their own quotes
CREATE POLICY "Users can view own quotes"
  ON quotes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quotes"
  ON quotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quotes"
  ON quotes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own quotes"
  ON quotes FOR DELETE
  USING (auth.uid() = user_id);

-- Project budget areas: access via project ownership
CREATE POLICY "Users can view own project budget areas"
  ON project_budget_areas FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = project_budget_areas.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own project budget areas"
  ON project_budget_areas FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = project_budget_areas.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own project budget areas"
  ON project_budget_areas FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = project_budget_areas.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own project budget areas"
  ON project_budget_areas FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = project_budget_areas.project_id AND projects.user_id = auth.uid()
  ));

-- Budget line items: access via budget area -> project ownership
ALTER TABLE budget_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budget line items"
  ON budget_line_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM project_budget_areas pba
    JOIN projects p ON p.id = pba.project_id
    WHERE pba.id = budget_line_items.budget_area_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own budget line items"
  ON budget_line_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM project_budget_areas pba
    JOIN projects p ON p.id = pba.project_id
    WHERE pba.id = budget_line_items.budget_area_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own budget line items"
  ON budget_line_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM project_budget_areas pba
    JOIN projects p ON p.id = pba.project_id
    WHERE pba.id = budget_line_items.budget_area_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own budget line items"
  ON budget_line_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM project_budget_areas pba
    JOIN projects p ON p.id = pba.project_id
    WHERE pba.id = budget_line_items.budget_area_id AND p.user_id = auth.uid()
  ));

-- Change log: users can view/insert their own changes
CREATE POLICY "Users can view own change log"
  ON change_log FOR SELECT
  USING (auth.uid() = changed_by);

CREATE POLICY "Users can insert own change log"
  ON change_log FOR INSERT
  WITH CHECK (auth.uid() = changed_by);

-- RFI activity log: access via RFI ownership
CREATE POLICY "Users can view own rfi activity"
  ON rfi_activity_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM rfis WHERE rfis.id = rfi_activity_log.rfi_id AND rfis.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own rfi activity"
  ON rfi_activity_log FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM rfis WHERE rfis.id = rfi_activity_log.rfi_id AND rfis.user_id = auth.uid()
  ));

-- Trade categories: readable by all authenticated users (reference data)
ALTER TABLE trade_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trade categories are viewable by authenticated users"
  ON trade_categories FOR SELECT
  TO authenticated
  USING (TRUE);

-- Message templates: readable by all authenticated users (reference data)
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Message templates are viewable by authenticated users"
  ON message_templates FOR SELECT
  TO authenticated
  USING (TRUE);

-- Vendor trades: access follows vendor ownership
ALTER TABLE vendor_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own vendor trades"
  ON vendor_trades FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM vendors WHERE vendors.id = vendor_trades.vendor_id AND vendors.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own vendor trades"
  ON vendor_trades FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM vendors WHERE vendors.id = vendor_trades.vendor_id AND vendors.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own vendor trades"
  ON vendor_trades FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM vendors WHERE vendors.id = vendor_trades.vendor_id AND vendors.user_id = auth.uid()
  ));

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rfis_updated_at
  BEFORE UPDATE ON rfis
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_line_items_updated_at
  BEFORE UPDATE ON budget_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRIGGER TO CREATE USER PROFILE ON SIGNUP
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- SEED DATA: TRADE CATEGORIES
-- ============================================

INSERT INTO trade_categories (name, sort_order) VALUES
  ('Acoustical Ceilings', 1),
  ('Appliances', 2),
  ('Cabinets & Millwork', 3),
  ('Concrete', 4),
  ('Countertops', 5),
  ('Demolition', 6),
  ('Doors & Hardware', 7),
  ('Drywall', 8),
  ('Electrical', 9),
  ('Elevators', 10),
  ('Excavation & Grading', 11),
  ('Fencing', 12),
  ('Fire Protection', 13),
  ('Flooring', 14),
  ('Framing', 15),
  ('Glass & Glazing', 16),
  ('HVAC', 17),
  ('Insulation', 18),
  ('Landscaping', 19),
  ('Masonry', 20),
  ('Painting', 21),
  ('Plumbing', 22),
  ('Roofing', 23),
  ('Security Systems', 24),
  ('Siding', 25),
  ('Solar', 26),
  ('Stucco', 27),
  ('Tile', 28),
  ('Waterproofing', 29),
  ('Windows', 30),
  ('Other', 31);

-- ============================================
-- SEED DATA: MESSAGE TEMPLATES
-- ============================================

INSERT INTO message_templates (category, name, subject_template, body_template, channel, notes) VALUES
  ('request_dimensions', 'Request Dimensions from Builder',
   'Dimensions needed for {{project}} - {{item}}',
   'Hi {{poc}},

I''m working on {{item}} for {{project}} and need the following dimensions to proceed:

{{scope}}

Could you please provide these when you have a chance? This is blocking the next step in our process.

Thanks!',
   'email', 'Use when you need specific measurements from the builder'),

  ('request_quote', 'Request Quote from Vendor',
   'Quote request for {{project}} - {{item}}',
   'Hi {{poc}},

I''d like to request a quote for the following work on {{project}}:

{{scope}}

Budget target: {{budget}}

Please let me know if you need any additional information to provide a quote.

Thank you!',
   'email', 'Initial quote request to vendor'),

  ('follow_up_quote', 'Follow Up on Quote',
   'Following up: {{project}} quote request',
   'Hi {{poc}},

Just following up on the quote request I sent on {{lastDate}} for {{project}}.

The work scope was:
{{scope}}

Please let me know if you need any additional information, or if you have an ETA on the quote.

Thanks!',
   'email', 'Follow up when quote is overdue'),

  ('follow_up_client', 'Follow Up with Client',
   'Quick check-in: {{project}} - {{item}}',
   'Hi {{poc}},

I wanted to follow up on {{item}} for {{project}}.

{{scope}}

Just want to make sure we''re still on the same page. Let me know if you have any questions or if anything has changed.

Thanks!',
   'email', 'Check in with client on decision or approval'),

  ('follow_up_contractor', 'Follow Up with Contractor',
   'Status update request: {{project}} - {{item}}',
   'Hi {{poc}},

Checking in on the status of {{item}} for {{project}}.

Last we spoke: {{latestUpdate}}

Can you give me an update on where things stand? I want to make sure we''re on track.

Thanks!',
   'email', 'Check status with contractor on active work'),

  ('request_approval', 'Request Approval for Over-Budget Item',
   'Approval needed: {{project}} - {{item}} (over budget)',
   'Hi {{poc}},

I need approval on an item for {{project}} that came in over budget:

Item: {{item}}
Budget: {{budget}}
Quoted: {{price}}
Variance: {{variance}}

{{scope}}

Please let me know if you''d like to:
1. Approve as quoted
2. Request a value engineering option
3. Discuss alternatives

Thanks!',
   'email', 'Use for items that exceed the budgeted amount'),

  ('check_availability', 'Check Vendor Availability',
   '{{project}} - Availability check',
   'Hi {{poc}},

We''re planning work on {{project}} and I wanted to check your availability.

Scope: {{scope}}

What does your schedule look like for the next few weeks? We''d like to get you on the calendar as soon as possible.

Thanks!',
   'email', 'Check if vendor is available for upcoming work'),

  ('phone_script', 'Phone Follow-Up Script',
   NULL,
   'Hi {{poc}}, this is [Your Name] calling about {{project}}.

[If voicemail:]
Just following up on {{item}}. Please give me a call back at [your number] when you get a chance. Thanks!

[If they answer:]
I''m following up on {{item}}. Do you have a quick minute to discuss?

Key points to cover:
- {{scope}}
- Last status: {{latestUpdate}}
- What I need: [specific ask]',
   'phone', 'Script for phone follow-ups');
