import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useActiveProjects } from '../../hooks/useProjects';
import { useWarRoom } from '../../hooks/useWarRoom';
import { useQuotes } from '../../hooks/useQuotes';
import { useDecisionsNeeded } from '../../hooks/useDecisionsNeeded';
import { useRecentActivityByProject } from '../../hooks/useRecentActivity';
import { useBudgetTotalsByProject } from '../../hooks/useBudgetLineItems';
import { ProjectHealthCard } from './ProjectHealthCard';
import { ExportButton } from './ExportButton';
import { SkeletonList } from '../shared/SkeletonCard';
import type { WarRoomItem } from '../../lib/types';

export function BossView() {
  const queryClient = useQueryClient();
  const { data: projects, isLoading: projectsLoading } = useActiveProjects();
  const { data: tasks, isLoading: tasksLoading } = useWarRoom();
  const { data: quotes, isLoading: quotesLoading } = useQuotes();
  const { data: decisionsNeeded } = useDecisionsNeeded();
  const { data: activityByProject } = useRecentActivityByProject(5);
  const { data: budgetTotalsByProject } = useBudgetTotalsByProject();
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  // Invalidate queries on mount to ensure fresh data for executive view
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    queryClient.invalidateQueries({ queryKey: ['war-room'] });
    queryClient.invalidateQueries({ queryKey: ['quotes'] });
    queryClient.invalidateQueries({ queryKey: ['decisions-needed'] });
    queryClient.invalidateQueries({ queryKey: ['recent-activity-by-project'] });
    queryClient.invalidateQueries({ queryKey: ['budget-totals-by-project'] });
  }, [queryClient]);

  const isLoading = projectsLoading || tasksLoading || quotesLoading;

  // Calculate overall stats
  const totalTasks = tasks?.length || 0;
  const blockingTasks = tasks?.filter((t: WarRoomItem) => t.is_blocking).length || 0;
  const overdueTasks = tasks?.filter((t: WarRoomItem) => t.is_overdue).length || 0;

  // Calculate budget stats from line items (real-time data)
  const budgetTotalsArray = Object.values(budgetTotalsByProject || {});
  const totalBudgeted = budgetTotalsArray.reduce((sum, t) => sum + t.totalBudgeted, 0);
  const totalActual = budgetTotalsArray.reduce((sum, t) => sum + t.totalActual, 0);

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Boss View</h1>
          <p className="text-sm text-text-secondary">Executive summary of all projects</p>
        </div>
        <ExportButton />
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Active Projects"
          value={projects?.length || 0}
          icon="📁"
          color="bg-blue-50 text-blue-700"
        />
        <StatCard
          label="Open Tasks"
          value={totalTasks}
          icon="📋"
          color="bg-gray-50 text-gray-700"
        />
        <StatCard
          label="Blocking"
          value={blockingTasks}
          icon="🚧"
          color={blockingTasks > 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'}
          alert={blockingTasks > 0}
        />
        <StatCard
          label="Overdue"
          value={overdueTasks}
          icon="⚠️"
          color={overdueTasks > 0 ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-700'}
          alert={overdueTasks > 0}
        />
      </div>

      {/* Budget Summary */}
      <div className="bg-white rounded-lg border border-border p-4 mb-6">
        <h2 className="font-medium text-text-primary mb-3">Budget Overview</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-text-secondary">Total Budgeted</p>
            <p className="text-2xl font-semibold text-text-primary">
              {formatCurrency(totalBudgeted)}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-secondary">Total Actual</p>
            <p className="text-2xl font-semibold text-text-primary">
              {formatCurrency(totalActual)}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-secondary">Variance</p>
            <p className={`text-2xl font-semibold ${
              totalActual > totalBudgeted ? 'text-red-600' : totalActual < totalBudgeted ? 'text-green-600' : 'text-text-primary'
            }`}>
              {totalActual - totalBudgeted > 0 ? '+' : ''}{formatCurrency(totalActual - totalBudgeted)}
            </p>
          </div>
        </div>
        {totalBudgeted > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-text-secondary">Actual vs Budget</span>
              <span className={totalActual > totalBudgeted ? 'text-red-600' : 'text-green-600'}>
                {((totalActual / totalBudgeted) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  totalActual > totalBudgeted ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min((totalActual / totalBudgeted) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Decisions Needed Summary */}
      {decisionsNeeded && decisionsNeeded.length > 0 && (
        <div className="bg-amber-50 rounded-lg border border-amber-200 p-4 mb-6">
          <h2 className="font-medium text-amber-800 mb-3 flex items-center gap-2">
            <span>⚠️</span>
            Decisions Needed ({decisionsNeeded.length})
          </h2>
          <div className="space-y-2">
            {decisionsNeeded.slice(0, 5).map((decision) => (
              <div
                key={decision.id}
                className="flex items-center justify-between text-sm bg-white rounded p-2 border border-amber-100"
              >
                <div>
                  <span className="text-text-primary">{decision.description}</span>
                  <span className="text-text-secondary ml-2">• {decision.projectName}</span>
                </div>
                {decision.amount && (
                  <span className="font-medium text-amber-700">
                    {formatCurrency(decision.amount)}
                  </span>
                )}
              </div>
            ))}
            {decisionsNeeded.length > 5 && (
              <p className="text-xs text-amber-600 text-center">
                +{decisionsNeeded.length - 5} more decisions needed
              </p>
            )}
          </div>
        </div>
      )}

      {/* Project Health Cards */}
      <div className="space-y-4">
        <h2 className="font-medium text-text-primary">Project Health</h2>

        {isLoading && <SkeletonList count={3} />}

        {!isLoading && projects?.map((project) => {
          const projectTasks = tasks?.filter((t: WarRoomItem) => t.project_id === project.id) || [];
          const projectQuotes = quotes?.filter((q) => q.project_id === project.id) || [];

          const projectBudgetTotals = budgetTotalsByProject?.[project.id];

          return (
            <ProjectHealthCard
              key={project.id}
              project={project}
              tasks={projectTasks}
              quotes={projectQuotes}
              recentActivity={activityByProject?.[project.id] || []}
              decisionsNeeded={decisionsNeeded || []}
              budgetTotals={projectBudgetTotals}
              expanded={expandedProject === project.id}
              onToggle={() => setExpandedProject(
                expandedProject === project.id ? null : project.id
              )}
            />
          );
        })}

        {!isLoading && (!projects || projects.length === 0) && (
          <div className="text-center py-8 text-text-secondary">
            <div className="text-4xl mb-2">📊</div>
            <p>No active projects</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: string;
  color: string;
  alert?: boolean;
}

function StatCard({ label, value, icon, color, alert }: StatCardProps) {
  return (
    <div className={`rounded-lg p-4 ${color} ${alert ? 'ring-2 ring-offset-1 ring-current' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-2xl font-semibold">{value}</span>
      </div>
      <p className="text-sm mt-1">{label}</p>
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
