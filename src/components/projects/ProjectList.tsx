import { useState, useMemo } from 'react';
import { useProjects } from '../../hooks/useProjects';
import { useBudgetTotalsByProject } from '../../hooks/useBudgetLineItems';
import { ProjectCard } from './ProjectCard';
import { EmptyState } from '../shared/EmptyState';
import { SkeletonList } from '../shared/SkeletonCard';
import { useUIStore } from '../../stores/uiStore';
import type { ProjectStatus, Project } from '../../lib/types';

const FILTER_TABS: { value: ProjectStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
];

type SortOption = 'date_newest' | 'date_oldest' | 'alpha_az' | 'alpha_za' | 'status';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'date_newest', label: 'Newest First' },
  { value: 'date_oldest', label: 'Oldest First' },
  { value: 'alpha_az', label: 'A → Z' },
  { value: 'alpha_za', label: 'Z → A' },
  { value: 'status', label: 'By Status' },
];

const STATUS_ORDER: Record<ProjectStatus, number> = {
  active: 1,
  on_hold: 2,
  completed: 3,
  archived: 4,
};

export function ProjectList() {
  const { data: projects, isLoading, error } = useProjects();
  const { data: budgetTotalsByProject } = useBudgetTotalsByProject();
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('active');
  const [sortBy, setSortBy] = useState<SortOption>('date_newest');
  const openQuickEntry = useUIStore((state) => state.openQuickEntry);

  const filteredAndSortedProjects = useMemo(() => {
    if (!projects) return [];

    // Filter first
    const filtered = projects.filter((project) => {
      if (statusFilter === 'all') return project.status !== 'archived';
      return project.status === statusFilter;
    });

    // Then sort
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date_newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'date_oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'alpha_az':
          return a.name.localeCompare(b.name);
        case 'alpha_za':
          return b.name.localeCompare(a.name);
        case 'status':
          return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        default:
          return 0;
      }
    });
  }, [projects, statusFilter, sortBy]);

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Projects</h1>
      </div>

      {/* Filter tabs and sort */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === tab.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-text-secondary border border-border hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-secondary">Sort:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-1.5 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {SORT_OPTIONS.map((option) => (
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
          Failed to load projects. Please try again.
        </div>
      )}

      {/* Loading state */}
      {isLoading && <SkeletonList count={4} />}

      {/* Empty state */}
      {!isLoading && filteredAndSortedProjects && filteredAndSortedProjects.length === 0 && (
        statusFilter === 'all' || !projects || projects.length === 0 ? (
          <EmptyState
            icon="📁"
            title="No projects yet"
            description="Add your first project to get started tracking tasks and quotes."
            actionLabel="Add Project"
            onAction={() => openQuickEntry('project')}
          />
        ) : (
          <EmptyState
            icon="📁"
            title={`No ${statusFilter === 'active' ? 'active' : statusFilter === 'on_hold' ? 'on hold' : 'completed'} projects`}
            description={`You don't have any projects with "${FILTER_TABS.find(t => t.value === statusFilter)?.label}" status.`}
            actionLabel="View All Projects"
            onAction={() => setStatusFilter('all')}
          />
        )
      )}

      {/* Project list */}
      {!isLoading && filteredAndSortedProjects && filteredAndSortedProjects.length > 0 && (
        <div className="space-y-3">
          {filteredAndSortedProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              budgetTotals={budgetTotalsByProject?.[project.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
