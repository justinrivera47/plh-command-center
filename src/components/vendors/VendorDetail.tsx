import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useVendor, useVendorTrades, useUpdateVendor } from '../../hooks/useVendors';
import { useQuotes } from '../../hooks/useQuotes';
import { EmptyState } from '../shared/EmptyState';
import { SkeletonList } from '../shared/SkeletonCard';
import { RATING_CONFIG, QUOTE_STATUS_CONFIG } from '../../lib/constants';
import type { Rating } from '../../lib/types';

export function VendorDetail() {
  const { vendorId } = useParams();
  const { data: vendor, isLoading: vendorLoading } = useVendor(vendorId);
  const { data: trades, isLoading: tradesLoading } = useVendorTrades(vendorId);
  const { data: quotes, isLoading: quotesLoading } = useQuotes();
  const updateVendor = useUpdateVendor();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
  } = useForm({
    defaultValues: {
      company_name: '',
      poc_name: '',
      phone: '',
      email: '',
      quality_rating: 'unknown' as Rating,
      communication_rating: 'unknown' as Rating,
      notes: '',
    },
  });

  // Reset form when vendor data loads
  useEffect(() => {
    if (vendor) {
      reset({
        company_name: vendor.company_name,
        poc_name: vendor.poc_name || '',
        phone: vendor.phone || '',
        email: vendor.email || '',
        quality_rating: vendor.quality_rating,
        communication_rating: vendor.communication_rating,
        notes: vendor.notes || '',
      });
    }
  }, [vendor, reset]);

  const onSubmit = async (data: any) => {
    if (!vendorId) return;
    setSaving(true);
    try {
      await updateVendor.mutateAsync({ id: vendorId, ...data });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update vendor:', error);
    } finally {
      setSaving(false);
    }
  };

  // Filter quotes for this vendor
  const vendorQuotes = quotes?.filter((q) => q.vendor_id === vendorId) || [];

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (vendorLoading) {
    return (
      <div className="px-4 py-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-4" />
        <SkeletonList count={3} />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="px-4 py-6">
        <EmptyState
          icon="❌"
          title="Vendor not found"
          description="This vendor doesn't exist or you don't have access to it."
          actionLabel="Back to Vendors"
          onAction={() => window.history.back()}
        />
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link to="/vendors" className="text-sm text-primary-600 hover:text-primary-700 mb-2 inline-block">
          ← Back to Vendors
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text-primary">{vendor.company_name}</h1>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
        </div>
      </div>

      {/* Edit Form or Display */}
      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg border border-border p-4 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Company Name
              </label>
              <input
                type="text"
                {...register('company_name')}
                className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Contact Person
              </label>
              <input
                type="text"
                {...register('poc_name')}
                className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  {...register('phone')}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Email
                </label>
                <input
                  type="email"
                  {...register('email')}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Quality Rating
                </label>
                <select
                  {...register('quality_rating')}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {(Object.keys(RATING_CONFIG) as Rating[]).map((rating) => (
                    <option key={rating} value={rating}>
                      {RATING_CONFIG[rating].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Communication Rating
                </label>
                <select
                  {...register('communication_rating')}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {(Object.keys(RATING_CONFIG) as Rating[]).map((rating) => (
                    <option key={rating} value={rating}>
                      {RATING_CONFIG[rating].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Notes
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 px-4 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      ) : (
        <>
          {/* Contact Info */}
          <div className="bg-white rounded-lg border border-border p-4 mb-4">
            <h2 className="font-medium text-text-primary mb-3">Contact Information</h2>
            <div className="space-y-2">
              {vendor.poc_name && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-text-secondary">Contact:</span>
                  <span className="text-text-primary">{vendor.poc_name}</span>
                </div>
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
            </div>
          </div>

          {/* Trades */}
          <div className="bg-white rounded-lg border border-border p-4 mb-4">
            <h2 className="font-medium text-text-primary mb-3">Trades</h2>
            {tradesLoading ? (
              <div className="text-sm text-text-secondary">Loading...</div>
            ) : trades && trades.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {trades.map((trade) => (
                  <span
                    key={trade.id}
                    className="px-2 py-1 bg-gray-100 text-text-secondary text-xs rounded"
                  >
                    {trade.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">No trades assigned</p>
            )}
          </div>

          {/* Ratings */}
          <div className="bg-white rounded-lg border border-border p-4 mb-4">
            <h2 className="font-medium text-text-primary mb-3">Ratings</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-text-secondary">Quality:</span>
                <p className={`font-medium ${RATING_CONFIG[vendor.quality_rating]?.color || 'text-gray-400'}`}>
                  {RATING_CONFIG[vendor.quality_rating]?.label || 'Unknown'}
                </p>
              </div>
              <div>
                <span className="text-sm text-text-secondary">Communication:</span>
                <p className={`font-medium ${RATING_CONFIG[vendor.communication_rating]?.color || 'text-gray-400'}`}>
                  {RATING_CONFIG[vendor.communication_rating]?.label || 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {vendor.notes && (
            <div className="bg-white rounded-lg border border-border p-4 mb-4">
              <h2 className="font-medium text-text-primary mb-3">Notes</h2>
              <p className="text-sm text-text-secondary whitespace-pre-wrap">{vendor.notes}</p>
            </div>
          )}
        </>
      )}

      {/* Quote History */}
      <div className="bg-white rounded-lg border border-border p-4">
        <h2 className="font-medium text-text-primary mb-3">Quote History</h2>
        {quotesLoading ? (
          <SkeletonList count={2} />
        ) : vendorQuotes.length > 0 ? (
          <div className="space-y-2">
            {vendorQuotes.map((quote) => (
              <div key={quote.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-text-primary">{quote.project_name}</p>
                  <p className="text-xs text-text-secondary">{quote.trade_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-text-primary">
                    {formatCurrency(quote.quoted_price)}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded ${QUOTE_STATUS_CONFIG[quote.status]?.color || 'text-gray-600 bg-gray-100'}`}>
                    {QUOTE_STATUS_CONFIG[quote.status]?.label || quote.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">No quotes from this vendor yet</p>
        )}
      </div>
    </div>
  );
}
