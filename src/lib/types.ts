// Database types for PLH Command Center

// ============================================
// Enums
// ============================================

export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived';

export type RFIStatus =
  | 'open'
  | 'waiting_on_client'
  | 'waiting_on_vendor'
  | 'waiting_on_contractor'
  | 'waiting_on_design_team'
  | 'waiting_on_me'
  | 'follow_up'
  | 'completed'
  | 'dead';

export type Priority = 'P1' | 'P2' | 'P3';

export type POCType = 'client' | 'vendor' | 'contractor' | 'internal' | 'design_team';

export type StallReason =
  | 'avoiding_contact'
  | 'unclear_next_step'
  | 'missing_info'
  | 'deprioritized';

export type QuoteStatus =
  | 'pending'
  | 'quoted'
  | 'approved'
  | 'declined'
  | 'contract_sent'
  | 'signed'
  | 'in_progress'
  | 'completed';

export type VendorStatus = 'active' | 'inactive';

export type Rating = 'great' | 'good' | 'fair' | 'poor' | 'unknown';

export type UserRole =
  | 'project_coordinator'
  | 'builder_gc'
  | 'designer_architect'
  | 'other';

export type MessageChannel = 'email' | 'phone' | 'text';

// ============================================
// Core Tables
// ============================================

export interface Project {
  id: string;
  user_id: string;
  name: string;
  address: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  status: ProjectStatus;
  total_budget: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TradeCategory {
  id: string;
  name: string;
  sort_order: number;
}

export interface Vendor {
  id: string;
  user_id: string;
  company_name: string;
  poc_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  license_number: string | null;
  quality_rating: Rating;
  communication_rating: Rating;
  status: VendorStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorTrade {
  vendor_id: string;
  trade_category_id: string;
}

// ============================================
// Task Tracking
// ============================================

export interface RFI {
  id: string;
  user_id: string;
  project_id: string;
  task: string;
  scope: string | null;
  poc_type: POCType | null;
  poc_name: string | null;
  status: RFIStatus;
  priority: Priority;
  start_date: string | null;
  end_date: string | null;
  next_action_date: string | null;
  follow_up_days: number;
  last_contacted_at: string | null;
  latest_update: string | null;
  is_complete: boolean;
  is_blocking: boolean;
  blocks_description: string | null;
  blocked_by_rfi_id: string | null;
  stall_reason: StallReason | null;
  stall_note: string | null;
  milestone: string | null;
  deliverable: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RFIActivityLog {
  id: string;
  rfi_id: string;
  previous_status: RFIStatus | null;
  new_status: RFIStatus;
  note: string | null;
  source: string | null;
  created_at: string;
}

// ============================================
// Financial
// ============================================

export interface Quote {
  id: string;
  user_id: string;
  project_id: string;
  trade_category_id: string | null;
  vendor_id: string | null;
  budget_line_item_id: string | null;
  plan_provided_date: string | null;
  scope_provided_date: string | null;
  quote_received_date: string | null;
  due_date: string | null;
  budget_amount: number | null;
  quoted_price: number | null;
  status: QuoteStatus;
  decision_approved_by: string | null;
  builder_confirmation_sent: boolean;
  contract_signed: boolean;
  scope_notes: string | null;
  availability: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectBudgetArea {
  id: string;
  project_id: string;
  area_name: string;
  budgeted_amount: number | null;
  actual_amount: number | null;
  sort_order: number;
}

export interface BudgetLineItem {
  id: string;
  budget_area_id: string;
  item_name: string;
  budgeted_amount: number | null;
  actual_amount: number | null;
  awarded_quote_id: string | null;
  sort_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Communication
// ============================================

export interface MessageTemplate {
  id: string;
  category: string;
  name: string;
  subject_template: string | null;
  body_template: string;
  channel: MessageChannel;
  notes: string | null;
  created_at: string;
}

// ============================================
// Audit
// ============================================

export interface ChangeLog {
  id: string;
  record_type: string;
  record_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
  note: string | null;
  created_at: string;
}

// ============================================
// Call Logs
// ============================================

export type CallOutcome = 'waiting_on_them' | 'i_need_to_do' | 'done' | 'follow_up_by';

export interface CallLog {
  id: string;
  user_id: string;
  project_id: string | null;
  contact_name: string;
  contact_type: string | null;
  phone_number: string | null;
  note: string;
  outcome: CallOutcome;
  follow_up_date: string | null;
  follow_up_rfi_id: string | null;
  duration_minutes: number | null;
  created_at: string;
}

export interface CallLogView extends CallLog {
  project_name: string | null;
  follow_up_task: string | null;
}

// ============================================
// User Profile
// ============================================

export interface UserProfile {
  id: string;
  role: UserRole | null;
  follow_up_days_client: number;
  follow_up_days_vendor: number;
  follow_up_days_contractor: number;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// View Types (Aggregated)
// ============================================

export interface WarRoomItem extends RFI {
  project_name: string;
  project_address: string | null;
  days_since_contact: number | null;
  is_overdue: boolean;
  blocked_by_task_name: string | null;
}

export interface QuoteComparison extends Quote {
  project_name: string;
  trade_name: string | null;
  vendor_name: string | null;
  vendor_poc: string | null;
  vendor_phone: string | null;
  vendor_email: string | null;
  budget_item_name: string | null;
  budget_item_budgeted: number | null;
  budget_item_actual: number | null;
  awarded_quote_id: string | null;
  budget_variance: number | null;
  budget_variance_percent: number | null;
}

// ============================================
// Form Types (for React Hook Form)
// ============================================

export interface ProjectFormData {
  name: string;
  address?: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  total_budget?: number;
  notes?: string;
}

export interface RFIFormData {
  project_id: string;
  task: string;
  scope?: string;
  poc_type?: POCType;
  poc_name?: string;
  priority: Priority;
  is_blocking?: boolean;
  blocks_description?: string;
  stall_reason?: StallReason;
}

export interface QuoteFormData {
  project_id: string;
  trade_category_id?: string;
  vendor_id?: string;
  quoted_price?: number;
  notes?: string;
}

export interface VendorFormData {
  company_name: string;
  poc_name?: string;
  phone?: string;
  email?: string;
  trade_ids: string[];
}

export interface StatusUpdateFormData {
  rfi_id: string;
  new_status: RFIStatus;
  note?: string;
  next_action_date?: string;
}
