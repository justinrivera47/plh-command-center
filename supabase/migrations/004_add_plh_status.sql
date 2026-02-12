-- Migration: Add PLH as a status option
-- This allows tracking tasks that are waiting on PLH (the company)

-- 1. Add plh to poc_type enum
ALTER TYPE poc_type ADD VALUE IF NOT EXISTS 'plh';

-- 2. Add waiting_on_design_team to rfi_status enum (if not exists from earlier)
ALTER TYPE rfi_status ADD VALUE IF NOT EXISTS 'waiting_on_design_team' AFTER 'waiting_on_contractor';

-- 3. Add waiting_on_plh to rfi_status enum
ALTER TYPE rfi_status ADD VALUE IF NOT EXISTS 'waiting_on_plh' AFTER 'waiting_on_design_team';

-- 4. Add design_team to poc_type enum (if not exists)
ALTER TYPE poc_type ADD VALUE IF NOT EXISTS 'design_team';

-- 5. Update the war_room view to include new statuses in is_overdue calculation
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
      AND r.status IN ('waiting_on_client', 'waiting_on_vendor', 'waiting_on_contractor', 'waiting_on_design_team', 'waiting_on_plh', 'waiting_on_me')
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
