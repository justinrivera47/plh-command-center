import { Link } from 'react-router-dom';
import type { VendorWithTrades } from '../../hooks/useVendors';
import { RATING_CONFIG } from '../../lib/constants';

interface VendorCardProps {
  vendor: VendorWithTrades;
}

export function VendorCard({ vendor }: VendorCardProps) {
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
          <a
            href={`mailto:${vendor.email}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
          >
            <span>✉️</span>
            <span className="truncate">{vendor.email}</span>
          </a>
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
