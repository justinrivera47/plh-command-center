interface BlockingBadgeProps {
  count?: number;
}

export function BlockingBadge({ count }: BlockingBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 animate-pulse">
      <span>&#x26D4;</span>
      <span>BLOCKING{count && count > 0 ? ` ${count}` : ''}</span>
    </span>
  );
}
