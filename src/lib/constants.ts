import type { RFIStatus, Priority, POCType, QuoteStatus, Rating, StallReason } from './types';

// ============================================
// Status Configurations
// ============================================

export const RFI_STATUS_CONFIG: Record<RFIStatus, { label: string; icon: string; color: string }> = {
  open: { label: 'Open', icon: '📋', color: 'text-gray-600 bg-gray-100' },
  waiting_on_client: { label: 'Client', icon: '👤', color: 'text-blue-600 bg-blue-100' },
  waiting_on_vendor: { label: 'Vendor', icon: '📦', color: 'text-purple-600 bg-purple-100' },
  waiting_on_contractor: { label: 'Contractor', icon: '🔨', color: 'text-orange-600 bg-orange-100' },
  waiting_on_design_team: { label: 'Design Team', icon: '🎨', color: 'text-pink-600 bg-pink-100' },
  waiting_on_plh: { label: 'PLH', icon: '🏢', color: 'text-teal-600 bg-teal-100' },
  waiting_on_me: { label: 'On Me', icon: '⚡', color: 'text-amber-600 bg-amber-100' },
  follow_up: { label: 'Follow Up', icon: '🔥', color: 'text-red-600 bg-red-100' },
  completed: { label: 'Done', icon: '✓', color: 'text-green-600 bg-green-100' },
  dead: { label: 'Dead', icon: '✕', color: 'text-gray-400 bg-gray-50' },
};

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bgColor: string }> = {
  P1: { label: 'P1', color: 'text-white', bgColor: 'bg-red-500' },
  P2: { label: 'P2', color: 'text-white', bgColor: 'bg-amber-500' },
  P3: { label: 'P3', color: 'text-white', bgColor: 'bg-gray-400' },
};

export const POC_TYPE_CONFIG: Record<POCType, { label: string; icon: string }> = {
  client: { label: 'Client', icon: '👤' },
  vendor: { label: 'Vendor', icon: '📦' },
  contractor: { label: 'Contractor', icon: '🔨' },
  internal: { label: 'Internal', icon: '🏠' },
  design_team: { label: 'Design Team', icon: '🎨' },
  plh: { label: 'PLH', icon: '🏢' },
};

// ============================================
// POC Type <-> Status Linking
// ============================================

// Map POC type to corresponding "waiting on" status
export const POC_TYPE_TO_STATUS: Record<POCType, RFIStatus> = {
  client: 'waiting_on_client',
  vendor: 'waiting_on_vendor',
  contractor: 'waiting_on_contractor',
  design_team: 'waiting_on_design_team',
  plh: 'waiting_on_plh',
  internal: 'waiting_on_me',
};

// Map "waiting on" status back to POC type
export const STATUS_TO_POC_TYPE: Partial<Record<RFIStatus, POCType>> = {
  waiting_on_client: 'client',
  waiting_on_vendor: 'vendor',
  waiting_on_contractor: 'contractor',
  waiting_on_design_team: 'design_team',
  waiting_on_plh: 'plh',
  waiting_on_me: 'internal',
};

// Statuses that represent "assigned to someone"
export const ASSIGNED_STATUSES: RFIStatus[] = [
  'waiting_on_client',
  'waiting_on_vendor',
  'waiting_on_contractor',
  'waiting_on_design_team',
  'waiting_on_plh',
  'waiting_on_me',
];

// Helper: Get status from POC type (defaults to 'open' if no POC)
export function getStatusFromPOCType(pocType: POCType | null | undefined): RFIStatus {
  if (!pocType) return 'open';
  return POC_TYPE_TO_STATUS[pocType] || 'open';
}

// Helper: Get POC type from status (returns null for non-assignment statuses)
export function getPOCTypeFromStatus(status: RFIStatus): POCType | null {
  return STATUS_TO_POC_TYPE[status] || null;
}

// Helper: Check if status is an "assigned" status
export function isAssignedStatus(status: RFIStatus): boolean {
  return ASSIGNED_STATUSES.includes(status);
}

export const QUOTE_STATUS_CONFIG: Record<QuoteStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'text-gray-600 bg-gray-100' },
  quoted: { label: 'Quoted', color: 'text-blue-600 bg-blue-100' },
  approved: { label: 'Approved', color: 'text-green-600 bg-green-100' },
  declined: { label: 'Declined', color: 'text-red-600 bg-red-100' },
  contract_sent: { label: 'Contract Sent', color: 'text-purple-600 bg-purple-100' },
  signed: { label: 'Signed', color: 'text-green-700 bg-green-200' },
  in_progress: { label: 'In Progress', color: 'text-amber-600 bg-amber-100' },
  completed: { label: 'Completed', color: 'text-green-800 bg-green-300' },
};

export const RATING_CONFIG: Record<Rating, { label: string; color: string }> = {
  great: { label: 'Great', color: 'text-green-600' },
  good: { label: 'Good', color: 'text-blue-600' },
  fair: { label: 'Fair', color: 'text-amber-600' },
  poor: { label: 'Poor', color: 'text-red-600' },
  unknown: { label: 'Unknown', color: 'text-gray-400' },
};

// ============================================
// Stall Reason Prompts
// ============================================

export const STALL_PROMPTS: Record<StallReason, { title: string; message: string; action: string }> = {
  avoiding_contact: {
    title: 'Reframe this',
    message: "You noted you don't want to waste their time. Consider: they need you to have this info to keep the project moving. Requesting this IS the job — not an interruption.",
    action: 'Draft the message →',
  },
  unclear_next_step: {
    title: 'Break it down',
    message: "What's the ONE thing you need to move this forward? Who has it? Ask for just that one thing.",
    action: 'Draft the message →',
  },
  missing_info: {
    title: 'Blocked upstream',
    message: "This task is waiting on another task — that's where the real action is.",
    action: 'Go to blocking task →',
  },
  deprioritized: {
    title: 'Intentionally paused',
    message: 'You deprioritized this. Is it still the right call?',
    action: 'Review priority →',
  },
};

// ============================================
// Default Values
// ============================================

export const DEFAULT_FOLLOW_UP_DAYS = {
  client: 3,
  vendor: 5,
  contractor: 3,
};

export const DEFAULT_PRIORITY: Priority = 'P3';

// ============================================
// Days Since Contact Thresholds
// ============================================

export const DAYS_SINCE_CONTACT_THRESHOLDS = {
  good: 3, // Green: 0-3 days
  warning: 7, // Amber: 4-7 days
  // Beyond 7 = Red
};

// ============================================
// Trade Categories (31 standard construction trades)
// ============================================

export const TRADE_CATEGORIES = [
  'Acoustical Ceilings',
  'Appliances',
  'Cabinets & Millwork',
  'Concrete',
  'Countertops',
  'Demolition',
  'Doors & Hardware',
  'Drywall',
  'Electrical',
  'Elevators',
  'Excavation & Grading',
  'Fencing',
  'Fire Protection',
  'Flooring',
  'Framing',
  'Glass & Glazing',
  'HVAC',
  'Insulation',
  'Landscaping',
  'Masonry',
  'Painting',
  'Plumbing',
  'Roofing',
  'Security Systems',
  'Siding',
  'Solar',
  'Stucco',
  'Tile',
  'Waterproofing',
  'Windows',
  'Other',
] as const;

// ============================================
// User Roles
// ============================================

export const USER_ROLES = [
  { value: 'project_coordinator', label: 'Project Coordinator / Manager' },
  { value: 'builder_gc', label: 'Builder / GC' },
  { value: 'designer_architect', label: 'Designer / Architect' },
  { value: 'other', label: 'Other' },
] as const;

// ============================================
// Project Volume Options
// ============================================

export const PROJECT_VOLUME_OPTIONS = [
  { value: '1-3', label: '1-3 projects' },
  { value: '4-7', label: '4-7 projects' },
  { value: '8-12', label: '8-12 projects' },
  { value: '12+', label: '12+ projects' },
] as const;
