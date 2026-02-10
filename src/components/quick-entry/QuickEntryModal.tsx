import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Dialog from '@radix-ui/react-dialog';
import { useUIStore } from '../../stores/uiStore';
import { useActiveProjects } from '../../hooks/useProjects';
import { useOpenRFIs, useCreateRFI, useUpdateRFIStatus } from '../../hooks/useRFIs';
import { useCreateQuote } from '../../hooks/useQuotes';
import { useVendors, useTradeCategories, useCreateVendor } from '../../hooks/useVendors';
import { useAuth } from '../../hooks/useAuth';
import {
  logQuoteSchema,
  statusUpdateSchema,
  newRFISchema,
  callLogSchema,
  newVendorSchema,
  type LogQuoteFormData,
  type StatusUpdateFormData,
  type NewRFIFormData,
  type CallLogFormData,
  type NewVendorFormData,
} from '../../lib/schemas';
import { RFI_STATUS_CONFIG, PRIORITY_CONFIG, POC_TYPE_CONFIG } from '../../lib/constants';
import type { RFIStatus, Priority, POCType } from '../../lib/types';

const ENTRY_TYPES = [
  { type: 'quote', icon: '💰', label: 'Got a quote back' },
  { type: 'status', icon: '🔄', label: 'Status update' },
  { type: 'rfi', icon: '📋', label: 'New task / RFI' },
  { type: 'call', icon: '📞', label: 'Just had a call' },
  { type: 'vendor', icon: '📇', label: 'New vendor' },
] as const;

export function QuickEntryModal() {
  const { quickEntryOpen, quickEntryType, openQuickEntry, closeQuickEntry } = useUIStore();

  return (
    <Dialog.Root open={quickEntryOpen} onOpenChange={(open) => !open && closeQuickEntry()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed z-50 bg-white rounded-t-2xl md:rounded-lg shadow-xl max-h-[85vh] overflow-y-auto bottom-0 left-0 right-0 md:bottom-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-lg md:w-full">
          {/* Handle for mobile */}
          <div className="md:hidden flex justify-center py-2">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          <div className="p-4 md:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold text-text-primary">
                {quickEntryType ? getEntryTypeLabel(quickEntryType) : 'Log it'}
              </Dialog.Title>
              <Dialog.Close className="p-1 hover:bg-gray-100 rounded text-text-secondary">
                ✕
              </Dialog.Close>
            </div>

            {/* Entry type selector (when no type selected) */}
            {!quickEntryType && (
              <div className="grid grid-cols-1 gap-2">
                {ENTRY_TYPES.map((entry) => (
                  <button
                    key={entry.type}
                    onClick={() => openQuickEntry(entry.type)}
                    className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary-300 hover:bg-primary-50 transition-colors text-left"
                  >
                    <span className="text-2xl">{entry.icon}</span>
                    <span className="font-medium text-text-primary">{entry.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Form content based on type */}
            {quickEntryType === 'rfi' && <NewRFIForm />}
            {quickEntryType === 'status' && <StatusUpdateForm />}
            {quickEntryType === 'quote' && <LogQuoteForm />}
            {quickEntryType === 'call' && <CallLogForm />}
            {quickEntryType === 'vendor' && <NewVendorForm />}

            {/* Back button when form is shown */}
            {quickEntryType && (
              <button
                onClick={() => openQuickEntry(null)}
                className="mt-4 text-sm text-text-secondary hover:text-text-primary"
              >
                ← Back to options
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function getEntryTypeLabel(type: string): string {
  const entry = ENTRY_TYPES.find((e) => e.type === type);
  return entry?.label ?? 'Log it';
}

// ============================================
// Log Quote Form
// ============================================

function LogQuoteForm() {
  const { user } = useAuth();
  const { data: projects } = useActiveProjects();
  const { data: trades } = useTradeCategories();
  const { data: vendors } = useVendors();
  const createQuote = useCreateQuote();
  const closeQuickEntry = useUIStore((state) => state.closeQuickEntry);
  const selectedProjectId = useUIStore((state) => state.selectedProjectId);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<LogQuoteFormData>({
    resolver: zodResolver(logQuoteSchema),
    defaultValues: {
      project_id: selectedProjectId || '',
    },
  });

  const vendorId = watch('vendor_id');

  const onSubmit = async (data: LogQuoteFormData) => {
    if (!user) return;

    await createQuote.mutateAsync({
      user_id: user.id,
      project_id: data.project_id,
      trade_category_id: data.trade_category_id,
      vendor_id: data.vendor_id || null,
      quoted_price: data.quoted_price,
      notes: data.notes || null,
      status: 'quoted',
      quote_received_date: new Date().toISOString().split('T')[0],
      // Defaults
      plan_provided_date: null,
      scope_provided_date: null,
      due_date: null,
      budget_amount: null,
      decision_approved_by: null,
      builder_confirmation_sent: false,
      contract_signed: false,
      scope_notes: null,
      availability: null,
    });

    closeQuickEntry();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Project */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Project *
        </label>
        <select
          {...register('project_id')}
          className="w-full px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Select project</option>
          {projects?.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {errors.project_id && (
          <p className="text-xs text-red-600 mt-1">{errors.project_id.message}</p>
        )}
      </div>

      {/* Trade */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Trade *
        </label>
        <select
          {...register('trade_category_id')}
          className="w-full px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Select trade</option>
          {trades?.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        {errors.trade_category_id && (
          <p className="text-xs text-red-600 mt-1">{errors.trade_category_id.message}</p>
        )}
      </div>

      {/* Vendor */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Vendor
        </label>
        <select
          {...register('vendor_id')}
          className="w-full px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Select vendor (or add new below)</option>
          {vendors?.map((v) => (
            <option key={v.id} value={v.id}>{v.company_name}</option>
          ))}
        </select>
      </div>

      {/* New vendor name (if no vendor selected) */}
      {!vendorId && (
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Or enter new vendor name
          </label>
          <input
            type="text"
            {...register('new_vendor_name')}
            placeholder="Vendor company name"
            className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      )}

      {/* Quoted Price */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Quoted Price *
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
          <input
            type="number"
            step="0.01"
            {...register('quoted_price', { valueAsNumber: true })}
            placeholder="0.00"
            className="w-full pl-7 pr-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        {errors.quoted_price && (
          <p className="text-xs text-red-600 mt-1">{errors.quoted_price.message}</p>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Notes
        </label>
        <textarea
          {...register('notes')}
          rows={2}
          placeholder="Any details about the quote..."
          className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 px-4 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? 'Saving...' : 'Log Quote'}
      </button>
    </form>
  );
}

// ============================================
// Status Update Form
// ============================================

function StatusUpdateForm() {
  const { data: projects } = useActiveProjects();
  const updateRFIStatus = useUpdateRFIStatus();
  const closeQuickEntry = useUIStore((state) => state.closeQuickEntry);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<StatusUpdateFormData>({
    resolver: zodResolver(statusUpdateSchema),
  });

  const projectId = watch('project_id');
  const { data: rfis } = useOpenRFIs(projectId || undefined);

  const onSubmit = async (data: StatusUpdateFormData) => {
    await updateRFIStatus.mutateAsync({
      rfi_id: data.rfi_id,
      new_status: data.new_status,
      note: data.note,
      next_action_date: data.next_action_date,
    });

    closeQuickEntry();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Project */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Project *
        </label>
        <select
          {...register('project_id')}
          className="w-full px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Select project</option>
          {projects?.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {errors.project_id && (
          <p className="text-xs text-red-600 mt-1">{errors.project_id.message}</p>
        )}
      </div>

      {/* Task */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Task *
        </label>
        <select
          {...register('rfi_id')}
          disabled={!projectId}
          className="w-full px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
        >
          <option value="">{projectId ? 'Select task' : 'Select project first'}</option>
          {rfis?.map((rfi) => (
            <option key={rfi.id} value={rfi.id}>{rfi.task}</option>
          ))}
        </select>
        {errors.rfi_id && (
          <p className="text-xs text-red-600 mt-1">{errors.rfi_id.message}</p>
        )}
      </div>

      {/* New Status */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          New Status *
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(RFI_STATUS_CONFIG) as RFIStatus[]).map((status) => (
            <label
              key={status}
              className="flex items-center gap-2 p-2 border border-border rounded-md cursor-pointer hover:border-primary-300 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50"
            >
              <input
                type="radio"
                {...register('new_status')}
                value={status}
                className="sr-only"
              />
              <span>{RFI_STATUS_CONFIG[status].icon}</span>
              <span className="text-sm">{RFI_STATUS_CONFIG[status].label}</span>
            </label>
          ))}
        </div>
        {errors.new_status && (
          <p className="text-xs text-red-600 mt-1">{errors.new_status.message}</p>
        )}
      </div>

      {/* Note */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          What happened?
        </label>
        <textarea
          {...register('note')}
          rows={2}
          placeholder="Quick update on this task..."
          className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />
      </div>

      {/* Next Action Date */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Next Action Date
        </label>
        <input
          type="date"
          {...register('next_action_date')}
          className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 px-4 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? 'Updating...' : 'Update Status'}
      </button>
    </form>
  );
}

// ============================================
// New RFI Form
// ============================================

function NewRFIForm() {
  const { user } = useAuth();
  const { data: projects } = useActiveProjects();
  const createRFI = useCreateRFI();
  const closeQuickEntry = useUIStore((state) => state.closeQuickEntry);
  const selectedProjectId = useUIStore((state) => state.selectedProjectId);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<NewRFIFormData>({
    resolver: zodResolver(newRFISchema),
    defaultValues: {
      project_id: selectedProjectId || '',
      priority: 'P3',
      is_blocking: false,
    },
  });

  const isBlocking = watch('is_blocking');

  const onSubmit = async (data: NewRFIFormData) => {
    if (!user) return;

    await createRFI.mutateAsync({
      user_id: user.id,
      project_id: data.project_id,
      task: data.task,
      scope: data.scope || null,
      poc_name: data.poc_name || null,
      poc_type: data.poc_type || null,
      status: 'open',
      priority: data.priority,
      is_blocking: data.is_blocking,
      blocks_description: data.is_blocking ? data.blocks_description || null : null,
      is_complete: false,
      follow_up_days: 3,
      // Defaults
      start_date: null,
      end_date: null,
      next_action_date: null,
      last_contacted_at: null,
      latest_update: null,
      blocked_by_rfi_id: null,
      stall_reason: null,
      stall_note: null,
      milestone: null,
      deliverable: null,
      notes: null,
    });

    closeQuickEntry();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Project */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Project *
        </label>
        <select
          {...register('project_id')}
          className="w-full px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Select project</option>
          {projects?.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {errors.project_id && (
          <p className="text-xs text-red-600 mt-1">{errors.project_id.message}</p>
        )}
      </div>

      {/* Task Name */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Task / RFI *
        </label>
        <input
          type="text"
          {...register('task')}
          placeholder="What needs to be done?"
          className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        {errors.task && (
          <p className="text-xs text-red-600 mt-1">{errors.task.message}</p>
        )}
      </div>

      {/* Scope */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Scope / Details
        </label>
        <textarea
          {...register('scope')}
          rows={2}
          placeholder="Additional details..."
          className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />
      </div>

      {/* Priority */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Priority
        </label>
        <div className="flex gap-2">
          {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((priority) => (
            <label
              key={priority}
              className="flex-1 text-center p-2 border border-border rounded-md cursor-pointer hover:border-primary-300 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50"
            >
              <input
                type="radio"
                {...register('priority')}
                value={priority}
                className="sr-only"
              />
              <span className={`text-sm font-medium ${PRIORITY_CONFIG[priority].bgColor} ${PRIORITY_CONFIG[priority].color} px-2 py-0.5 rounded`}>
                {priority}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* POC Type */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Who's involved?
        </label>
        <select
          {...register('poc_type')}
          className="w-full px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Select type</option>
          {(Object.keys(POC_TYPE_CONFIG) as POCType[]).map((type) => (
            <option key={type} value={type}>
              {POC_TYPE_CONFIG[type].icon} {POC_TYPE_CONFIG[type].label}
            </option>
          ))}
        </select>
      </div>

      {/* POC Name */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Contact Name
        </label>
        <input
          type="text"
          {...register('poc_name')}
          placeholder="Who do you need to reach?"
          className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Is Blocking */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...register('is_blocking')}
            className="w-4 h-4 text-primary-600 border-border rounded focus:ring-primary-500"
          />
          <span className="text-sm text-text-primary">This task is blocking other work</span>
        </label>
      </div>

      {/* Blocks Description */}
      {isBlocking && (
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            What is this blocking?
          </label>
          <input
            type="text"
            {...register('blocks_description')}
            placeholder="e.g., Can't schedule install until this is resolved"
            className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 px-4 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? 'Creating...' : 'Add Task'}
      </button>
    </form>
  );
}

// ============================================
// Call Log Form
// ============================================

function CallLogForm() {
  const { user } = useAuth();
  const { data: projects } = useActiveProjects();
  const createRFI = useCreateRFI();
  const closeQuickEntry = useUIStore((state) => state.closeQuickEntry);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<CallLogFormData>({
    resolver: zodResolver(callLogSchema),
  });

  const nextStep = watch('next_step');

  const onSubmit = async (data: CallLogFormData) => {
    if (!user) return;

    // Create an RFI to track the follow-up if needed
    if (data.next_step !== 'done') {
      await createRFI.mutateAsync({
        user_id: user.id,
        project_id: data.project_id || null as any,
        task: `Follow up with ${data.contact_name}`,
        scope: data.note,
        poc_name: data.contact_name,
        poc_type: 'vendor',
        status: data.next_step === 'waiting_on_them' ? 'waiting_on_vendor' : 'waiting_on_me',
        priority: 'P3',
        is_blocking: false,
        blocks_description: null,
        is_complete: false,
        follow_up_days: 3,
        last_contacted_at: new Date().toISOString(),
        latest_update: data.note,
        next_action_date: data.follow_up_date || null,
        // Defaults
        start_date: null,
        end_date: null,
        blocked_by_rfi_id: null,
        stall_reason: null,
        stall_note: null,
        milestone: null,
        deliverable: null,
        notes: null,
      });
    }

    closeQuickEntry();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Contact Name */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Who did you talk to? *
        </label>
        <input
          type="text"
          {...register('contact_name')}
          placeholder="Name or company"
          className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        {errors.contact_name && (
          <p className="text-xs text-red-600 mt-1">{errors.contact_name.message}</p>
        )}
      </div>

      {/* Project (optional) */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Related Project
        </label>
        <select
          {...register('project_id')}
          className="w-full px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">No specific project</option>
          {projects?.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Note */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          What happened? *
        </label>
        <textarea
          {...register('note')}
          rows={3}
          placeholder="Key points from the call..."
          className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />
        {errors.note && (
          <p className="text-xs text-red-600 mt-1">{errors.note.message}</p>
        )}
      </div>

      {/* Next Step */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          What's next? *
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 p-3 border border-border rounded-md cursor-pointer hover:border-primary-300 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50">
            <input
              type="radio"
              {...register('next_step')}
              value="waiting_on_them"
              className="sr-only"
            />
            <span className="text-lg">⏳</span>
            <span className="text-sm">Waiting on them</span>
          </label>
          <label className="flex items-center gap-2 p-3 border border-border rounded-md cursor-pointer hover:border-primary-300 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50">
            <input
              type="radio"
              {...register('next_step')}
              value="i_need_to_do"
              className="sr-only"
            />
            <span className="text-lg">⚡</span>
            <span className="text-sm">I need to do something</span>
          </label>
          <label className="flex items-center gap-2 p-3 border border-border rounded-md cursor-pointer hover:border-primary-300 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50">
            <input
              type="radio"
              {...register('next_step')}
              value="follow_up_by"
              className="sr-only"
            />
            <span className="text-lg">📅</span>
            <span className="text-sm">Follow up by date</span>
          </label>
          <label className="flex items-center gap-2 p-3 border border-border rounded-md cursor-pointer hover:border-primary-300 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50">
            <input
              type="radio"
              {...register('next_step')}
              value="done"
              className="sr-only"
            />
            <span className="text-lg">✓</span>
            <span className="text-sm">All done</span>
          </label>
        </div>
        {errors.next_step && (
          <p className="text-xs text-red-600 mt-1">{errors.next_step.message}</p>
        )}
      </div>

      {/* Follow-up Date */}
      {nextStep === 'follow_up_by' && (
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Follow up by
          </label>
          <input
            type="date"
            {...register('follow_up_date')}
            className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 px-4 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? 'Logging...' : 'Log Call'}
      </button>
    </form>
  );
}

// ============================================
// New Vendor Form
// ============================================

function NewVendorForm() {
  const { user } = useAuth();
  const { data: trades } = useTradeCategories();
  const createVendor = useCreateVendor();
  const closeQuickEntry = useUIStore((state) => state.closeQuickEntry);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<NewVendorFormData>({
    resolver: zodResolver(newVendorSchema),
    defaultValues: {
      trade_ids: [],
    },
  });

  const selectedTrades = watch('trade_ids') || [];

  const toggleTrade = (tradeId: string) => {
    const current = selectedTrades;
    if (current.includes(tradeId)) {
      setValue('trade_ids', current.filter((id) => id !== tradeId));
    } else {
      setValue('trade_ids', [...current, tradeId]);
    }
  };

  const onSubmit = async (data: NewVendorFormData) => {
    if (!user) return;

    await createVendor.mutateAsync({
      vendor: {
        user_id: user.id,
        company_name: data.company_name,
        poc_name: data.poc_name || null,
        phone: data.phone || null,
        email: data.email || null,
        website: null,
        license_number: null,
        quality_rating: 'unknown',
        communication_rating: 'unknown',
        status: 'active',
        notes: null,
      },
      tradeIds: data.trade_ids,
    });

    closeQuickEntry();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Company Name */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Company Name *
        </label>
        <input
          type="text"
          {...register('company_name')}
          placeholder="Company or vendor name"
          className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        {errors.company_name && (
          <p className="text-xs text-red-600 mt-1">{errors.company_name.message}</p>
        )}
      </div>

      {/* POC Name */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Contact Person
        </label>
        <input
          type="text"
          {...register('poc_name')}
          placeholder="Main point of contact"
          className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Phone
        </label>
        <input
          type="tel"
          {...register('phone')}
          placeholder="(555) 123-4567"
          className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Email
        </label>
        <input
          type="email"
          {...register('email')}
          placeholder="contact@company.com"
          className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        {errors.email && (
          <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
        )}
      </div>

      {/* Trades */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Trades *
        </label>
        <div className="max-h-40 overflow-y-auto border border-border rounded-md p-2 space-y-1">
          {trades?.map((trade) => (
            <label
              key={trade.id}
              className="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={selectedTrades.includes(trade.id)}
                onChange={() => toggleTrade(trade.id)}
                className="w-4 h-4 text-primary-600 border-border rounded focus:ring-primary-500"
              />
              <span className="text-sm">{trade.name}</span>
            </label>
          ))}
        </div>
        {errors.trade_ids && (
          <p className="text-xs text-red-600 mt-1">{errors.trade_ids.message}</p>
        )}
        {selectedTrades.length > 0 && (
          <p className="text-xs text-text-secondary mt-1">
            {selectedTrades.length} trade{selectedTrades.length !== 1 ? 's' : ''} selected
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 px-4 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? 'Adding...' : 'Add Vendor'}
      </button>
    </form>
  );
}
