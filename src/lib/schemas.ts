import { z } from 'zod';

// ============================================
// Onboarding Schemas
// ============================================

export const roleSelectSchema = z.object({
  role: z.enum(['project_coordinator', 'builder_gc', 'designer_architect', 'other'], {
    message: 'Please select your role',
  }),
});

export type RoleSelectFormData = z.infer<typeof roleSelectSchema>;

export const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  client_name: z.string().min(1, 'Client name is required'),
  address: z.string().optional(),
  client_email: z.union([z.string().email('Invalid email'), z.literal('')]).optional(),
  client_phone: z.string().optional(),
  // Handle NaN from empty number inputs (valueAsNumber returns NaN for empty)
  total_budget: z.number().positive('Budget must be positive').optional()
    .refine((val) => val === undefined || !Number.isNaN(val), { message: 'Invalid budget' })
    .or(z.nan().transform(() => undefined)),
});

export type ProjectFormData = z.infer<typeof projectSchema>;

export const addProjectsSchema = z.object({
  projects: z.array(projectSchema).min(1, 'Add at least one project'),
});

export type AddProjectsFormData = z.infer<typeof addProjectsSchema>;

export const firstFireSchema = z.object({
  project_id: z.string().min(1, 'Please select a project'),
  task: z.string().min(1, 'Describe what\'s keeping you up at night'),
  blocking_type: z.enum(['waiting_on_someone', 'missing_info', 'havent_started', 'unclear_next_step']),
  // Conditional fields
  poc_name: z.string().optional(),
  poc_type: z.enum(['client', 'vendor', 'contractor', 'design_team']).optional(),
  missing_info: z.string().optional(),
});

export type FirstFireFormData = z.infer<typeof firstFireSchema>;

// ============================================
// Quick Entry Schemas
// ============================================

export const newRFISchema = z.object({
  project_id: z.string().min(1, 'Project is required'),
  task: z.string().min(1, 'Task name is required'),
  scope: z.string().optional(),
  poc_name: z.string().optional(),
  poc_type: z.enum(['client', 'vendor', 'contractor', 'internal', 'design_team']).optional(),
  priority: z.enum(['P1', 'P2', 'P3']),
  is_blocking: z.boolean(),
  blocks_description: z.string().optional(),
});

export type NewRFIFormData = z.infer<typeof newRFISchema>;

export const statusUpdateSchema = z.object({
  project_id: z.string().min(1, 'Project is required'),
  rfi_id: z.string().min(1, 'Task is required'),
  new_status: z.enum([
    'open',
    'waiting_on_client',
    'waiting_on_vendor',
    'waiting_on_contractor',
    'waiting_on_me',
    'follow_up',
    'completed',
    'dead',
  ]),
  note: z.string().optional(),
  next_action_date: z.string().optional(),
  stall_reason: z.enum(['avoiding_contact', 'unclear_next_step', 'missing_info', 'deprioritized']).optional(),
});

export type StatusUpdateFormData = z.infer<typeof statusUpdateSchema>;

export const logQuoteSchema = z.object({
  project_id: z.string().min(1, 'Project is required'),
  trade_category_id: z.string().min(1, 'Trade is required'),
  vendor_id: z.string().optional(),
  new_vendor_name: z.string().optional(),
  quoted_price: z.number().positive('Price must be positive'),
  notes: z.string().optional(),
});

export type LogQuoteFormData = z.infer<typeof logQuoteSchema>;

export const callLogSchema = z.object({
  contact_name: z.string().min(1, 'Contact name is required'),
  project_id: z.string().optional(),
  note: z.string().min(1, 'What happened on the call?'),
  next_step: z.enum(['waiting_on_them', 'i_need_to_do', 'done', 'follow_up_by']),
  follow_up_date: z.string().optional(),
});

export type CallLogFormData = z.infer<typeof callLogSchema>;

export const newVendorSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  poc_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  trade_ids: z.array(z.string()).min(1, 'Select at least one trade'),
});

export type NewVendorFormData = z.infer<typeof newVendorSchema>;

export const newProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  client_name: z.string().min(1, 'Client name is required'),
  address: z.string().optional(),
  client_email: z.string().email('Invalid email').optional().or(z.literal('')),
  client_phone: z.string().optional(),
  total_budget: z.number().positive('Budget must be positive').optional().nullable(),
});

export type NewProjectFormData = z.infer<typeof newProjectSchema>;

// ============================================
// Settings Schemas
// ============================================

export const followUpSettingsSchema = z.object({
  follow_up_days_client: z.number().min(1).max(30),
  follow_up_days_vendor: z.number().min(1).max(30),
  follow_up_days_contractor: z.number().min(1).max(30),
});

export type FollowUpSettingsFormData = z.infer<typeof followUpSettingsSchema>;
