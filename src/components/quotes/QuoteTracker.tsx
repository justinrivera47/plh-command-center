import { useState } from 'react';
import { useQuotesByTrade, useUpdateQuoteWithLog } from '../../hooks/useQuotes';
import { useActiveProjects } from '../../hooks/useProjects';
import { EmptyState } from '../shared/EmptyState';
import { SkeletonList } from '../shared/SkeletonCard';
import { useUIStore } from '../../stores/uiStore';
import { useAuth } from '../../hooks/useAuth';
import { QUOTE_STATUS_CONFIG } from '../../lib/constants';
import { QuoteDetailDrawer } from './QuoteDetailDrawer';
import type { QuoteComparison, QuoteStatus } from '../../lib/types';

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

export function QuoteTracker() {
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const { data: projects } = useActiveProjects();
  const { data: groupedQuotes, isLoading, error } = useQuotesByTrade(projectFilter || undefined);
  const openQuickEntry = useUIStore((state) => state.openQuickEntry);
  const openQuoteDrawer = useUIStore((state) => state.openQuoteDrawer);

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const hasQuotes = groupedQuotes && Object.keys(groupedQuotes).length > 0;

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Quotes</h1>
      </div>

      {/* Project filter */}
      <div className="mb-6">
        <select
          value={projectFilter || ''}
          onChange={(e) => setProjectFilter(e.target.value || null)}
          className="w-full md:w-64 px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Projects</option>
          {projects?.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
          Failed to load quotes. Please try again.
        </div>
      )}

      {/* Loading state */}
      {isLoading && <SkeletonList count={4} />}

      {/* Empty state */}
      {!isLoading && !hasQuotes && (
        <EmptyState
          icon="💰"
          title="No quotes yet"
          description="Log your first quote to start comparing vendors."
          actionLabel="Log Quote"
          onAction={() => openQuickEntry('quote')}
        />
      )}

      {/* Quotes grouped by trade */}
      {!isLoading && hasQuotes && (
        <div className="space-y-6">
          {Object.entries(groupedQuotes).map(([tradeName, quotes]) => (
            <div key={tradeName} className="bg-white rounded-lg border border-border overflow-hidden">
              {/* Trade header */}
              <div className="bg-gray-50 px-4 py-3 border-b border-border">
                <h3 className="font-medium text-text-primary">{tradeName}</h3>
                <p className="text-sm text-text-secondary">
                  {quotes.length} quote{quotes.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Quote rows */}
              <div className="divide-y divide-border">
                {quotes.map((quote) => (
                  <QuoteRow
                    key={quote.id}
                    quote={quote}
                    formatCurrency={formatCurrency}
                    onRowClick={() => openQuoteDrawer(quote.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quote Detail Drawer */}
      <QuoteDetailDrawer />
    </div>
  );
}

interface QuoteRowProps {
  quote: QuoteComparison;
  formatCurrency: (amount: number | null) => string;
  onRowClick: () => void;
}

function QuoteRow({ quote, formatCurrency, onRowClick }: QuoteRowProps) {
  const { user } = useAuth();
  const updateQuote = useUpdateQuoteWithLog();

  const handleStatusCycle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    const currentIndex = QUOTE_STATUS_ORDER.indexOf(quote.status);
    const nextIndex = (currentIndex + 1) % QUOTE_STATUS_ORDER.length;
    const nextStatus = QUOTE_STATUS_ORDER[nextIndex];

    updateQuote.mutate({
      id: quote.id,
      userId: user.id,
      updates: { status: nextStatus },
    });
  };

  return (
    <div
      className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
      onClick={onRowClick}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Vendor info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-text-primary truncate">
            {quote.vendor_name || 'Unknown Vendor'}
          </div>
          <div className="text-sm text-text-secondary truncate">
            {quote.project_name}
          </div>
        </div>

        {/* Price */}
        <div className="text-right">
          <div className="font-semibold text-text-primary">
            {formatCurrency(quote.quoted_price)}
          </div>
          {quote.budget_variance_percent !== null && (
            <div
              className={`text-sm ${
                quote.budget_variance_percent > 0 ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {quote.budget_variance_percent > 0 ? '+' : ''}
              {quote.budget_variance_percent}%
            </div>
          )}
        </div>

        {/* Status - Tappable to cycle */}
        <button
          onClick={handleStatusCycle}
          className={`text-xs px-2 py-1 rounded whitespace-nowrap transition-colors hover:opacity-80 ${
            QUOTE_STATUS_CONFIG[quote.status]?.color || 'text-gray-600 bg-gray-100'
          }`}
          title="Tap to change status"
        >
          {QUOTE_STATUS_CONFIG[quote.status]?.label || quote.status}
        </button>
      </div>
    </div>
  );
}
