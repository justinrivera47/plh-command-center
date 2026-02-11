import { useState } from 'react';
import { useCallLogs, formatOutcome, getOutcomeColor } from '../../hooks/useCallLogs';
import { useActiveProjects } from '../../hooks/useProjects';
import { EmptyState } from '../shared/EmptyState';
import { SkeletonList } from '../shared/SkeletonCard';
import { useUIStore } from '../../stores/uiStore';
import type { CallLogView, CallOutcome } from '../../lib/types';

const OUTCOME_OPTIONS: { value: CallOutcome | 'all'; label: string }[] = [
  { value: 'all', label: 'All Calls' },
  { value: 'waiting_on_them', label: 'Waiting on them' },
  { value: 'i_need_to_do', label: 'I need to do' },
  { value: 'follow_up_by', label: 'Follow up scheduled' },
  { value: 'done', label: 'Done' },
];

export function CallLogList() {
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [outcomeFilter, setOutcomeFilter] = useState<CallOutcome | 'all'>('all');
  const { data: callLogs, isLoading, error } = useCallLogs(projectFilter || undefined);
  const { data: projects } = useActiveProjects();
  const openQuickEntry = useUIStore((state) => state.openQuickEntry);

  // Filter by outcome
  const filteredLogs = callLogs?.filter((log) => {
    if (outcomeFilter === 'all') return true;
    return log.outcome === outcomeFilter;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Call Log</h1>
        <button
          onClick={() => openQuickEntry('call')}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          <span>+</span> Log Call
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        {/* Project filter */}
        <div className="flex-1 md:max-w-xs">
          <select
            value={projectFilter || ''}
            onChange={(e) => setProjectFilter(e.target.value || null)}
            className="w-full px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Projects</option>
            {projects?.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {/* Outcome filter */}
        <div className="md:w-48">
          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value as CallOutcome | 'all')}
            className="w-full px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {OUTCOME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
          Failed to load call logs. Please try again.
        </div>
      )}

      {/* Loading state */}
      {isLoading && <SkeletonList count={5} />}

      {/* Empty state */}
      {!isLoading && filteredLogs && filteredLogs.length === 0 && (
        <EmptyState
          icon="📞"
          title={projectFilter || outcomeFilter !== 'all' ? 'No calls found' : 'No calls logged yet'}
          description={
            projectFilter || outcomeFilter !== 'all'
              ? 'Try a different filter'
              : 'Log your first call to start tracking your communications.'
          }
          actionLabel={projectFilter || outcomeFilter !== 'all' ? undefined : 'Log Call'}
          onAction={projectFilter || outcomeFilter !== 'all' ? undefined : () => openQuickEntry('call')}
        />
      )}

      {/* Call logs list */}
      {!isLoading && filteredLogs && filteredLogs.length > 0 && (
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <CallLogCard key={log.id} log={log} formatDate={formatDate} />
          ))}
        </div>
      )}
    </div>
  );
}

interface CallLogCardProps {
  log: CallLogView;
  formatDate: (dateStr: string) => string;
}

function CallLogCard({ log, formatDate }: CallLogCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="bg-white rounded-lg border border-border p-4 hover:border-primary-200 transition-colors cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Contact and project */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-text-primary truncate">
              {log.contact_name}
            </span>
            {log.project_name && (
              <>
                <span className="text-text-secondary">-</span>
                <span className="text-sm text-text-secondary truncate">
                  {log.project_name}
                </span>
              </>
            )}
          </div>

          {/* Note preview */}
          <p className={`text-sm text-text-secondary ${expanded ? '' : 'line-clamp-2'}`}>
            {log.note}
          </p>

          {/* Expanded details */}
          {expanded && (
            <div className="mt-3 pt-3 border-t border-border space-y-2">
              {log.follow_up_date && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-text-secondary">Follow up:</span>
                  <span className="text-text-primary">
                    {new Date(log.follow_up_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
              {log.follow_up_task && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-text-secondary">Task:</span>
                  <span className="text-primary-600">{log.follow_up_task}</span>
                </div>
              )}
              {log.duration_minutes && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-text-secondary">Duration:</span>
                  <span className="text-text-primary">{log.duration_minutes} min</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right side: time and outcome */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="text-xs text-text-secondary whitespace-nowrap">
            {formatDate(log.created_at)}
          </span>
          <span
            className={`text-xs px-2 py-1 rounded whitespace-nowrap ${getOutcomeColor(log.outcome)}`}
          >
            {formatOutcome(log.outcome)}
          </span>
        </div>
      </div>

      {/* Expand indicator */}
      <div className="flex justify-center mt-2">
        <span className="text-xs text-text-secondary">
          {expanded ? '▲ Less' : '▼ More'}
        </span>
      </div>
    </div>
  );
}
