import { useState } from 'react';
import { useBudgetDashboard } from '../../hooks/useBudgetDashboard';
import { BudgetHealthChart } from './BudgetHealthChart';
import { QuoteComparisonChart } from './QuoteComparisonChart';
import { SkeletonList } from '../shared/SkeletonCard';

export function BudgetDashboard() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { data, isLoading, error } = useBudgetDashboard(selectedProjectId);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (error) {
    return (
      <div className="px-4 py-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          Failed to load budget data. Please try again.
        </div>
      </div>
    );
  }

  const isAllProjects = selectedProjectId === null;
  const selectedProject = data?.projects.find(p => p.id === selectedProjectId);

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Budget Dashboard</h1>
          <p className="text-sm text-text-secondary">
            Financial overview {selectedProject ? `for ${selectedProject.name}` : 'across all projects'}
          </p>
        </div>
      </div>

      {/* Project Selector */}
      <div className="mb-6">
        <label htmlFor="project-select" className="block text-sm font-medium text-text-secondary mb-2">
          Select Project
        </label>
        <select
          id="project-select"
          value={selectedProjectId || ''}
          onChange={(e) => setSelectedProjectId(e.target.value || null)}
          className="w-full md:w-64 px-3 py-2 border border-border rounded-lg bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">All Projects</option>
          {data?.projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <SkeletonList count={3} />}

      {data && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard
              label="Total Budgeted"
              value={formatCurrency(data.totalBudgeted)}
              icon="📊"
              color="bg-blue-50 text-blue-700"
            />
            <StatCard
              label="Total Committed"
              value={formatCurrency(data.totalCommitted)}
              icon="💵"
              color="bg-gray-50 text-gray-700"
            />
            <StatCard
              label="Variance"
              value={`${data.totalVariance > 0 ? '+' : ''}${formatCurrency(data.totalVariance)}`}
              icon={data.totalVariance > 0 ? '📈' : '📉'}
              color={data.totalVariance > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}
              alert={data.totalVariance > 0}
            />
            <StatCard
              label="Trades Quoted"
              value={`${data.tradesWithQuotes}/${data.totalTrades}`}
              subValue={`${data.percentQuoted}%`}
              icon="📝"
              color="bg-amber-50 text-amber-700"
            />
          </div>

          {/* Budget Health Overview */}
          <div className="bg-white rounded-lg border border-border p-4 mb-6">
            <h2 className="font-medium text-text-primary mb-4">
              Budget Health Overview
              <span className="text-sm font-normal text-text-secondary ml-2">
                {isAllProjects ? '(by project)' : '(by budget area)'}
              </span>
            </h2>
            <BudgetHealthChart
              data={isAllProjects ? data.budgetByProject : data.budgetByArea}
              totalBudget={data.totalBudgeted}
            />
            <p className="text-xs text-text-secondary mt-4 text-center">
              {isAllProjects
                ? 'Select a project to see budget breakdown by area'
                : 'Showing budget breakdown by area for selected project'}
            </p>
          </div>

          {/* Quote Comparison by Trade */}
          <div className="bg-white rounded-lg border border-border p-4">
            <h2 className="font-medium text-text-primary mb-4">
              Quoted vs Budget by Trade
              <span className="text-sm font-normal text-text-secondary ml-2">
                ({data.quotesByTrade.length} trades)
              </span>
            </h2>
            <QuoteComparisonChart data={data.quotesByTrade} />
            <div className="flex flex-wrap gap-4 mt-4 text-xs text-text-secondary justify-center">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-gray-400"></span>
                <span>Budget Allowance</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-green-500"></span>
                <span>Under Budget</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-amber-500"></span>
                <span>At/Near Budget</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-red-500"></span>
                <span>Over Budget</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-indigo-500"></span>
                <span>Approved (Under)</span>
              </div>
            </div>
          </div>

          {/* Empty state if no data */}
          {data.budgetByProject.length === 0 && data.quotesByTrade.length === 0 && (
            <div className="text-center py-12 text-text-secondary">
              <div className="text-4xl mb-4">📊</div>
              <p className="font-medium">No budget data yet</p>
              <p className="text-sm mt-1">
                Add budget areas and line items to projects to see financial data here.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon: string;
  color: string;
  alert?: boolean;
}

function StatCard({ label, value, subValue, icon, color, alert }: StatCardProps) {
  return (
    <div className={`rounded-lg p-4 ${color} ${alert ? 'ring-2 ring-offset-1 ring-current' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <div>
          <span className="text-xl font-semibold">{value}</span>
          {subValue && <span className="text-sm ml-1 opacity-75">{subValue}</span>}
        </div>
      </div>
      <p className="text-sm mt-1">{label}</p>
    </div>
  );
}
