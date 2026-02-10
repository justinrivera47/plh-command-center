import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { TradeQuoteData } from '../../hooks/useBudgetDashboard';

interface QuoteComparisonChartProps {
  data: TradeQuoteData[];
}

export function QuoteComparisonChart({ data }: QuoteComparisonChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        No quote data available
      </div>
    );
  }

  // Transform data for horizontal bar chart
  const chartData = data.map((item) => ({
    name: item.tradeName.length > 20 ? item.tradeName.slice(0, 20) + '...' : item.tradeName,
    fullName: item.tradeName,
    Budget: item.budgetAllowance,
    'Lowest Quote': item.lowestQuote || 0,
    'Approved Quote': item.approvedQuote || 0,
    isLowestUnder: item.isLowestUnderBudget,
    isApprovedOver: item.isApprovedOverBudget,
    quoteCount: item.quoteCount,
    hasLowest: item.lowestQuote !== null,
    hasApproved: item.approvedQuote !== null,
  }));

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
    const lowestVariance = data.hasLowest && data.Budget > 0
      ? ((data['Lowest Quote'] - data.Budget) / data.Budget * 100).toFixed(1)
      : null;
    const approvedVariance = data.hasApproved && data.Budget > 0
      ? ((data['Approved Quote'] - data.Budget) / data.Budget * 100).toFixed(1)
      : null;

    return (
      <div className="bg-white border border-border rounded-lg shadow-lg p-3">
        <p className="font-medium text-text-primary mb-2">{data.fullName}</p>
        <div className="space-y-1 text-sm">
          <p>
            <span className="text-gray-500">Budget:</span>{' '}
            <span className="font-medium">{formatCurrency(data.Budget)}</span>
          </p>
          {data.hasLowest && (
            <p>
              <span className="text-gray-500">Lowest Quote:</span>{' '}
              <span className={`font-medium ${data.isLowestUnder ? 'text-green-600' : 'text-amber-600'}`}>
                {formatCurrency(data['Lowest Quote'])}
                {lowestVariance && ` (${Number(lowestVariance) > 0 ? '+' : ''}${lowestVariance}%)`}
              </span>
            </p>
          )}
          {data.hasApproved && (
            <p>
              <span className="text-gray-500">Approved:</span>{' '}
              <span className={`font-medium ${data.isApprovedOver ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(data['Approved Quote'])}
                {approvedVariance && ` (${Number(approvedVariance) > 0 ? '+' : ''}${approvedVariance}%)`}
              </span>
            </p>
          )}
          <p className="text-gray-400 text-xs">
            {data.quoteCount} quote{data.quoteCount !== 1 ? 's' : ''} received
          </p>
        </div>
      </div>
    );
  };

  // Calculate dynamic height based on number of trades
  const chartHeight = Math.max(300, data.length * 50 + 100);

  return (
    <div style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={formatCurrency}
            tick={{ fontSize: 12, fill: '#6b7280' }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            width={90}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          <Bar
            dataKey="Budget"
            fill="#94a3b8"
            name="Budget Allowance"
            radius={[0, 4, 4, 0]}
            barSize={16}
          />
          <Bar
            dataKey="Lowest Quote"
            name="Lowest Quote"
            radius={[0, 4, 4, 0]}
            barSize={16}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`lowest-${index}`}
                fill={entry.hasLowest ? (entry.isLowestUnder ? '#22c55e' : '#f59e0b') : 'transparent'}
              />
            ))}
          </Bar>
          <Bar
            dataKey="Approved Quote"
            name="Approved Quote"
            radius={[0, 4, 4, 0]}
            barSize={16}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`approved-${index}`}
                fill={entry.hasApproved ? (entry.isApprovedOver ? '#ef4444' : '#6366f1') : 'transparent'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
