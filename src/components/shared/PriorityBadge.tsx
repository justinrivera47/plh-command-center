import { PRIORITY_CONFIG } from '../../lib/constants';
import type { Priority } from '../../lib/types';

interface PriorityBadgeProps {
  priority: Priority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];

  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${config.color} ${config.bgColor}`}
    >
      {config.label}
    </span>
  );
}
