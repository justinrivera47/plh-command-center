import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Project } from '../../lib/types';
import type { ProjectBudgetTotals } from '../../hooks/useBudgetLineItems';
import { useProjectRFICounts } from '../../hooks/useRFIs';
import { useOpenRFIs } from '../../hooks/useRFIs';
import { PriorityBadge } from '../shared/PriorityBadge';
import { StatusBadge } from '../shared/StatusBadge';

interface ProjectCardProps {
  project: Project;
  budgetTotals?: ProjectBudgetTotals;
}

export function ProjectCard({ project, budgetTotals }: ProjectCardProps) {
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
            {budgetTotals && (budgetTotals.totalBudgeted > 0 || budgetTotals.totalActual > 0) && (
              <div className="text-sm text-text-secondary">
                Budget: {formatCurrency(budgetTotals.totalBudgeted)} | Actual: {formatCurrency(budgetTotals.totalActual)}
              </div>
            )}
          </div>

          {/* Badge counts */}
          <div className="flex items-center gap-2 ml-4">
            {counts && counts.blocking > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                {counts.blocking} blocking
              </span>
            )}
            {counts && counts.overdue > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                {counts.overdue} overdue
              </span>
            )}
            {counts && counts.onMe > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                {counts.onMe} on me
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              {counts?.total ?? 0} open
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
            {/* Sort: blocking tasks first, then by priority */}
            {[...rfis]
              .sort((a, b) => {
                // Blocking tasks first
                if (a.is_blocking && !b.is_blocking) return -1;
                if (!a.is_blocking && b.is_blocking) return 1;
                // Then by priority
                const priorityOrder = { P1: 0, P2: 1, P3: 2 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
              })
              .slice(0, 5)
              .map((rfi) => (
                <div
                  key={rfi.id}
                  className={`px-4 py-2 flex items-center gap-3 ${
                    rfi.is_blocking ? 'bg-red-50 border-l-2 border-l-red-500' : ''
                  }`}
                >
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
          </div>
          {/* View Full Project link */}
          <div className="px-4 py-3 border-t border-border">
            <Link
              to={`/projects/${project.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              View Full Project →
            </Link>
          </div>
        </div>
      )}

      {expanded && (!rfis || rfis.length === 0) && (
        <div className="border-t border-border bg-gray-50">
          <div className="p-4 text-center text-sm text-text-secondary">
            No open tasks for this project
          </div>
          <div className="px-4 py-3 border-t border-border">
            <Link
              to={`/projects/${project.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              View Full Project →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
