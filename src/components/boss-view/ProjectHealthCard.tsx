import type { Project, WarRoomItem, QuoteComparison } from '../../lib/types';
import type { DecisionNeeded } from '../../hooks/useDecisionsNeeded';
import type { ActivityEntry } from '../../hooks/useRecentActivity';
import type { ProjectBudgetTotals } from '../../hooks/useBudgetLineItems';

interface ProjectHealthCardProps {
  project: Project;
  tasks: WarRoomItem[];
  quotes: QuoteComparison[];
  recentActivity?: ActivityEntry[];
  decisionsNeeded?: DecisionNeeded[];
  budgetTotals?: ProjectBudgetTotals;
  expanded: boolean;
  onToggle: () => void;
}

export function ProjectHealthCard({
  project,
  tasks,
  quotes,
  recentActivity = [],
  decisionsNeeded = [],
  budgetTotals,
  expanded,
  onToggle,
}: ProjectHealthCardProps) {
  // Calculate health metrics
  const totalTasks = tasks.length;
  const blockingTasks = tasks.filter((t) => t.is_blocking).length;
  const overdueTasks = tasks.filter((t) => t.is_overdue).length;
  const waitingOnMe = tasks.filter((t) => t.status === 'waiting_on_me').length;

  // Budget metrics from line items (real-time)
  const totalBudgeted = budgetTotals?.totalBudgeted || 0;
  const totalActual = budgetTotals?.totalActual || 0;
  const budgetVariance = totalActual - totalBudgeted;
  const budgetUtilization = totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0;

  // Quote breakdown (for display purposes)
  const approvedQuotes = quotes.filter((q) =>
    ['approved', 'signed', 'contract_sent', 'in_progress', 'completed'].includes(q.status)
  );
  const pendingQuotes = quotes.filter((q) =>
    ['pending', 'quoted'].includes(q.status)
  );
  const overBudgetQuotes = quotes.filter((q) =>
    q.budget_variance !== null && q.budget_variance > 0
  );

  // Project-specific decisions
  const projectDecisions = decisionsNeeded.filter((d) => d.projectId === project.id);

  // Determine overall health status
  const getHealthStatus = (): { status: 'good' | 'warning' | 'critical'; label: string } => {
    if (blockingTasks > 0) return { status: 'critical', label: 'Blocked' };
    if (overdueTasks > 0 || budgetUtilization > 100) return { status: 'warning', label: 'Attention' };
    if (waitingOnMe > 0 || projectDecisions.length > 0) return { status: 'warning', label: 'Action Needed' };
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
              {projectDecisions.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  {projectDecisions.length} decision{projectDecisions.length !== 1 ? 's' : ''} needed
                </span>
              )}
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

        {/* Recent activity preview - collapsed view (2-3 entries) */}
        {!expanded && recentActivity.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="space-y-1">
              {recentActivity.slice(0, 2).map((activity) => (
                <div key={activity.id} className="text-xs flex justify-between items-center text-text-secondary">
                  <span className="truncate">{activity.description}</span>
                  <span className="ml-2 whitespace-nowrap">{activity.relativeTime}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border px-4 py-4 bg-gray-50">
          {/* Blocking issues at the top */}
          {blockingTasks > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1">
                <span>🚧</span> Blocking Issues ({blockingTasks})
              </h4>
              <div className="space-y-2">
                {tasks
                  .filter((t) => t.is_blocking)
                  .slice(0, 3)
                  .map((task) => (
                    <div key={task.id} className="text-sm p-2 bg-red-50 rounded border border-red-200">
                      <span className="text-red-700 font-medium">{task.task}</span>
                      {task.blocks_description && (
                        <span className="text-red-500 ml-2">— {task.blocks_description}</span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Decisions Needed */}
          {projectDecisions.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-amber-700 mb-2 flex items-center gap-1">
                <span>⚠️</span> Decisions Needed ({projectDecisions.length})
              </h4>
              <div className="space-y-2">
                {projectDecisions.slice(0, 3).map((decision) => (
                  <div key={decision.id} className="text-sm p-2 bg-amber-50 rounded border border-amber-200 flex justify-between items-center">
                    <span className="text-amber-800">{decision.description}</span>
                    {decision.amount && (
                      <span className="text-amber-600 font-medium ml-2">{formatCurrency(decision.amount)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Task breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <MiniStat label="Open Tasks" value={totalTasks} />
            <MiniStat label="Blocking" value={blockingTasks} color={blockingTasks > 0 ? 'text-red-600' : undefined} />
            <MiniStat label="Overdue" value={overdueTasks} color={overdueTasks > 0 ? 'text-amber-600' : undefined} />
            <MiniStat label="On Me" value={waitingOnMe} color={waitingOnMe > 0 ? 'text-amber-600' : undefined} />
          </div>

          {/* Enhanced Budget Section - from line items */}
          {totalBudgeted > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-text-secondary">Budget vs Actual</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                <div>
                  <span className="text-text-secondary">Budgeted: </span>
                  <span className="font-medium">{formatCurrency(totalBudgeted)}</span>
                </div>
                <div>
                  <span className="text-text-secondary">Actual: </span>
                  <span className="font-medium">{formatCurrency(totalActual)}</span>
                </div>
                <div>
                  <span className="text-text-secondary">Variance: </span>
                  <span className={`font-medium ${budgetVariance > 0 ? 'text-red-600' : budgetVariance < 0 ? 'text-green-600' : ''}`}>
                    {budgetVariance > 0 ? '+' : ''}{formatCurrency(budgetVariance)}
                  </span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${budgetUtilization > 100 ? 'bg-red-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-text-secondary mt-1">
                <span>{formatCurrency(totalBudgeted)} budgeted</span>
                <span className={budgetUtilization > 100 ? 'text-red-600 font-medium' : ''}>
                  {budgetUtilization.toFixed(0)}% spent
                </span>
              </div>
            </div>
          )}

          {/* Enhanced Quotes Summary */}
          {quotes.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-text-secondary mb-2">
                Quotes ({quotes.length})
              </h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="bg-white rounded p-2 border border-border text-center">
                  <div className="font-semibold text-green-600">{approvedQuotes.length}</div>
                  <div className="text-xs text-text-secondary">Approved</div>
                </div>
                <div className="bg-white rounded p-2 border border-border text-center">
                  <div className="font-semibold text-amber-600">{pendingQuotes.length}</div>
                  <div className="text-xs text-text-secondary">Pending</div>
                </div>
                <div className="bg-white rounded p-2 border border-border text-center">
                  <div className={`font-semibold ${overBudgetQuotes.length > 0 ? 'text-red-600' : 'text-text-primary'}`}>
                    {overBudgetQuotes.length}
                  </div>
                  <div className="text-xs text-text-secondary">Over Budget</div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity - full list */}
          {recentActivity.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-2">Recent Activity</h4>
              <div className="space-y-1 bg-white rounded border border-border p-2">
                {recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="text-xs flex justify-between items-center py-1">
                    <span className="text-text-secondary">{activity.description}</span>
                    <span className="text-text-secondary ml-2 whitespace-nowrap">
                      {activity.relativeTime}
                    </span>
                  </div>
                ))}
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
