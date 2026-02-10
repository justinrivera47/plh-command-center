import { useState } from 'react';
import { useVendorsWithTrades, useTradeCategories } from '../../hooks/useVendors';
import { VendorCard } from './VendorCard';
import { EmptyState } from '../shared/EmptyState';
import { SkeletonCard } from '../shared/SkeletonCard';
import { useUIStore } from '../../stores/uiStore';

export function VendorList() {
  const { data: vendors, isLoading, error } = useVendorsWithTrades();
  const { data: trades } = useTradeCategories();
  const [searchTerm, setSearchTerm] = useState('');
  const [tradeFilter, setTradeFilter] = useState<string | null>(null);
  const openQuickEntry = useUIStore((state) => state.openQuickEntry);

  // Get selected trade name for filtering
  const selectedTradeName = tradeFilter
    ? trades?.find((t) => t.id === tradeFilter)?.name
    : null;

  // Filter vendors by search term and trade
  const filteredVendors = vendors?.filter((vendor) => {
    const matchesSearch =
      !searchTerm ||
      vendor.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.poc_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTrade =
      !selectedTradeName ||
      vendor.trades.includes(selectedTradeName);

    return matchesSearch && matchesTrade;
  });

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Vendors</h1>
        <button
          onClick={() => openQuickEntry('vendor')}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          + Add Vendor
        </button>
      </div>

      {/* Search and filter */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Trade filter */}
        <div className="md:w-48">
          <select
            value={tradeFilter || ''}
            onChange={(e) => setTradeFilter(e.target.value || null)}
            className="w-full px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Trades</option>
            {trades?.map((trade) => (
              <option key={trade.id} value={trade.id}>
                {trade.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
          Failed to load vendors. Please try again.
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} lines={4} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredVendors && filteredVendors.length === 0 && (
        <EmptyState
          icon="📇"
          title={searchTerm || tradeFilter ? 'No vendors found' : 'No vendors yet'}
          description={
            searchTerm || tradeFilter
              ? 'Try a different search term or filter'
              : 'Add your first vendor to start building your database.'
          }
          actionLabel={searchTerm || tradeFilter ? undefined : 'Add Vendor'}
          onAction={searchTerm || tradeFilter ? undefined : () => openQuickEntry('vendor')}
        />
      )}

      {/* Vendor grid */}
      {!isLoading && filteredVendors && filteredVendors.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVendors.map((vendor) => (
            <VendorCard key={vendor.id} vendor={vendor} />
          ))}
        </div>
      )}
    </div>
  );
}
