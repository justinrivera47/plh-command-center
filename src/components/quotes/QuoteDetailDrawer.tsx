import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { useQuote, useUpdateQuoteWithLog, useQuoteHistory } from '../../hooks/useQuotes';
import { useVendor } from '../../hooks/useVendors';
import { useUIStore } from '../../stores/uiStore';
import { useAuth } from '../../hooks/useAuth';
import { QUOTE_STATUS_CONFIG, RATING_CONFIG } from '../../lib/constants';
import type { QuoteStatus, ChangeLog } from '../../lib/types';

const QUOTE_STATUS_ORDER: QuoteStatus[] = [
  'pending',
  'quoted',
  'approved',
  'declined',
  'contract_sent',
  'signed',
  'in_progress',
  'completed',
];

interface QuoteFormData {
  quoted_price: string;
  budget_amount: string;
  status: QuoteStatus;
  plan_provided_date: string;
  scope_provided_date: string;
  quote_received_date: string;
  due_date: string;
  decision_approved_by: string;
  builder_confirmation_sent: boolean;
  contract_signed: boolean;
  scope_notes: string;
  availability: string;
  notes: string;
}

export function QuoteDetailDrawer() {
  const { quoteDrawerOpen, quoteDrawerId, closeQuoteDrawer, openMessageComposer } = useUIStore();
  const { user } = useAuth();
  const { data: quote, isLoading: quoteLoading } = useQuote(quoteDrawerId || undefined);
  const { data: vendor } = useVendor(quote?.vendor_id || undefined);
  const { data: history } = useQuoteHistory(quoteDrawerId || undefined);
  const updateQuote = useUpdateQuoteWithLog();

  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
  } = useForm<QuoteFormData>({
    defaultValues: {
      quoted_price: '',
      budget_amount: '',
      status: 'pending',
      plan_provided_date: '',
      scope_provided_date: '',
      quote_received_date: '',
      due_date: '',
      decision_approved_by: '',
      builder_confirmation_sent: false,
      contract_signed: false,
      scope_notes: '',
      availability: '',
      notes: '',
    },
  });

  // Reset form when quote loads
  useEffect(() => {
    if (quote) {
      reset({
        quoted_price: quote.quoted_price?.toString() || '',
        budget_amount: quote.budget_amount?.toString() || '',
        status: quote.status,
        plan_provided_date: quote.plan_provided_date || '',
        scope_provided_date: quote.scope_provided_date || '',
        quote_received_date: quote.quote_received_date || '',
        due_date: quote.due_date || '',
        decision_approved_by: quote.decision_approved_by || '',
        builder_confirmation_sent: quote.builder_confirmation_sent,
        contract_signed: quote.contract_signed,
        scope_notes: quote.scope_notes || '',
        availability: quote.availability || '',
        notes: quote.notes || '',
      });
    }
  }, [quote, reset]);

  const quotedPrice = watch('quoted_price');
  const budgetAmount = watch('budget_amount');

  // Calculate variance
  const variance = (() => {
    const price = parseFloat(quotedPrice) || 0;
    const budget = parseFloat(budgetAmount) || 0;
    if (!budget) return null;
    return price - budget;
  })();

  const variancePercent = (() => {
    const budget = parseFloat(budgetAmount) || 0;
    if (!budget || variance === null) return null;
    return ((variance / budget) * 100).toFixed(1);
  })();

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatHistoryDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return formatDate(dateStr);
    }
  };

  const onSubmit = async (data: QuoteFormData) => {
    if (!quoteDrawerId || !user) return;
    setSaving(true);
    try {
      await updateQuote.mutateAsync({
        id: quoteDrawerId,
        userId: user.id,
        updates: {
          quoted_price: data.quoted_price ? parseFloat(data.quoted_price) : null,
          budget_amount: data.budget_amount ? parseFloat(data.budget_amount) : null,
          status: data.status,
          plan_provided_date: data.plan_provided_date || null,
          scope_provided_date: data.scope_provided_date || null,
          quote_received_date: data.quote_received_date || null,
          due_date: data.due_date || null,
          decision_approved_by: data.decision_approved_by || null,
          builder_confirmation_sent: data.builder_confirmation_sent,
          contract_signed: data.contract_signed,
          scope_notes: data.scope_notes || null,
          availability: data.availability || null,
          notes: data.notes || null,
        },
      });
      closeQuoteDrawer();
    } catch (error) {
      console.error('Failed to update quote:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDraftMessage = () => {
    if (vendor) {
      openMessageComposer({
        pocName: vendor.poc_name || vendor.company_name,
        pocType: 'vendor',
        templateCategory: 'quote_follow_up',
      });
    }
  };

  return (
    <Dialog.Root open={quoteDrawerOpen} onOpenChange={(open) => !open && closeQuoteDrawer()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 overflow-y-auto focus:outline-none">
          {quoteLoading ? (
            <div className="p-6">
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" />
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            </div>
          ) : quote ? (
            <form onSubmit={handleSubmit(onSubmit)}>
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-border px-4 py-4 z-10">
                <div className="flex items-center justify-between">
                  <Dialog.Title className="text-lg font-semibold text-text-primary">
                    Quote Details
                  </Dialog.Title>
                  <Dialog.Close className="p-1 text-text-secondary hover:text-text-primary">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Dialog.Close>
                </div>
                {/* Quote context */}
                <div className="mt-2 text-sm text-text-secondary">
                  <span className="font-medium text-text-primary">{quote.vendor_name || 'Unknown Vendor'}</span>
                  {' • '}
                  <span>{quote.trade_name || 'Unknown Trade'}</span>
                </div>
                <div className="text-sm text-text-secondary">
                  {quote.project_name || 'Unknown Project'}
                </div>
              </div>

              <div className="p-4 space-y-6">
                {/* Price & Budget Section */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-text-primary mb-3">Pricing</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">Quoted Price</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
                        <input
                          type="number"
                          {...register('quoted_price')}
                          className="w-full pl-7 pr-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">Budget</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
                        <input
                          type="number"
                          {...register('budget_amount')}
                          className="w-full pl-7 pr-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                  {/* Variance display */}
                  {variance !== null && (
                    <div className={`mt-3 p-2 rounded text-sm ${
                      variance > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                    }`}>
                      <span className="font-medium">Variance: </span>
                      {formatCurrency(variance)} ({variance > 0 ? '+' : ''}{variancePercent}%)
                    </div>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Status</label>
                  <select
                    {...register('status')}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {QUOTE_STATUS_ORDER.map((status) => (
                      <option key={status} value={status}>
                        {QUOTE_STATUS_CONFIG[status].label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Timeline Dates */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-text-primary mb-3">Timeline</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">Plan Provided</label>
                      <input
                        type="date"
                        {...register('plan_provided_date')}
                        className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">Scope Provided</label>
                      <input
                        type="date"
                        {...register('scope_provided_date')}
                        className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">Quote Received</label>
                      <input
                        type="date"
                        {...register('quote_received_date')}
                        className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">Due Date</label>
                      <input
                        type="date"
                        {...register('due_date')}
                        className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Decision Tracking */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-text-primary mb-3">Decision Tracking</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">Approved By</label>
                      <input
                        type="text"
                        {...register('decision_approved_by')}
                        className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="e.g., John Smith (Client)"
                      />
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        {...register('builder_confirmation_sent')}
                        className="w-4 h-4 text-primary-600 border-border rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-text-primary">Builder Confirmation Sent</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        {...register('contract_signed')}
                        className="w-4 h-4 text-primary-600 border-border rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-text-primary">Contract Signed</span>
                    </label>
                  </div>
                </div>

                {/* Vendor Context */}
                {vendor && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-medium text-text-primary mb-3">Vendor Contact</h3>
                    <div className="space-y-2">
                      <div className="font-medium text-text-primary">{vendor.company_name}</div>
                      {vendor.poc_name && (
                        <div className="text-sm text-text-secondary">{vendor.poc_name}</div>
                      )}
                      {vendor.phone && (
                        <a
                          href={`tel:${vendor.phone}`}
                          className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
                        >
                          <span>📞</span>
                          <span>{vendor.phone}</span>
                        </a>
                      )}
                      {vendor.email && (
                        <a
                          href={`mailto:${vendor.email}`}
                          className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
                        >
                          <span>✉️</span>
                          <span>{vendor.email}</span>
                        </a>
                      )}
                      <div className="flex gap-4 mt-2 text-xs">
                        <div>
                          <span className="text-text-secondary">Quality: </span>
                          <span className={RATING_CONFIG[vendor.quality_rating]?.color || 'text-gray-400'}>
                            {RATING_CONFIG[vendor.quality_rating]?.label || 'Unknown'}
                          </span>
                        </div>
                        <div>
                          <span className="text-text-secondary">Comms: </span>
                          <span className={RATING_CONFIG[vendor.communication_rating]?.color || 'text-gray-400'}>
                            {RATING_CONFIG[vendor.communication_rating]?.label || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleDraftMessage}
                      className="mt-3 w-full py-2 px-4 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      Draft Message
                    </button>
                  </div>
                )}

                {/* Scope & Availability */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Scope Notes</label>
                  <textarea
                    {...register('scope_notes')}
                    rows={2}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    placeholder="Any notes about scope..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Availability</label>
                  <input
                    type="text"
                    {...register('availability')}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., Can start March 15th"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    placeholder="Any additional notes..."
                  />
                </div>

                {/* Change History */}
                {history && history.length > 0 && (
                  <div className="border-t border-border pt-4">
                    <h3 className="font-medium text-text-primary mb-3">Change History</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {history.map((entry: ChangeLog) => (
                        <div key={entry.id} className="text-xs bg-gray-50 rounded p-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-text-primary capitalize">
                              {entry.field_name.replace(/_/g, ' ')}
                            </span>
                            <span className="text-text-secondary">
                              {formatHistoryDate(entry.created_at)}
                            </span>
                          </div>
                          <div className="text-text-secondary">
                            <span className="line-through">{entry.old_value || '(empty)'}</span>
                            {' → '}
                            <span className="text-text-primary">{entry.new_value || '(empty)'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer with save button */}
              <div className="sticky bottom-0 bg-white border-t border-border px-4 py-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 px-4 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="p-6 text-center text-text-secondary">
              Quote not found
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
