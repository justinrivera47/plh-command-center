import { useState } from 'react';
import type { WarRoomItem, RFIStatus, Priority, StallReason } from '../../lib/types';
import { StatusBadge } from '../shared/StatusBadge';
import { PriorityBadge } from '../shared/PriorityBadge';
import { BlockingBadge } from '../shared/BlockingBadge';
import { BlockedByBanner } from '../shared/BlockedByBanner';
import { DaysCounter } from '../shared/DaysCounter';
import { useUIStore } from '../../stores/uiStore';
import { useUpdateRFI, useUpdateRFIStatus } from '../../hooks/useRFIs';
import { RFI_STATUS_CONFIG, STALL_PROMPTS } from '../../lib/constants';

interface TaskCardProps {
  task: WarRoomItem;
  onClick?: () => void;
}

const STATUS_OPTIONS: RFIStatus[] = [
  'open',
  'waiting_on_client',
  'waiting_on_vendor',
  'waiting_on_contractor',
  'waiting_on_me',
  'follow_up',
  'completed',
  'dead',
];

const PRIORITY_ORDER: Priority[] = ['P1', 'P2', 'P3'];

const SNOOZE_OPTIONS = [
  { days: 1, label: '+1 day' },
  { days: 3, label: '+3 days' },
  { days: 5, label: '+5 days' },
];

export function TaskCard({ task, onClick }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [latestUpdateText, setLatestUpdateText] = useState(task.latest_update || '');
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);

  const openMessageComposer = useUIStore((state) => state.openMessageComposer);
  const openQuickEntry = useUIStore((state) => state.openQuickEntry);
  const updateRFI = useUpdateRFI();
  const updateRFIStatus = useUpdateRFIStatus();

  // Determine if task is stalled (3+ days without activity)
  const isStalled = task.days_since_contact !== null && task.days_since_contact >= 3;

  // Detect stall reason
  const detectStallReason = (): StallReason | null => {
    if (task.stall_reason) return task.stall_reason;
    if (task.blocked_by_rfi_id) return 'missing_info';
    if (task.days_since_contact && task.days_since_contact > 7) return 'avoiding_contact';
    if (!task.poc_name && !task.latest_update) return 'unclear_next_step';
    return null;
  };

  const stallReason = isStalled ? detectStallReason() : null;
  const stallPrompt = stallReason ? STALL_PROMPTS[stallReason] : null;

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

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else {
      setExpanded(!expanded);
    }
  };

  const handleMarkComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await updateRFIStatus.mutateAsync({
      rfi_id: task.id,
      new_status: 'completed',
      note: 'Marked complete from War Room',
    });
  };

  const handleStatusChange = async (newStatus: RFIStatus) => {
    await updateRFIStatus.mutateAsync({
      rfi_id: task.id,
      new_status: newStatus,
    });
    setEditingField(null);
  };

  const handlePriorityCycle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = PRIORITY_ORDER.indexOf(task.priority);
    const nextIndex = (currentIndex + 1) % PRIORITY_ORDER.length;
    await updateRFI.mutateAsync({
      id: task.id,
      priority: PRIORITY_ORDER[nextIndex],
    });
  };

  const handleSnooze = async (days: number) => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + days);
    await updateRFI.mutateAsync({
      id: task.id,
      next_action_date: newDate.toISOString().split('T')[0],
    });
    setShowSnoozeOptions(false);
  };

  const handleUpdateLatest = async () => {
    if (latestUpdateText !== task.latest_update) {
      await updateRFI.mutateAsync({
        id: task.id,
        latest_update: latestUpdateText || null,
        last_contacted_at: new Date().toISOString(),
      });
    }
    setEditingField(null);
  };

  const handleFollowUpDateChange = async (date: string) => {
    await updateRFI.mutateAsync({
      id: task.id,
      next_action_date: date || null,
    });
    setEditingField(null);
  };

  const handleStallReasonChange = async (reason: StallReason | '') => {
    await updateRFI.mutateAsync({
      id: task.id,
      stall_reason: reason || null,
    });
    setEditingField(null);
  };

  const handleDraftMessage = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Determine template category based on POC type and status
    let templateCategory = 'follow_up';
    if (task.poc_type === 'vendor') {
      templateCategory = 'vendor';
    } else if (task.poc_type === 'client') {
      templateCategory = 'client';
    } else if (task.poc_type === 'contractor') {
      templateCategory = 'contractor';
    }

    openMessageComposer({
      rfiId: task.id,
      pocName: task.poc_name || undefined,
      pocType: task.poc_type || undefined,
      templateCategory,
    });
  };

  const handleLogCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Set the selected project context for quick entry
    openQuickEntry('call');
  };

  return (
    <div
      className={`rounded-lg border border-border border-l-4 ${borderColor} ${bgColor} overflow-hidden transition-shadow ${
        expanded ? 'shadow-md' : 'hover:shadow-sm'
      }`}
    >
      {/* Collapsed view - always visible */}
      <div
        className="p-4 cursor-pointer"
        onClick={handleCardClick}
      >
        {/* Row 1: Priority, Task name, Project, Blocking badge */}
        <div className="flex items-start gap-2 mb-2">
          <button
            onClick={handlePriorityCycle}
            className="hover:scale-110 transition-transform"
            title="Click to change priority"
          >
            <PriorityBadge priority={task.priority} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-text-primary">{task.task}</span>
              <span className="text-text-secondary text-sm">- {task.project_name}</span>
              {task.is_blocking && <BlockingBadge />}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-1 text-text-secondary hover:text-text-primary"
          >
            {expanded ? '▲' : '▼'}
          </button>
        </div>

        {/* Row 2: Scope (if present) */}
        {task.scope && (
          <p className="text-xs text-text-secondary mb-2 line-clamp-2">{task.scope}</p>
        )}

        {/* Row 3: Blocking impact (if blocking) */}
        {task.is_blocking && task.blocks_description && (
          <div className="mb-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 text-red-700 text-xs">
              <span>X</span> Impact: {task.blocks_description}
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
        {task.latest_update && !expanded && (
          <p className="text-xs text-text-secondary italic mb-2 line-clamp-1">
            Latest: {task.latest_update}
          </p>
        )}

        {/* Stall prompt - show when task is stalled (3+ days) */}
        {isStalled && stallPrompt && !expanded && (
          <div className="mb-2 p-2 rounded bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-2">
              <span>💭</span>
              <span className="text-xs text-amber-800 font-medium">{stallPrompt.title}</span>
            </div>
            <p className="text-xs text-amber-700 mt-1">{stallPrompt.message}</p>
          </div>
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
            onClick={handleDraftMessage}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            Draft Message
          </button>
        </div>
      </div>

      {/* Expanded view - action area */}
      {expanded && (
        <div className="border-t border-border bg-gray-50">
          {/* Quick Actions - Mobile friendly, thumb-reachable */}
          <div className="p-3 border-b border-border">
            <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:gap-2">
              <button
                onClick={handleMarkComplete}
                disabled={updateRFIStatus.isPending}
                className="flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <span>✓</span> Mark Complete
              </button>
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingField(editingField === 'status' ? null : 'status');
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <span>↻</span> Update Status
                </button>
                {editingField === 'status' && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    {STATUS_OPTIONS.map((status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(status)}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                          task.status === status ? 'bg-primary-50 text-primary-700' : ''
                        }`}
                      >
                        <span>{RFI_STATUS_CONFIG[status].icon}</span>
                        {RFI_STATUS_CONFIG[status].label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={handleLogCall}
                className="flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-white border border-border text-text-primary text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span>📞</span> Log a Call
              </button>
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSnoozeOptions(!showSnoozeOptions);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-white border border-border text-text-primary text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span>⏰</span> Snooze
                </button>
                {showSnoozeOptions && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-10">
                    {SNOOZE_OPTIONS.map((option) => (
                      <button
                        key={option.days}
                        onClick={() => handleSnooze(option.days)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Editable Fields */}
          <div className="p-4 space-y-4">
            {/* Status dropdown */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Status</label>
              <select
                value={task.status}
                onChange={(e) => handleStatusChange(e.target.value as RFIStatus)}
                className="w-full px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {RFI_STATUS_CONFIG[status].icon} {RFI_STATUS_CONFIG[status].label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority - tappable chips */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Priority</label>
              <div className="flex gap-2">
                {PRIORITY_ORDER.map((p) => (
                  <button
                    key={p}
                    onClick={() => updateRFI.mutate({ id: task.id, priority: p })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      task.priority === p
                        ? p === 'P1'
                          ? 'bg-red-500 text-white'
                          : p === 'P2'
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-400 text-white'
                        : 'bg-white border border-border text-text-secondary hover:border-gray-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Follow-up date */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Follow-up Date</label>
              <input
                type="date"
                value={task.next_action_date || ''}
                onChange={(e) => handleFollowUpDateChange(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Latest update - text field */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Latest Update</label>
              <textarea
                value={latestUpdateText}
                onChange={(e) => setLatestUpdateText(e.target.value)}
                onBlur={handleUpdateLatest}
                placeholder="Add a note about latest activity..."
                rows={2}
                className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            {/* Stall reason - only show for waiting statuses */}
            {(task.status.startsWith('waiting_') || task.status === 'follow_up') && (
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Why is this stalled?</label>
                <select
                  value={task.stall_reason || ''}
                  onChange={(e) => handleStallReasonChange(e.target.value as StallReason | '')}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Not stalled</option>
                  <option value="avoiding_contact">Avoiding contact</option>
                  <option value="unclear_next_step">Unclear next step</option>
                  <option value="missing_info">Missing info / Blocked</option>
                  <option value="deprioritized">Intentionally deprioritized</option>
                </select>
              </div>
            )}

            {/* Stall prompt with coaching - show in expanded view when stalled */}
            {isStalled && stallPrompt && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-start gap-2">
                  <span className="text-lg">💭</span>
                  <div className="flex-1">
                    <h4 className="font-medium text-amber-800">{stallPrompt.title}</h4>
                    <p className="text-sm text-amber-700 mt-1">{stallPrompt.message}</p>
                    <button
                      onClick={handleDraftMessage}
                      className="mt-2 text-sm font-medium text-primary-600 hover:text-primary-700"
                    >
                      {stallPrompt.action}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom action bar - Mobile thumb-friendly */}
          <div className="p-3 border-t border-border bg-white md:hidden">
            <div className="flex gap-2">
              <button
                onClick={handleMarkComplete}
                disabled={updateRFIStatus.isPending}
                className="flex-1 py-3 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                ✓ Done
              </button>
              <button
                onClick={handleDraftMessage}
                className="flex-1 py-3 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700"
              >
                ✉️ Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
