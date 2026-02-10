import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Project } from '../../lib/types';
import { useProjectRFICounts } from '../../hooks/useRFIs';
import { useOpenRFIs } from '../../hooks/useRFIs';
import { PriorityBadge } from '../shared/PriorityBadge';
import { StatusBadge } from '../shared/StatusBadge';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { data: counts } = useProjectRFICounts(project.id);
  const { data: rfis } = useOpenRFIs(project.id);

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg border border-border overflow-hidden">
      {/* Card Header - Always visible */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link
                to={`/projects/${project.id}`}
                onClick={(e) => e.stopPropagation()}
                className="font-semibold text-text-primary hover:text-primary-600 truncate"
              >
                {project.name}
              </Link>
            </div>
            <div className="text-sm text-text-secondary mt-1">
              {project.client_name || 'No client'}
            </div>
            {project.total_budget && (
              <div className="text-sm text-text-secondary">
                Budget: {formatCurrency(project.total_budget)}
              </div>
            )}
          </div>

          {/* Badge counts */}
          <div className="flex items-center gap-2 ml-4">
            {counts?.blocking && counts.blocking > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                {counts.blocking} blocking
              </span>
            )}
            {counts?.overdue && counts.overdue > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                {counts.overdue} overdue
              </span>
            )}
            {counts?.onMe && counts.onMe > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                {counts.onMe} on me
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              {counts?.total || 0} open
            </span>
            <button className="p-1 text-text-secondary">
              {expanded ? '▲' : '▼'}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Content - Open RFIs */}
      {expanded && rfis && rfis.length > 0 && (
        <div className="border-t border-border bg-gray-50">
          <div className="divide-y divide-border">
            {rfis.slice(0, 5).map((rfi) => (
              <div key={rfi.id} className="px-4 py-2 flex items-center gap-3">
                <PriorityBadge priority={rfi.priority} />
                <span className="flex-1 text-sm text-text-primary truncate">
                  {rfi.task}
                </span>
                {rfi.poc_name && (
                  <span className="text-xs text-text-secondary">{rfi.poc_name}</span>
                )}
                <StatusBadge status={rfi.status} size="sm" />
              </div>
            ))}
            {rfis.length > 5 && (
              <div className="px-4 py-2 text-center">
                <Link
                  to={`/projects/${project.id}`}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  View all {rfis.length} tasks →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {expanded && (!rfis || rfis.length === 0) && (
        <div className="border-t border-border bg-gray-50 p-4 text-center text-sm text-text-secondary">
          No open tasks for this project
        </div>
      )}
    </div>
  );
}
