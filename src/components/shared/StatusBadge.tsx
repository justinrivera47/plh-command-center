import { RFI_STATUS_CONFIG } from '../../lib/constants';
import type { RFIStatus } from '../../lib/types';

interface StatusBadgeProps {
  status: RFIStatus;
  overdue?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, overdue, size = 'md' }: StatusBadgeProps) {
  const config = RFI_STATUS_CONFIG[status];

  const sizeClasses =
    size === 'sm' ? 'text-xs px-1.5 py-0.5' :
    size === 'lg' ? 'text-sm px-2.5 py-1' :
    'text-xs px-2 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${config.color} ${sizeClasses} ${
        overdue ? 'animate-pulse ring-2 ring-red-300' : ''
      }`}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
