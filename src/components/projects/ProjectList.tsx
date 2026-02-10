import { useState } from 'react';
import { useProjects } from '../../hooks/useProjects';
import { ProjectCard } from './ProjectCard';
import { EmptyState } from '../shared/EmptyState';
import { SkeletonList } from '../shared/SkeletonCard';
import { useUIStore } from '../../stores/uiStore';
import type { ProjectStatus } from '../../lib/types';

const FILTER_TABS: { value: ProjectStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
];

export function ProjectList() {
  const { data: projects, isLoading, error } = useProjects();
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('active');
  const openQuickEntry = useUIStore((state) => state.openQuickEntry);

  const filteredProjects = projects?.filter((project) => {
    if (statusFilter === 'all') return project.status !== 'archived';
    return project.status === statusFilter;
  });

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Projects</h1>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
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

      {/* Error state */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
          Failed to load projects. Please try again.
        </div>
      )}

      {/* Loading state */}
      {isLoading && <SkeletonList count={4} />}

      {/* Empty state */}
      {!isLoading && filteredProjects && filteredProjects.length === 0 && (
        <EmptyState
          icon="📁"
          title="No projects yet"
          description="Add your first project to get started tracking tasks and quotes."
          actionLabel="Add Project"
          onAction={() => openQuickEntry('rfi')}
        />
      )}

      {/* Project list */}
      {!isLoading && filteredProjects && filteredProjects.length > 0 && (
        <div className="space-y-3">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
