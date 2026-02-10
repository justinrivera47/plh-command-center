import type { Project, WarRoomItem, QuoteComparison } from '../../lib/types';

interface ProjectHealthCardProps {
  project: Project;
  tasks: WarRoomItem[];
  quotes: QuoteComparison[];
  expanded: boolean;
  onToggle: () => void;
}

export function ProjectHealthCard({
  project,
  tasks,
  quotes,
  expanded,
  onToggle,
}: ProjectHealthCardProps) {
  // Calculate health metrics
  const totalTasks = tasks.length;
  const blockingTasks = tasks.filter((t) => t.is_blocking).length;
  const overdueTasks = tasks.filter((t) => t.is_overdue).length;
  const waitingOnMe = tasks.filter((t) => t.status === 'waiting_on_me').length;

  // Budget metrics
  const budget = project.total_budget || 0;
  const quoted = quotes.reduce((sum, q) => sum + (q.quoted_price || 0), 0);
  const budgetUtilization = budget > 0 ? (quoted / budget) * 100 : 0;

  // Determine overall health status
  const getHealthStatus = (): { status: 'good' | 'warning' | 'critical'; label: string } => {
    if (blockingTasks > 0) return { status: 'critical', label: 'Blocked' };
    if (overdueTasks > 0 || budgetUtilization > 100) return { status: 'warning', label: 'Attention' };
    if (waitingOnMe > 0) return { status: 'warning', label: 'Action Needed' };
    return { status: 'good', label: 'On Track' };
  };

  const health = getHealthStatus();

  const healthColors = {
    good: 'bg-green-100 text-green-800 border-green-300',
    warning: 'bg-amber-100 text-amber-800 border-amber-300',
    critical: 'bg-red-100 text-red-800 border-red-300',
  };

  const healthBorderColors = {
    good: 'border-l-green-500',
    warning: 'border-l-amber-500',
    critical: 'border-l-red-500',
  };

  return (
    <div
      className={`bg-white rounded-lg border border-border border-l-4 ${healthBorderColors[health.status]} overflow-hidden`}
    >
      {/* Header - always visible */}
      <button
        onClick={onToggle}
        className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-text-primary">{project.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${healthColors[health.status]}`}>
                {health.label}
              </span>
            </div>
            {project.client_name && (
              <p className="text-sm text-text-secondary mt-0.5">{project.client_name}</p>
            )}
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-text-primary">{totalTasks}</div>
              <div className="text-xs text-text-secondary">Tasks</div>
            </div>
            {blockingTasks > 0 && (
              <div className="text-center">
                <div className="font-semibold text-red-600">{blockingTasks}</div>
                <div className="text-xs text-text-secondary">Blocking</div>
              </div>
            )}
            <span className="text-gray-400">{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border px-4 py-4 bg-gray-50">
          {/* Task breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <MiniStat label="Open Tasks" value={totalTasks} />
            <MiniStat label="Blocking" value={blockingTasks} color={blockingTasks > 0 ? 'text-red-600' : undefined} />
            <MiniStat label="Overdue" value={overdueTasks} color={overdueTasks > 0 ? 'text-amber-600' : undefined} />
            <MiniStat label="On Me" value={waitingOnMe} color={waitingOnMe > 0 ? 'text-amber-600' : undefined} />
          </div>

          {/* Budget progress */}
          {budget > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-text-secondary">Budget Progress</span>
                <span className="text-text-primary">
                  {formatCurrency(quoted)} / {formatCurrency(budget)}
                </span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    budgetUtilization > 100
                      ? 'bg-red-500'
                      : budgetUtilization > 80
                      ? 'bg-amber-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-text-secondary mt-1">
                <span>0%</span>
                <span className={budgetUtilization > 100 ? 'text-red-600 font-medium' : ''}>
                  {budgetUtilization.toFixed(0)}% used
                </span>
                <span>100%</span>
              </div>
            </div>
          )}

          {/* Recent blocking tasks */}
          {blockingTasks > 0 && (
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-2">Blocking Issues</h4>
              <div className="space-y-2">
                {tasks
                  .filter((t) => t.is_blocking)
                  .slice(0, 3)
                  .map((task) => (
                    <div key={task.id} className="text-sm p-2 bg-red-50 rounded border border-red-200">
                      <span className="text-red-700">{task.task}</span>
                      {task.blocks_description && (
                        <span className="text-red-500 ml-2">— {task.blocks_description}</span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Quotes summary */}
          {quotes.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-text-secondary mb-2">
                Quotes ({quotes.length})
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-text-secondary">Pending: </span>
                  <span className="font-medium">
                    {quotes.filter((q) => q.status === 'pending' || q.status === 'quoted').length}
                  </span>
                </div>
                <div>
                  <span className="text-text-secondary">Approved: </span>
                  <span className="font-medium text-green-600">
                    {quotes.filter((q) => q.status === 'approved' || q.status === 'signed').length}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface MiniStatProps {
  label: string;
  value: number;
  color?: string;
}

function MiniStat({ label, value, color }: MiniStatProps) {
  return (
    <div className="bg-white rounded p-2 border border-border">
      <div className={`text-lg font-semibold ${color || 'text-text-primary'}`}>{value}</div>
      <div className="text-xs text-text-secondary">{label}</div>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}
