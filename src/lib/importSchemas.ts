import { z } from 'zod';

// ============================================
// Import Types
// ============================================

export type ImportType = 'projects' | 'tasks' | 'budget_items' | 'vendors';

export const IMPORT_TYPE_CONFIG: Record<ImportType, {
  label: string;
  description: string;
  requiredFields: string[];
  optionalFields: string[];
}> = {
  projects: {
    label: 'Projects',
    description: 'Import project details including client information and budget',
    requiredFields: ['name', 'client_name'],
    optionalFields: ['address', 'client_email', 'client_phone', 'total_budget'],
  },
  tasks: {
    label: 'Tasks / RFIs',
    description: 'Import tasks and action items linked to projects',
    requiredFields: ['project_name', 'task'],
    optionalFields: ['status', 'priority', 'poc_name', 'poc_type', 'is_blocking'],
  },
  budget_items: {
    label: 'Budget Line Items',
    description: 'Import budget line items organized by area',
    requiredFields: ['project_name', 'area_name', 'item_name'],
    optionalFields: ['budgeted_amount', 'actual_amount'],
  },
  vendors: {
    label: 'Vendors',
    description: 'Import vendor contacts with trade associations',
    requiredFields: ['company_name'],
    optionalFields: ['poc_name', 'phone', 'email', 'trades'],
  },
};

// ============================================
// Import Schemas with Coercion
// ============================================

// Helper to coerce empty strings to null
const emptyToNullOptional = z.string().optional().transform(val => !val || val === '' ? null : val);

// Helper to coerce string to number or null
const stringToNumber = z.string()
  .optional()
  .transform(val => {
    if (!val || val === '') return null;
    const num = parseFloat(val.replace(/[,$]/g, ''));
    return isNaN(num) ? null : num;
  });

// Helper to coerce string to boolean
const stringToBoolean = z.string()
  .optional()
  .transform(val => {
    if (!val || val === '') return false;
    return ['true', '1', 'yes', 'y'].includes(val.toLowerCase());
  });

// Project import schema
export const importProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  client_name: z.string().min(1, 'Client name is required'),
  address: emptyToNullOptional,
  client_email: z.string()
    .optional()
    .transform(val => {
      if (!val || val === '') return null;
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(val) ? val : null;
    }),
  client_phone: emptyToNullOptional,
  total_budget: stringToNumber,
});

export type ImportProjectRow = z.input<typeof importProjectSchema>;
export type ValidatedProjectRow = z.output<typeof importProjectSchema>;

// Task/RFI import schema
const rfiStatusValues = [
  'open',
  'waiting_on_client',
  'waiting_on_vendor',
  'waiting_on_contractor',
  'waiting_on_me',
  'follow_up',
  'completed',
  'dead',
] as const;

const priorityValues = ['P1', 'P2', 'P3'] as const;
const pocTypeValues = ['client', 'vendor', 'contractor', 'internal'] as const;

export const importTaskSchema = z.object({
  project_name: z.string().min(1, 'Project name is required'),
  task: z.string().min(1, 'Task description is required'),
  status: z.string()
    .optional()
    .transform(val => {
      if (!val || val === '') return 'open';
      const normalized = val.toLowerCase().replace(/\s+/g, '_');
      return rfiStatusValues.includes(normalized as any) ? normalized : 'open';
    }),
  priority: z.string()
    .optional()
    .transform(val => {
      if (!val || val === '') return 'P3';
      const upper = val.toUpperCase();
      return priorityValues.includes(upper as any) ? upper : 'P3';
    }),
  poc_name: emptyToNullOptional,
  poc_type: z.string()
    .optional()
    .transform(val => {
      if (!val || val === '') return null;
      const normalized = val.toLowerCase();
      return pocTypeValues.includes(normalized as any) ? normalized : null;
    }),
  is_blocking: stringToBoolean,
});

export type ImportTaskRow = z.input<typeof importTaskSchema>;
export type ValidatedTaskRow = z.output<typeof importTaskSchema>;

// Budget item import schema
export const importBudgetItemSchema = z.object({
  project_name: z.string().min(1, 'Project name is required'),
  area_name: z.string().min(1, 'Budget area name is required'),
  item_name: z.string().min(1, 'Item name is required'),
  budgeted_amount: stringToNumber,
  actual_amount: stringToNumber,
});

export type ImportBudgetItemRow = z.input<typeof importBudgetItemSchema>;
export type ValidatedBudgetItemRow = z.output<typeof importBudgetItemSchema>;

// Vendor import schema
export const importVendorSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  poc_name: emptyToNullOptional,
  phone: emptyToNullOptional,
  email: z.string()
    .optional()
    .transform(val => {
      if (!val || val === '') return null;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(val) ? val : null;
    }),
  trades: emptyToNullOptional, // Comma-separated, will be parsed later
});

export type ImportVendorRow = z.input<typeof importVendorSchema>;
export type ValidatedVendorRow = z.output<typeof importVendorSchema>;

// ============================================
// Field Definitions for Column Mapping
// ============================================

export interface FieldDefinition {
  key: string;
  label: string;
  required: boolean;
  aliases: string[]; // Common column names that map to this field
}

export const PROJECT_FIELDS: FieldDefinition[] = [
  { key: 'name', label: 'Project Name', required: true, aliases: ['project_name', 'project', 'title', 'name'] },
  { key: 'client_name', label: 'Client Name', required: true, aliases: ['client_name', 'client', 'customer', 'owner'] },
  { key: 'address', label: 'Address', required: false, aliases: ['address', 'location', 'site_address', 'project_address'] },
  { key: 'client_email', label: 'Client Email', required: false, aliases: ['client_email', 'email', 'contact_email'] },
  { key: 'client_phone', label: 'Client Phone', required: false, aliases: ['client_phone', 'phone', 'contact_phone', 'tel'] },
  { key: 'total_budget', label: 'Total Budget', required: false, aliases: ['total_budget', 'budget', 'amount', 'contract_value'] },
];

export const TASK_FIELDS: FieldDefinition[] = [
  { key: 'project_name', label: 'Project Name', required: true, aliases: ['project_name', 'project', 'project_title'] },
  { key: 'task', label: 'Task Description', required: true, aliases: ['task', 'description', 'title', 'item', 'action'] },
  { key: 'status', label: 'Status', required: false, aliases: ['status', 'state', 'task_status'] },
  { key: 'priority', label: 'Priority', required: false, aliases: ['priority', 'urgency', 'importance'] },
  { key: 'poc_name', label: 'Contact Name', required: false, aliases: ['poc_name', 'contact', 'assigned_to', 'owner'] },
  { key: 'poc_type', label: 'Contact Type', required: false, aliases: ['poc_type', 'contact_type', 'type'] },
  { key: 'is_blocking', label: 'Is Blocking', required: false, aliases: ['is_blocking', 'blocking', 'blocker'] },
];

export const BUDGET_ITEM_FIELDS: FieldDefinition[] = [
  { key: 'project_name', label: 'Project Name', required: true, aliases: ['project_name', 'project'] },
  { key: 'area_name', label: 'Budget Area', required: true, aliases: ['area_name', 'area', 'category', 'section'] },
  { key: 'item_name', label: 'Item Name', required: true, aliases: ['item_name', 'item', 'description', 'line_item'] },
  { key: 'budgeted_amount', label: 'Budgeted Amount', required: false, aliases: ['budgeted_amount', 'budgeted', 'budget', 'estimate'] },
  { key: 'actual_amount', label: 'Actual Amount', required: false, aliases: ['actual_amount', 'actual', 'spent', 'cost'] },
];

export const VENDOR_FIELDS: FieldDefinition[] = [
  { key: 'company_name', label: 'Company Name', required: true, aliases: ['company_name', 'company', 'vendor', 'name', 'business_name'] },
  { key: 'poc_name', label: 'Contact Person', required: false, aliases: ['poc_name', 'contact', 'contact_name', 'representative'] },
  { key: 'phone', label: 'Phone', required: false, aliases: ['phone', 'tel', 'telephone', 'contact_phone'] },
  { key: 'email', label: 'Email', required: false, aliases: ['email', 'contact_email', 'e-mail'] },
  { key: 'trades', label: 'Trades', required: false, aliases: ['trades', 'trade', 'services', 'categories', 'specialty'] },
];

export function getFieldsForType(type: ImportType): FieldDefinition[] {
  switch (type) {
    case 'projects':
      return PROJECT_FIELDS;
    case 'tasks':
      return TASK_FIELDS;
    case 'budget_items':
      return BUDGET_ITEM_FIELDS;
    case 'vendors':
      return VENDOR_FIELDS;
  }
}

export function getSchemaForType(type: ImportType) {
  switch (type) {
    case 'projects':
      return importProjectSchema;
    case 'tasks':
      return importTaskSchema;
    case 'budget_items':
      return importBudgetItemSchema;
    case 'vendors':
      return importVendorSchema;
  }
}

// ============================================
// Auto-detect Column Mapping
// ============================================

export function autoDetectMapping(
  csvHeaders: string[],
  type: ImportType
): Record<string, string> {
  const fields = getFieldsForType(type);
  const mapping: Record<string, string> = {};

  for (const field of fields) {
    // Normalize field aliases for comparison
    const normalizedAliases = field.aliases.map(a => a.toLowerCase().replace(/[_\s-]/g, ''));

    for (const header of csvHeaders) {
      const normalizedHeader = header.toLowerCase().replace(/[_\s-]/g, '');

      if (normalizedAliases.includes(normalizedHeader)) {
        mapping[field.key] = header;
        break;
      }
    }
  }

  return mapping;
}
