import { useUIStore } from '../../stores/uiStore';

export function QuickEntryFAB() {
  const openQuickEntry = useUIStore((state) => state.openQuickEntry);

  return (
    <button
      onClick={() => openQuickEntry('rfi')}
      className="fixed right-4 bottom-20 md:bottom-8 w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg flex items-center justify-center text-2xl z-50 transition-colors"
      aria-label="Log it - Quick entry"
    >
      +
    </button>
  );
}
