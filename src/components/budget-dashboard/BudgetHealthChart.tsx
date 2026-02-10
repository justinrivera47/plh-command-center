import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { BudgetAreaData, ProjectBudgetData } from '../../hooks/useBudgetDashboard';

interface BudgetHealthChartProps {
  data: BudgetAreaData[] | ProjectBudgetData[];
  totalBudget: number;
}

export function BudgetHealthChart({ data, totalBudget }: BudgetHealthChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        No budget data available
      </div>
    );
  }

  // Transform data for chart - add color coding for actual
  const chartData = data.map((item) => {
    const name = 'areaName' in item ? item.areaName : item.projectName;
    const isOverBudget = item.actual > item.budgeted;
    return {
      name: name.length > 15 ? name.slice(0, 15) + '...' : name,
      fullName: name,
      Budgeted: item.budgeted,
      Actual: item.actual,
      Remaining: item.remaining,
      isOverBudget,
    };
  });

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0]?.payload;
    const variance = data.Actual - data.Budgeted;
    const variancePercent = data.Budgeted > 0
      ? ((variance / data.Budgeted) * 100).toFixed(1)
      : '0';

    return (
      <div className="bg-white border border-border rounded-lg shadow-lg p-3">
        <p className="font-medium text-text-primary mb-2">{data.fullName}</p>
        <div className="space-y-1 text-sm">
          <p>
            <span className="text-gray-500">Budgeted:</span>{' '}
            <span className="font-medium">{formatCurrency(data.Budgeted)}</span>
          </p>
          <p>
            <span className="text-gray-500">Actual:</span>{' '}
            <span className={`font-medium ${data.isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(data.Actual)}
            </span>
          </p>
          <p>
            <span className="text-gray-500">Remaining:</span>{' '}
            <span className="font-medium">{formatCurrency(data.Remaining)}</span>
          </p>
          <p className={`font-medium ${variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {variance > 0 ? '+' : ''}{formatCurrency(variance)} ({variancePercent}%)
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
          />
          <YAxis
            tickFormatter={formatCurrency}
            tick={{ fontSize: 12, fill: '#6b7280' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: 20 }} />

          {/* Reference line for total budget ceiling */}
          {totalBudget > 0 && (
            <ReferenceLine
              y={totalBudget / data.length}
              stroke="#6366f1"
              strokeDasharray="5 5"
              label={{
                value: `Avg: ${formatCurrency(totalBudget / data.length)}`,
                position: 'right',
                fill: '#6366f1',
                fontSize: 11,
              }}
            />
          )}

          <Bar
            dataKey="Budgeted"
            fill="#94a3b8"
            name="Budgeted"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="Actual"
            fill="#22c55e"
            name="Actual/Committed"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="Remaining"
            fill="#e2e8f0"
            name="Remaining"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
