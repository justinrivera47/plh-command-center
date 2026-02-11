-- Migration: Add PLH as a status option
-- This allows tracking tasks that are waiting on PLH (the company)

-- 1. Add plh to poc_type enum
ALTER TYPE poc_type ADD VALUE IF NOT EXISTS 'plh';

-- 2. Add waiting_on_plh to rfi_status enum
ALTER TYPE rfi_status ADD VALUE IF NOT EXISTS 'waiting_on_plh' AFTER 'waiting_on_design_team';
