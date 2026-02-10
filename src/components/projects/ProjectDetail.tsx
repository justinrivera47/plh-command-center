import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as Tabs from '@radix-ui/react-tabs';
import { useProject, useProjectBudgetAreas, useProjectActivity, useCreateBudgetArea, useUpdateBudgetArea, useDeleteBudgetArea, useReorderBudgetAreas } from '../../hooks/useProjects';
import { useRFIs } from '../../hooks/useRFIs';
import { useQuotesByTrade, useUpdateQuoteWithLog } from '../../hooks/useQuotes';
import { useAuth } from '../../hooks/useAuth';
import { TaskCard } from '../war-room/TaskCard';
import { EmptyState } from '../shared/EmptyState';
import { SkeletonList } from '../shared/SkeletonCard';
import { DeleteConfirmDialog } from '../shared/DeleteConfirmDialog';
import { useUIStore } from '../../stores/uiStore';
import { QUOTE_STATUS_CONFIG } from '../../lib/constants';
import { QuoteDetailDrawer } from '../quotes/QuoteDetailDrawer';
import type { WarRoomItem, QuoteStatus, ProjectBudgetArea } from '../../lib/types';

const QUOTE_STATUS_ORDER: QuoteStatus[] = [
  'pending', 'quoted', 'approved', 'declined',
  'contract_sent', 'signed', 'in_progress', 'completed',
];

const TASK_STATUS_FILTERS: { value: 'all' | 'open' | 'completed' | 'dead'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'completed', label: 'Completed' },
  { value: 'dead', label: 'Dead' },
];

export function ProjectDetail() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: allRfis, isLoading: rfisLoading } = useRFIs(projectId);
  const { data: groupedQuotes, isLoading: quotesLoading } = useQuotesByTrade(projectId);
  const { data: budgetAreas, isLoading: budgetLoading } = useProjectBudgetAreas(projectId);
  const { data: activity, isLoading: activityLoading } = useProjectActivity(projectId);
  const openQuickEntry = useUIStore((state) => state.openQuickEntry);
  const setSelectedProjectId = useUIStore((state) => state.setSelectedProjectId);
  const openQuoteDrawer = useUIStore((state) => state.openQuoteDrawer);
  const updateQuote = useUpdateQuoteWithLog();
  const createBudgetArea = useCreateBudgetArea();
  const updateBudgetArea = useUpdateBudgetArea();
  const deleteBudgetArea = useDeleteBudgetArea();
  const reorderBudgetAreas = useReorderBudgetAreas();

  const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | 'open' | 'completed' | 'dead'>('open');
  const [newAreaName, setNewAreaName] = useState('');
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [editingAreaNameId, setEditingAreaNameId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Helper to open quick entry with project context
  const openQuickEntryWithProject = (type: 'quote' | 'rfi' | 'status' | 'call' | 'vendor') => {
    if (projectId) {
      setSelectedProjectId(projectId);
    }
    openQuickEntry(type);
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
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
          icon="X"
          title="Project not found"
          description="This project doesn't exist or you don't have access to it."
          actionLabel="Back to Projects"
          onAction={() => window.history.back()}
        />
      </div>
    );
  }

  // Filter RFIs based on status
  const filteredRfis = allRfis?.filter((rfi) => {
    if (taskStatusFilter === 'all') return true;
    if (taskStatusFilter === 'open') return !rfi.is_complete && rfi.status !== 'dead';
    if (taskStatusFilter === 'completed') return rfi.is_complete || rfi.status === 'completed';
    if (taskStatusFilter === 'dead') return rfi.status === 'dead';
    return true;
  });

  // Convert RFIs to WarRoomItem format for TaskCard
  const warRoomItems: WarRoomItem[] = (filteredRfis || []).map((rfi) => ({
    ...rfi,
    project_name: project.name,
    project_address: project.address,
    days_since_contact: rfi.last_contacted_at
      ? Math.floor((Date.now() - new Date(rfi.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24))
      : null,
    is_overdue: false,
    blocked_by_task_name: null,
  }));

  // Sort: blocking first, then by priority
  const sortedWarRoomItems = [...warRoomItems].sort((a, b) => {
    if (a.is_blocking && !b.is_blocking) return -1;
    if (!a.is_blocking && b.is_blocking) return 1;
    const priorityOrder = { P1: 0, P2: 1, P3: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  // Calculate budget totals
  const budgetTotals = budgetAreas?.reduce(
    (acc, area) => ({
      budgeted: acc.budgeted + (area.budgeted_amount || 0),
      actual: acc.actual + (area.actual_amount || 0),
    }),
    { budgeted: 0, actual: 0 }
  ) || { budgeted: 0, actual: 0 };

  const totalVariance = budgetTotals.actual - budgetTotals.budgeted;

  const handleQuickStatusCycle = (quoteId: string, currentStatus: QuoteStatus) => {
    if (!user) return;
    const currentIndex = QUOTE_STATUS_ORDER.indexOf(currentStatus);
    const nextIndex = (currentIndex + 1) % QUOTE_STATUS_ORDER.length;
    const nextStatus = QUOTE_STATUS_ORDER[nextIndex];
    updateQuote.mutate({
      id: quoteId,
      userId: user.id,
      updates: { status: nextStatus },
    });
  };

  const handleAddBudgetArea = async () => {
    if (!newAreaName.trim() || !projectId || !user) return;
    await createBudgetArea.mutateAsync({
      project_id: projectId,
      area_name: newAreaName.trim(),
      budgeted_amount: null,
      actual_amount: null,
      sort_order: (budgetAreas?.length || 0) + 1,
      userId: user.id,
    });
    setNewAreaName('');
  };

  const handleUpdateBudgetArea = async (area: ProjectBudgetArea, field: 'budgeted_amount' | 'actual_amount' | 'area_name', value: string) => {
    if (!projectId || !user) return;

    if (field === 'area_name') {
      if (!value.trim()) return;
      await updateBudgetArea.mutateAsync({
        id: area.id,
        project_id: projectId,
        area_name: value.trim(),
        userId: user.id,
      });
      setEditingAreaNameId(null);
    } else {
      const numValue = value ? parseFloat(value) : null;
      await updateBudgetArea.mutateAsync({
        id: area.id,
        project_id: projectId,
        [field]: numValue,
        userId: user.id,
      });
      setEditingAreaId(null);
    }
  };

  const handleDeleteArea = async (areaId: string) => {
    const area = budgetAreas?.find((a) => a.id === areaId);
    if (!area || !user || !projectId) return;

    await deleteBudgetArea.mutateAsync({
      id: areaId,
      project_id: projectId,
      userId: user.id,
      areaData: area,
    });
    setDeleteConfirmId(null);
  };

  const handleMoveArea = async (areaId: string, direction: 'up' | 'down') => {
    if (!budgetAreas || !projectId) return;

    const currentIndex = budgetAreas.findIndex((a) => a.id === areaId);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= budgetAreas.length) return;

    const newOrder = [...budgetAreas];
    [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];

    await reorderBudgetAreas.mutateAsync({
      project_id: projectId,
      orderedIds: newOrder.map((a) => a.id),
    });
  };

  const hasQuotes = groupedQuotes && Object.keys(groupedQuotes).length > 0;

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link to="/projects" className="text-sm text-primary-600 hover:text-primary-700 mb-2 inline-block">
          &larr; Back to Projects
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
            Tasks ({allRfis?.length || 0})
          </Tabs.Trigger>
          <Tabs.Trigger
            value="quotes"
            className="px-4 py-2 text-sm font-medium text-text-secondary border-b-2 border-transparent data-[state=active]:text-primary-600 data-[state=active]:border-primary-600 whitespace-nowrap"
          >
            Quotes ({groupedQuotes ? Object.values(groupedQuotes).flat().length : 0})
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
          {/* Status filter */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {TASK_STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setTaskStatusFilter(filter.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  taskStatusFilter === filter.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-text-secondary border border-border hover:border-gray-300'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {rfisLoading && <SkeletonList count={3} />}
          {!rfisLoading && sortedWarRoomItems.length === 0 && (
            <EmptyState
              icon="clipboard"
              title="No tasks yet"
              description="Add your first task for this project."
              actionLabel="Add Task"
              onAction={() => openQuickEntryWithProject('rfi')}
            />
          )}
          {!rfisLoading && sortedWarRoomItems.length > 0 && (
            <div className="space-y-3">
              {sortedWarRoomItems.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </Tabs.Content>

        {/* Quotes Tab */}
        <Tabs.Content value="quotes">
          {quotesLoading && <SkeletonList count={3} />}
          {!quotesLoading && !hasQuotes && (
            <EmptyState
              icon="dollar"
              title="No quotes yet"
              description="Log your first quote for this project."
              actionLabel="Log Quote"
              onAction={() => openQuickEntryWithProject('quote')}
            />
          )}
          {!quotesLoading && hasQuotes && (
            <div className="space-y-6">
              {Object.entries(groupedQuotes).map(([tradeName, quotes]) => (
                <div key={tradeName} className="bg-white rounded-lg border border-border overflow-hidden">
                  {/* Trade header */}
                  <div className="bg-gray-50 px-4 py-3 border-b border-border">
                    <h3 className="font-medium text-text-primary">{tradeName}</h3>
                    <p className="text-sm text-text-secondary">
                      {quotes.length} quote{quotes.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Quote rows */}
                  <div className="divide-y divide-border">
                    {quotes.map((quote) => (
                      <div
                        key={quote.id}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
                        onClick={() => openQuoteDrawer(quote.id)}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-text-primary truncate">
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
                                  quote.budget_variance_percent > 0 ? 'text-red-600' : 'text-green-600'
                                }`}
                              >
                                {quote.budget_variance_percent > 0 ? '+' : ''}
                                {quote.budget_variance_percent}%
                              </div>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickStatusCycle(quote.id, quote.status);
                            }}
                            className={`text-xs px-2 py-1 rounded whitespace-nowrap transition-colors hover:opacity-80 ${
                              QUOTE_STATUS_CONFIG[quote.status]?.color || 'text-gray-600 bg-gray-100'
                            }`}
                            title="Tap to change status"
                          >
                            {QUOTE_STATUS_CONFIG[quote.status]?.label || quote.status}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Tabs.Content>

        {/* Budget Tab */}
        <Tabs.Content value="budget">
          {budgetLoading && <SkeletonList count={3} />}
          {!budgetLoading && (
            <div className="bg-white rounded-lg border border-border overflow-hidden">
              {/* Budget table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Area</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Budgeted</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Actual</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Variance</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">%</th>
                      <th className="px-2 py-3 text-center text-xs font-medium text-text-secondary uppercase w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {budgetAreas && budgetAreas.length > 0 ? (
                      budgetAreas.map((area, index) => {
                        const variance = (area.actual_amount || 0) - (area.budgeted_amount || 0);
                        const variancePercent = area.budgeted_amount
                          ? ((variance / area.budgeted_amount) * 100)
                          : 0;
                        return (
                          <tr key={area.id} className="hover:bg-gray-50">
                            {/* Area name - editable */}
                            <td className="px-4 py-3 text-sm">
                              {editingAreaNameId === area.id ? (
                                <input
                                  type="text"
                                  defaultValue={area.area_name}
                                  onBlur={(e) => handleUpdateBudgetArea(area, 'area_name', e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateBudgetArea(area, 'area_name', (e.target as HTMLInputElement).value)}
                                  className="w-full px-2 py-1 border border-border rounded text-sm"
                                  autoFocus
                                />
                              ) : (
                                <button
                                  onClick={() => setEditingAreaNameId(area.id)}
                                  className="text-text-primary hover:text-primary-600 text-left"
                                >
                                  {area.area_name}
                                </button>
                              )}
                            </td>
                            {/* Budgeted amount */}
                            <td className="px-4 py-3 text-sm text-right">
                              {editingAreaId === `${area.id}-budget` ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  defaultValue={area.budgeted_amount || ''}
                                  onBlur={(e) => handleUpdateBudgetArea(area, 'budgeted_amount', e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateBudgetArea(area, 'budgeted_amount', (e.target as HTMLInputElement).value)}
                                  className="w-24 px-2 py-1 text-right border border-border rounded text-sm"
                                  autoFocus
                                />
                              ) : (
                                <button
                                  onClick={() => setEditingAreaId(`${area.id}-budget`)}
                                  className="text-text-primary hover:text-primary-600"
                                >
                                  {formatCurrency(area.budgeted_amount)}
                                </button>
                              )}
                            </td>
                            {/* Actual amount */}
                            <td className="px-4 py-3 text-sm text-right">
                              {editingAreaId === `${area.id}-actual` ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  defaultValue={area.actual_amount || ''}
                                  onBlur={(e) => handleUpdateBudgetArea(area, 'actual_amount', e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateBudgetArea(area, 'actual_amount', (e.target as HTMLInputElement).value)}
                                  className="w-24 px-2 py-1 text-right border border-border rounded text-sm"
                                  autoFocus
                                />
                              ) : (
                                <button
                                  onClick={() => setEditingAreaId(`${area.id}-actual`)}
                                  className="text-text-primary hover:text-primary-600"
                                >
                                  {formatCurrency(area.actual_amount)}
                                </button>
                              )}
                            </td>
                            {/* Variance $ */}
                            <td className={`px-4 py-3 text-sm text-right font-medium ${
                              variance > 0 ? 'text-red-600' : variance < 0 ? 'text-green-600' : 'text-text-secondary'
                            }`}>
                              {area.budgeted_amount ? (
                                <>
                                  {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                                </>
                              ) : '—'}
                            </td>
                            {/* Variance % */}
                            <td className={`px-4 py-3 text-sm text-right ${
                              variancePercent > 0 ? 'text-red-600' : variancePercent < 0 ? 'text-green-600' : 'text-text-secondary'
                            }`}>
                              {area.budgeted_amount ? (
                                <>
                                  {variancePercent > 0 ? '+' : ''}{variancePercent.toFixed(1)}%
                                </>
                              ) : '—'}
                            </td>
                            {/* Actions */}
                            <td className="px-2 py-3 text-sm">
                              <div className="flex items-center justify-center gap-1">
                                {/* Move up */}
                                <button
                                  onClick={() => handleMoveArea(area.id, 'up')}
                                  disabled={index === 0}
                                  className="p-1 text-text-secondary hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Move up"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                </button>
                                {/* Move down */}
                                <button
                                  onClick={() => handleMoveArea(area.id, 'down')}
                                  disabled={index === budgetAreas.length - 1}
                                  className="p-1 text-text-secondary hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Move down"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                                {/* Delete */}
                                <button
                                  onClick={() => setDeleteConfirmId(area.id)}
                                  className="p-1 text-text-secondary hover:text-red-600"
                                  title="Delete area"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-text-secondary text-sm">
                          No budget areas yet. Add one below.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {/* Totals row */}
                  {budgetAreas && budgetAreas.length > 0 && (
                    <tfoot className="bg-gray-50 border-t border-border">
                      <tr>
                        <td className="px-4 py-3 text-sm font-semibold text-text-primary">Total</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold">{formatCurrency(budgetTotals.budgeted)}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold">{formatCurrency(budgetTotals.actual)}</td>
                        <td className={`px-4 py-3 text-sm text-right font-semibold ${
                          totalVariance > 0 ? 'text-red-600' : totalVariance < 0 ? 'text-green-600' : 'text-text-secondary'
                        }`}>
                          {totalVariance > 0 ? '+' : ''}{formatCurrency(totalVariance)}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-semibold ${
                          totalVariance > 0 ? 'text-red-600' : totalVariance < 0 ? 'text-green-600' : 'text-text-secondary'
                        }`}>
                          {budgetTotals.budgeted ? (
                            <>
                              {totalVariance > 0 ? '+' : ''}{((totalVariance / budgetTotals.budgeted) * 100).toFixed(1)}%
                            </>
                          ) : '—'}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Add new area */}
              <div className="px-4 py-3 border-t border-border flex gap-2">
                <input
                  type="text"
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  placeholder="Add area (e.g., Kitchen, Master Bath)"
                  className="flex-1 px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddBudgetArea()}
                />
                <button
                  onClick={handleAddBudgetArea}
                  disabled={!newAreaName.trim() || createBudgetArea.isPending}
                  className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {createBudgetArea.isPending ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>
          )}

          {/* Delete confirmation dialog */}
          {deleteConfirmId && (
            <DeleteConfirmDialog
              title="Delete Budget Area"
              message={`Are you sure you want to delete "${budgetAreas?.find((a) => a.id === deleteConfirmId)?.area_name}"? This cannot be undone.`}
              onConfirm={() => handleDeleteArea(deleteConfirmId)}
              onCancel={() => setDeleteConfirmId(null)}
              isDeleting={deleteBudgetArea.isPending}
            />
          )}
        </Tabs.Content>

        {/* Activity Tab */}
        <Tabs.Content value="activity">
          {activityLoading && <SkeletonList count={5} />}
          {!activityLoading && (!activity || activity.length === 0) && (
            <EmptyState
              icon="scroll"
              title="No activity yet"
              description="Activity will appear here as you make changes to this project."
            />
          )}
          {!activityLoading && activity && activity.length > 0 && (
            <div className="bg-white rounded-lg border border-border divide-y divide-border">
              {activity.map((item) => (
                <div key={item.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          item.type === 'rfi_status' ? 'bg-blue-500' : 'bg-green-500'
                        }`} />
                        <span className="text-sm font-medium text-text-primary">
                          {item.description}
                        </span>
                      </div>
                      {item.detail && (
                        <p className="text-sm text-text-secondary mt-1 ml-4">
                          {item.detail}
                        </p>
                      )}
                      {item.note && (
                        <p className="text-sm text-text-secondary mt-1 ml-4 italic">
                          "{item.note}"
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-text-secondary whitespace-nowrap">
                      {formatDate(item.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Tabs.Content>
      </Tabs.Root>

      {/* Quote Detail Drawer */}
      <QuoteDetailDrawer />
    </div>
  );
}
