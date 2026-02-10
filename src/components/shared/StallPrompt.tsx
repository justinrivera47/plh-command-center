import type { StallReason, WarRoomItem } from '../../lib/types';
import { STALL_PROMPTS } from '../../lib/constants';
import { useUIStore } from '../../stores/uiStore';

interface StallPromptProps {
  task: WarRoomItem;
  onDismiss?: () => void;
}

export function StallPrompt({ task, onDismiss }: StallPromptProps) {
  const openMessageComposer = useUIStore((state) => state.openMessageComposer);

  // Get stall reason from task or detect automatically
  const detectStallReason = (): StallReason | null => {
    if (task.stall_reason) return task.stall_reason;

    // Auto-detect based on task properties
    if (task.blocked_by_rfi_id) return 'missing_info';
    if (task.days_since_contact && task.days_since_contact > 7) return 'avoiding_contact';
    if (!task.poc_name && !task.latest_update) return 'unclear_next_step';

    return null;
  };

  const stallReason = detectStallReason();
  if (!stallReason) return null;

  const prompt = STALL_PROMPTS[stallReason];

  const handleAction = () => {
    if (stallReason === 'avoiding_contact' || stallReason === 'unclear_next_step') {
      openMessageComposer({
        rfiId: task.id,
        pocName: task.poc_name || undefined,
        pocType: task.poc_type || undefined,
      });
    }
    // For other actions, you could navigate to the blocking task, etc.
    onDismiss?.();
  };

  // Determine background color based on severity
  const bgColor = stallReason === 'avoiding_contact' || stallReason === 'missing_info'
    ? 'bg-amber-50 border-amber-200'
    : 'bg-blue-50 border-blue-200';

  const textColor = stallReason === 'avoiding_contact' || stallReason === 'missing_info'
    ? 'text-amber-800'
    : 'text-blue-800';

  return (
    <div className={`rounded-lg border ${bgColor} p-4 mb-4`}>
      <div className="flex items-start gap-3">
        <span className="text-xl">💭</span>
        <div className="flex-1">
          <h4 className={`font-medium ${textColor}`}>{prompt.title}</h4>
          <p className="text-sm mt-1 text-gray-700">{prompt.message}</p>
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={handleAction}
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              {prompt.action}
            </button>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-sm text-text-secondary hover:text-text-primary"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact inline version for task cards
interface StallIndicatorProps {
  task: WarRoomItem;
}

export function StallIndicator({ task }: StallIndicatorProps) {
  const openMessageComposer = useUIStore((state) => state.openMessageComposer);

  // Only show for tasks that appear stalled
  const isStalled = task.days_since_contact && task.days_since_contact > 5;

  if (!isStalled) return null;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        openMessageComposer({
          rfiId: task.id,
          pocName: task.poc_name || undefined,
          pocType: task.poc_type || undefined,
        });
      }}
      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs hover:bg-amber-200 transition-colors"
    >
      <span>💭</span>
      <span>Needs attention</span>
    </button>
  );
}
