import { useParams, Link } from 'react-router-dom';
import * as Tabs from '@radix-ui/react-tabs';
import { useProject } from '../../hooks/useProjects';
import { useOpenRFIs } from '../../hooks/useRFIs';
import { useQuotes } from '../../hooks/useQuotes';
import { TaskCard } from '../war-room/TaskCard';
import { EmptyState } from '../shared/EmptyState';
import { SkeletonList } from '../shared/SkeletonCard';
import { useUIStore } from '../../stores/uiStore';
import { QUOTE_STATUS_CONFIG } from '../../lib/constants';
import type { WarRoomItem } from '../../lib/types';

export function ProjectDetail() {
  const { projectId } = useParams();
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: rfis, isLoading: rfisLoading } = useOpenRFIs(projectId);
  const { data: quotes, isLoading: quotesLoading } = useQuotes(projectId);
  const openQuickEntry = useUIStore((state) => state.openQuickEntry);

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (projectLoading) {
    return (
      <div className="px-4 py-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-4" />
        <SkeletonList count={3} />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="px-4 py-6">
        <EmptyState
          icon="❌"
          title="Project not found"
          description="This project doesn't exist or you don't have access to it."
          actionLabel="Back to Projects"
          onAction={() => window.history.back()}
        />
      </div>
    );
  }

  // Convert RFIs to WarRoomItem format for TaskCard
  const warRoomItems: WarRoomItem[] = (rfis || []).map((rfi) => ({
    ...rfi,
    project_name: project.name,
    project_address: project.address,
    days_since_contact: rfi.last_contacted_at
      ? Math.floor((Date.now() - new Date(rfi.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24))
      : null,
    is_overdue: false, // Would need to calculate based on follow_up_days
    blocked_by_task_name: null,
  }));

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link to="/projects" className="text-sm text-primary-600 hover:text-primary-700 mb-2 inline-block">
          ← Back to Projects
        </Link>
        <h1 className="text-xl font-semibold text-text-primary">{project.name}</h1>
        <div className="text-sm text-text-secondary mt-1">
          {project.client_name && <span>{project.client_name}</span>}
          {project.total_budget && (
            <span className="ml-4">Budget: {formatCurrency(project.total_budget)}</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs.Root defaultValue="tasks" className="w-full">
        <Tabs.List className="flex border-b border-border mb-4 overflow-x-auto">
          <Tabs.Trigger
            value="tasks"
            className="px-4 py-2 text-sm font-medium text-text-secondary border-b-2 border-transparent data-[state=active]:text-primary-600 data-[state=active]:border-primary-600 whitespace-nowrap"
          >
            Tasks ({rfis?.length || 0})
          </Tabs.Trigger>
          <Tabs.Trigger
            value="quotes"
            className="px-4 py-2 text-sm font-medium text-text-secondary border-b-2 border-transparent data-[state=active]:text-primary-600 data-[state=active]:border-primary-600 whitespace-nowrap"
          >
            Quotes ({quotes?.length || 0})
          </Tabs.Trigger>
          <Tabs.Trigger
            value="budget"
            className="px-4 py-2 text-sm font-medium text-text-secondary border-b-2 border-transparent data-[state=active]:text-primary-600 data-[state=active]:border-primary-600 whitespace-nowrap"
          >
            Budget
          </Tabs.Trigger>
          <Tabs.Trigger
            value="activity"
            className="px-4 py-2 text-sm font-medium text-text-secondary border-b-2 border-transparent data-[state=active]:text-primary-600 data-[state=active]:border-primary-600 whitespace-nowrap"
          >
            Activity
          </Tabs.Trigger>
        </Tabs.List>

        {/* Tasks Tab */}
        <Tabs.Content value="tasks">
          {rfisLoading && <SkeletonList count={3} />}
          {!rfisLoading && warRoomItems.length === 0 && (
            <EmptyState
              icon="📋"
              title="No tasks yet"
              description="Add your first task for this project."
              actionLabel="Add Task"
              onAction={() => openQuickEntry('rfi')}
            />
          )}
          {!rfisLoading && warRoomItems.length > 0 && (
            <div className="space-y-3">
              {warRoomItems.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </Tabs.Content>

        {/* Quotes Tab */}
        <Tabs.Content value="quotes">
          {quotesLoading && <SkeletonList count={3} />}
          {!quotesLoading && (!quotes || quotes.length === 0) && (
            <EmptyState
              icon="💰"
              title="No quotes yet"
              description="Log your first quote for this project."
              actionLabel="Log Quote"
              onAction={() => openQuickEntry('quote')}
            />
          )}
          {!quotesLoading && quotes && quotes.length > 0 && (
            <div className="space-y-2">
              {quotes.map((quote) => (
                <div
                  key={quote.id}
                  className="bg-white rounded-lg border border-border p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-text-primary">
                        {quote.trade_name || 'Unknown Trade'}
                      </div>
                      <div className="text-sm text-text-secondary">
                        {quote.vendor_name || 'Unknown Vendor'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-text-primary">
                        {formatCurrency(quote.quoted_price)}
                      </div>
                      {quote.budget_variance_percent !== null && (
                        <div
                          className={`text-sm ${
                            quote.budget_variance_percent > 0
                              ? 'text-red-600'
                              : 'text-green-600'
                          }`}
                        >
                          {quote.budget_variance_percent > 0 ? '+' : ''}
                          {quote.budget_variance_percent}%
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        QUOTE_STATUS_CONFIG[quote.status]?.color || 'text-gray-600 bg-gray-100'
                      }`}
                    >
                      {QUOTE_STATUS_CONFIG[quote.status]?.label || quote.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Tabs.Content>

        {/* Budget Tab */}
        <Tabs.Content value="budget">
          <div className="bg-white rounded-lg border border-border p-6">
            <div className="text-center text-text-secondary">
              <div className="text-4xl mb-2">📊</div>
              <p>Budget breakdown coming soon</p>
              <p className="text-sm mt-1">
                Total Budget: {formatCurrency(project.total_budget)}
              </p>
            </div>
          </div>
        </Tabs.Content>

        {/* Activity Tab */}
        <Tabs.Content value="activity">
          <div className="bg-white rounded-lg border border-border p-6">
            <div className="text-center text-text-secondary">
              <div className="text-4xl mb-2">📜</div>
              <p>Activity log coming soon</p>
              <p className="text-sm mt-1">
                Track all changes and updates for this project
              </p>
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
