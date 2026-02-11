import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { VendorWithTrades } from '../../hooks/useVendors';
import { RATING_CONFIG } from '../../lib/constants';

interface VendorCardProps {
  vendor: VendorWithTrades;
}

export function VendorCard({ vendor }: VendorCardProps) {
  const [emailCopied, setEmailCopied] = useState(false);

  const handleCopyEmail = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (vendor.email) {
      await navigator.clipboard.writeText(vendor.email);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    }
  };

  return (
    <Link
      to={`/vendors/${vendor.id}`}
      className="block bg-white rounded-lg border border-border p-4 hover:shadow-sm hover:border-gray-300 transition-all"
    >
      {/* Company name and POC */}
      <div className="mb-3">
        <h3 className="font-semibold text-text-primary truncate">{vendor.company_name}</h3>
        {vendor.poc_name && (
          <p className="text-sm text-text-secondary truncate">{vendor.poc_name}</p>
        )}
      </div>

      {/* Trades */}
      {vendor.trades && vendor.trades.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {vendor.trades.slice(0, 3).map((trade) => (
            <span
              key={trade}
              className="px-2 py-0.5 bg-gray-100 text-text-secondary text-xs rounded"
            >
              {trade}
            </span>
          ))}
          {vendor.trades.length > 3 && (
            <span className="px-2 py-0.5 text-text-secondary text-xs">
              +{vendor.trades.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Contact info */}
      <div className="space-y-1 mb-3">
        {vendor.phone && (
          <a
            href={`tel:${vendor.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
          >
            <span>📞</span>
            <span className="truncate">{vendor.phone}</span>
          </a>
        )}
        {vendor.email && (
          <div className="flex items-center gap-2">
            <a
              href={`mailto:${vendor.email}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 flex-1 min-w-0"
            >
              <span>✉️</span>
              <span className="truncate">{vendor.email}</span>
            </a>
            <button
              onClick={handleCopyEmail}
              className="p-1 text-text-secondary hover:text-primary-600 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
              title="Copy email"
            >
              {emailCopied ? (
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Ratings */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-text-secondary">Quality:</span>
          <span className={RATING_CONFIG[vendor.quality_rating]?.color || 'text-gray-400'}>
            {RATING_CONFIG[vendor.quality_rating]?.label || 'Unknown'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-text-secondary">Comms:</span>
          <span className={RATING_CONFIG[vendor.communication_rating]?.color || 'text-gray-400'}>
            {RATING_CONFIG[vendor.communication_rating]?.label || 'Unknown'}
          </span>
        </div>
      </div>
    </Link>
  );
}
