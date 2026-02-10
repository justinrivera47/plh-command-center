interface BlockedByBannerProps {
  taskName: string;
  pocName?: string;
  onClick?: () => void;
}

export function BlockedByBanner({ taskName, pocName, onClick }: BlockedByBannerProps) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md text-sm ${
        onClick ? 'cursor-pointer hover:bg-amber-100' : ''
      }`}
      onClick={onClick}
    >
      <span className="text-amber-600">&#x1F517;</span>
      <span className="text-amber-800">
        Blocked by: <span className="font-medium">{taskName}</span>
        {pocName && <span className="text-amber-600"> ({pocName})</span>}
      </span>
      {onClick && (
        <span className="ml-auto text-amber-600">&rarr;</span>
      )}
    </div>
  );
}
