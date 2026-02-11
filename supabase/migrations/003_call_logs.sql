-- Migration: Call Logs Table
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Create call_logs table
-- ============================================
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  contact_name TEXT NOT NULL,
  contact_type TEXT, -- 'client', 'vendor', 'contractor', 'design_team', 'other'
  phone_number TEXT,
  note TEXT NOT NULL,
  outcome TEXT NOT NULL, -- 'waiting_on_them', 'i_need_to_do', 'done', 'follow_up_by'
  follow_up_date DATE,
  follow_up_rfi_id UUID REFERENCES rfis(id) ON DELETE SET NULL, -- Link to created follow-up task
  duration_minutes INTEGER, -- Optional: how long was the call
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 2. Create indexes for fast lookups
-- ============================================
CREATE INDEX IF NOT EXISTS idx_call_logs_user_id ON call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_project_id ON call_logs(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at DESC);

-- ============================================
-- 3. Create view for call logs with project info
-- ============================================
CREATE OR REPLACE VIEW call_logs_view AS
SELECT
  cl.*,
  p.name AS project_name,
  r.task AS follow_up_task
FROM call_logs cl
LEFT JOIN projects p ON cl.project_id = p.id
LEFT JOIN rfis r ON cl.follow_up_rfi_id = r.id;
