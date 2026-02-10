import { useUIStore } from '../../stores/uiStore';

export function OfflineBanner() {
  const isOnline = useUIStore((state) => state.isOnline);

  if (isOnline) return null;

  return (
    <div className="bg-amber-500 text-white text-center py-2 text-sm font-medium">
      You're offline. Changes won't be saved until you reconnect.
    </div>
  );
}
