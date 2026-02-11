import type { Project, WarRoomItem, QuoteComparison, CallLogView } from '../../lib/types';
import type { DecisionNeeded } from '../../hooks/useDecisionsNeeded';
import type { ActivityEntry } from '../../hooks/useRecentActivity';
import type { ProjectBudgetTotals } from '../../hooks/useBudgetLineItems';
import { formatOutcome, getOutcomeColor } from '../../hooks/useCallLogs';

interface ProjectHealthCardProps {
  project: Project;
  tasks: WarRoomItem[];
  quotes: QuoteComparison[];
  recentActivity?: ActivityEntry[];
  decisionsNeeded?: DecisionNeeded[];
  budgetTotals?: ProjectBudgetTotals;
  callLogs?: CallLogView[];
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
  callLogs = [],
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

  // Build quote pipeline by trade
  const getQuotePipelineByTrade = () => {
    const tradeMap = new Map<string, {
      tradeName: string;
      budgetAmount: number | null;
      quotes: QuoteComparison[];
      awardedQuote: QuoteComparison | null;
    }>();

    quotes.forEach((quote) => {
      const tradeName = quote.trade_name || 'Other';
      if (!tradeMap.has(tradeName)) {
        tradeMap.set(tradeName, {
          tradeName,
          budgetAmount: quote.budget_amount,
          quotes: [],
          awardedQuote: null,
        });
      }
      const trade = tradeMap.get(tradeName)!;
      trade.quotes.push(quote);

      // Check if this quote is awarded
      if (['approved', 'signed', 'contract_sent', 'in_progress', 'completed'].includes(quote.status)) {
        trade.awardedQuote = quote;
      }
    });

    return Array.from(tradeMap.values()).map((trade) => {
      const nonDeclinedQuotes = trade.quotes.filter(q => q.status !== 'declined' && q.quoted_price);
      const quotedQuotes = trade.quotes.filter(q => q.quoted_price !== null);

      // Find best (lowest) quote
      const bestQuoteObj = nonDeclinedQuotes.reduce<QuoteComparison | null>((best, q) => {
        if (!q.quoted_price) return best;
        if (!best || !best.quoted_price) return q;
        return q.quoted_price < best.quoted_price ? q : best;
      }, null);

      const bestQuote = bestQuoteObj?.quoted_price || null;
      const bestVendor = bestQuoteObj?.vendor_name || null;
      const isOverBudget = trade.budgetAmount && bestQuote ? bestQuote > trade.budgetAmount : false;

      // Determine status
      let status: 'awarded' | 'pending' | 'over_budget' | 'waiting';
      let statusLabel: string;

      if (trade.awardedQuote) {
        status = 'awarded';
        statusLabel = 'Awarded';
      } else if (isOverBudget) {
        status = 'over_budget';
        statusLabel = 'Over Budget';
      } else if (quotedQuotes.length > 0) {
        status = 'pending';
        statusLabel = 'Pending';
      } else {
        status = 'waiting';
        statusLabel = 'Waiting';
      }

      return {
        tradeName: trade.tradeName,
        budgetAmount: trade.budgetAmount,
        bestQuote,
        bestVendor,
        isOverBudget,
        quotedCount: quotedQuotes.length,
        totalVendors: trade.quotes.length,
        status,
        statusLabel,
      };
    });
  };

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

          {/* Enhanced Budget Section - Committed / Projected / Budget */}
          {(totalBudgeted > 0 || project.total_budget) && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-text-secondary mb-2">Budget Progress</h4>
              {(() => {
                // Calculate committed (awarded vendor prices)
                const committed = approvedQuotes.reduce((sum, q) => sum + (q.quoted_price || 0), 0);

                // Calculate projected (committed + best quotes on non-awarded trades)
                const pipeline = getQuotePipelineByTrade();
                const projectedFromPending = pipeline
                  .filter(t => t.status !== 'awarded' && t.bestQuote)
                  .reduce((sum, t) => sum + (t.bestQuote || 0), 0);
                const projected = committed + projectedFromPending;

                // Use project total budget or sum of line item budgets
                const budget = project.total_budget || totalBudgeted;

                const committedPercent = budget > 0 ? (committed / budget) * 100 : 0;
                const projectedPercent = budget > 0 ? (projected / budget) * 100 : 0;

                return (
                  <>
                    <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                      <div>
                        <span className="text-text-secondary">Committed: </span>
                        <span className="font-medium text-green-600">{formatCurrency(committed)}</span>
                      </div>
                      <div>
                        <span className="text-text-secondary">Projected: </span>
                        <span className="font-medium text-amber-600">{formatCurrency(projected)}</span>
                      </div>
                      <div>
                        <span className="text-text-secondary">Budget: </span>
                        <span className="font-medium">{formatCurrency(budget)}</span>
                      </div>
                    </div>
                    {/* Stacked progress bar */}
                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden flex">
                      {/* Committed (green) */}
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${Math.min(committedPercent, 100)}%` }}
                      />
                      {/* Projected additional (amber) */}
                      <div
                        className={`h-full transition-all ${projectedPercent > 100 ? 'bg-red-400' : 'bg-amber-400'}`}
                        style={{ width: `${Math.min(Math.max(projectedPercent - committedPercent, 0), 100 - Math.min(committedPercent, 100))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-text-secondary mt-1">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          Committed {committedPercent.toFixed(0)}%
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                          Projected {projectedPercent.toFixed(0)}%
                        </span>
                      </div>
                      {projectedPercent > 100 && (
                        <span className="text-red-600 font-medium">
                          {formatCurrency(projected - budget)} over
                        </span>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Quote Pipeline Summary - Per Trade */}
          {quotes.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-text-secondary mb-2">
                Quote Pipeline
              </h4>
              <div className="bg-white rounded border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-border">
                    <tr>
                      <th className="text-left px-2 py-1.5 font-medium text-text-secondary">Trade</th>
                      <th className="text-right px-2 py-1.5 font-medium text-text-secondary">Budget</th>
                      <th className="text-right px-2 py-1.5 font-medium text-text-secondary">Best Quote</th>
                      <th className="text-center px-2 py-1.5 font-medium text-text-secondary">Quotes</th>
                      <th className="text-center px-2 py-1.5 font-medium text-text-secondary">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {getQuotePipelineByTrade().map((trade) => (
                      <tr key={trade.tradeName} className="hover:bg-gray-50">
                        <td className="px-2 py-1.5 text-text-primary">{trade.tradeName}</td>
                        <td className="px-2 py-1.5 text-right text-text-secondary">
                          {trade.budgetAmount ? formatCurrency(trade.budgetAmount) : '—'}
                        </td>
                        <td className={`px-2 py-1.5 text-right font-medium ${
                          trade.isOverBudget ? 'text-red-600' : trade.bestQuote ? 'text-text-primary' : 'text-text-secondary'
                        }`}>
                          {trade.bestQuote ? formatCurrency(trade.bestQuote) : 'No quotes'}
                          {trade.bestVendor && (
                            <span className="block text-text-secondary font-normal">({trade.bestVendor})</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-center text-text-secondary">
                          {trade.quotedCount}/{trade.totalVendors}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${
                            trade.status === 'awarded' ? 'bg-green-100 text-green-700' :
                            trade.status === 'over_budget' ? 'bg-red-100 text-red-700' :
                            trade.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {trade.status === 'awarded' && '✅'}
                            {trade.status === 'over_budget' && '🔴'}
                            {trade.status === 'pending' && '⏳'}
                            {trade.status === 'waiting' && '⚠️'}
                            {trade.statusLabel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Quick stats row */}
              <div className="grid grid-cols-3 gap-2 text-sm mt-2">
                <div className="bg-white rounded p-2 border border-border text-center">
                  <div className="font-semibold text-green-600">{approvedQuotes.length}</div>
                  <div className="text-xs text-text-secondary">Awarded</div>
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

          {/* Recent Calls */}
          {callLogs.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-text-secondary mb-2">
                Recent Calls ({callLogs.length})
              </h4>
              <div className="space-y-2 bg-white rounded border border-border p-2">
                {callLogs.slice(0, 3).map((log) => (
                  <div key={log.id} className="text-xs p-2 bg-gray-50 rounded">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-text-primary">{log.contact_name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${getOutcomeColor(log.outcome)}`}>
                        {formatOutcome(log.outcome)}
                      </span>
                    </div>
                    <p className="text-text-secondary line-clamp-2">{log.note}</p>
                    <div className="flex justify-between items-center mt-1 text-text-secondary">
                      <span>{formatRelativeTime(log.created_at)}</span>
                      {log.follow_up_date && (
                        <span className="text-amber-600">
                          Follow up: {new Date(log.follow_up_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
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

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
