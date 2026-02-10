import { DAYS_SINCE_CONTACT_THRESHOLDS } from '../../lib/constants';

interface DaysCounterProps {
  days: number | null;
  label?: string;
}

export function DaysCounter({ days, label = 'd' }: DaysCounterProps) {
  if (days === null) return null;

  let colorClass = 'text-green-600 bg-green-50';

  if (days > DAYS_SINCE_CONTACT_THRESHOLDS.warning) {
    colorClass = 'text-red-600 bg-red-50';
  } else if (days > DAYS_SINCE_CONTACT_THRESHOLDS.good) {
    colorClass = 'text-amber-600 bg-amber-50';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
      {days}{label}
    </span>
  );
}
