import type { WarRoomItem } from '../../lib/types';
import { StatusBadge } from '../shared/StatusBadge';
import { PriorityBadge } from '../shared/PriorityBadge';
import { BlockingBadge } from '../shared/BlockingBadge';
import { BlockedByBanner } from '../shared/BlockedByBanner';
import { DaysCounter } from '../shared/DaysCounter';
import { useUIStore } from '../../stores/uiStore';

interface TaskCardProps {
  task: WarRoomItem;
  onClick?: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const openMessageComposer = useUIStore((state) => state.openMessageComposer);

  // Determine border color based on status
  let borderColor = 'border-l-gray-300';
  let bgColor = 'bg-white';

  if (task.is_blocking) {
    borderColor = 'border-l-red-500';
    bgColor = 'bg-red-50';
  } else if (task.is_overdue) {
    borderColor = 'border-l-amber-500';
    bgColor = 'bg-amber-50';
  } else if (task.status === 'waiting_on_me') {
    borderColor = 'border-l-amber-500';
  } else if (task.priority === 'P1') {
    borderColor = 'border-l-red-400';
  } else if (task.priority === 'P2') {
    borderColor = 'border-l-amber-400';
  }

  return (
    <div
      className={`rounded-lg border border-border border-l-4 ${borderColor} ${bgColor} p-4 hover:shadow-sm transition-shadow cursor-pointer`}
      onClick={onClick}
    >
      {/* Row 1: Priority, Task name, Project, Blocking badge */}
      <div className="flex items-start gap-2 mb-2">
        <PriorityBadge priority={task.priority} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-text-primary">{task.task}</span>
            <span className="text-text-secondary text-sm">— {task.project_name}</span>
            {task.is_blocking && <BlockingBadge />}
          </div>
        </div>
      </div>

      {/* Row 2: Scope (if present) */}
      {task.scope && (
        <p className="text-xs text-text-secondary mb-2 line-clamp-2">{task.scope}</p>
      )}

      {/* Row 3: Blocking impact (if blocking) */}
      {task.is_blocking && task.blocks_description && (
        <div className="mb-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 text-red-700 text-xs">
            <span>⛔</span> Impact: {task.blocks_description}
          </span>
        </div>
      )}

      {/* Blocked by banner (if blocked) */}
      {task.blocked_by_rfi_id && task.blocked_by_task_name && (
        <div className="mb-2">
          <BlockedByBanner taskName={task.blocked_by_task_name} />
        </div>
      )}

      {/* Row 4: Latest update (if present) */}
      {task.latest_update && (
        <p className="text-xs text-text-secondary italic mb-2 line-clamp-1">
          Latest: {task.latest_update}
        </p>
      )}

      {/* Footer: Status, POC, Days, Action */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          <StatusBadge status={task.status} overdue={task.is_overdue} size="sm" />
          {task.poc_name && (
            <span className="text-xs text-text-secondary">{task.poc_name}</span>
          )}
          {task.days_since_contact !== null && (
            <DaysCounter days={task.days_since_contact} />
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            openMessageComposer({
              rfiId: task.id,
              pocName: task.poc_name || undefined,
              pocType: task.poc_type || undefined,
            });
          }}
          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
        >
          ✉️ Draft Message
        </button>
      </div>
    </div>
  );
}
