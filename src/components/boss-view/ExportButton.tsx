import * as XLSX from 'xlsx';
import type { Project, WarRoomItem, QuoteComparison } from '../../lib/types';
import type { ProjectBudgetTotals } from '../../hooks/useBudgetLineItems';

interface ExportButtonProps {
  projects: Project[] | undefined;
  tasks: WarRoomItem[] | undefined;
  quotes: QuoteComparison[] | undefined;
  budgetTotalsByProject?: Record<string, ProjectBudgetTotals>;
}

export function ExportButton({ projects, tasks, quotes, budgetTotalsByProject }: ExportButtonProps) {
  const handleExport = () => {
    // Create workbook
    const wb = XLSX.utils.book_new();

    // Projects sheet
    if (projects && projects.length > 0) {
      const projectsData = projects.map((p) => {
        const budgetTotals = budgetTotalsByProject?.[p.id];
        return {
          'Project Name': p.name,
          'Client': p.client_name || '',
          'Address': p.address || '',
          'Status': p.status,
          'Total Budgeted': budgetTotals?.totalBudgeted || 0,
          'Total Actual': budgetTotals?.totalActual || 0,
          'Variance': budgetTotals?.variance || 0,
        };
      });
      const projectsSheet = XLSX.utils.json_to_sheet(projectsData);
      XLSX.utils.book_append_sheet(wb, projectsSheet, 'Projects');
    }

    // Tasks sheet
    if (tasks && tasks.length > 0) {
      const tasksData = tasks.map((t) => ({
        'Project': t.project_name,
        'Task': t.task,
        'Status': t.status,
        'Priority': t.priority,
        'POC': t.poc_name || '',
        'Is Blocking': t.is_blocking ? 'Yes' : 'No',
        'Blocks Description': t.blocks_description || '',
        'Days Since Contact': t.days_since_contact ?? '',
        'Is Overdue': t.is_overdue ? 'Yes' : 'No',
        'Latest Update': t.latest_update || '',
      }));
      const tasksSheet = XLSX.utils.json_to_sheet(tasksData);
      XLSX.utils.book_append_sheet(wb, tasksSheet, 'Open Tasks');
    }

    // Quotes sheet
    if (quotes && quotes.length > 0) {
      const quotesData = quotes.map((q) => ({
        'Project': q.project_name,
        'Trade': q.trade_name || '',
        'Vendor': q.vendor_name || '',
        'Quoted Price': q.quoted_price || '',
        'Budget Amount': q.budget_amount || '',
        'Variance %': q.budget_variance_percent !== null ? `${q.budget_variance_percent}%` : '',
        'Status': q.status,
      }));
      const quotesSheet = XLSX.utils.json_to_sheet(quotesData);
      XLSX.utils.book_append_sheet(wb, quotesSheet, 'Quotes');
    }

    // Calculate budget totals from line items
    const budgetTotalsArray = Object.values(budgetTotalsByProject || {});
    const totalBudgeted = budgetTotalsArray.reduce((sum, t) => sum + t.totalBudgeted, 0);
    const totalActual = budgetTotalsArray.reduce((sum, t) => sum + t.totalActual, 0);

    // Summary sheet
    const summaryData = [
      { 'Metric': 'Active Projects', 'Value': projects?.length || 0 },
      { 'Metric': 'Open Tasks', 'Value': tasks?.length || 0 },
      { 'Metric': 'Blocking Tasks', 'Value': tasks?.filter((t) => t.is_blocking).length || 0 },
      { 'Metric': 'Overdue Tasks', 'Value': tasks?.filter((t) => t.is_overdue).length || 0 },
      { 'Metric': 'Tasks Waiting on Me', 'Value': tasks?.filter((t) => t.status === 'waiting_on_me').length || 0 },
      { 'Metric': 'Total Quotes', 'Value': quotes?.length || 0 },
      {
        'Metric': 'Total Budgeted',
        'Value': formatCurrency(totalBudgeted),
      },
      {
        'Metric': 'Total Actual',
        'Value': formatCurrency(totalActual),
      },
      {
        'Metric': 'Budget Variance',
        'Value': formatCurrency(totalActual - totalBudgeted),
      },
      {
        'Metric': 'Total Quoted',
        'Value': formatCurrency(quotes?.reduce((sum, q) => sum + (q.quoted_price || 0), 0) || 0),
      },
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

    // Blocking tasks detail sheet
    const blockingTasks = tasks?.filter((t) => t.is_blocking) || [];
    if (blockingTasks.length > 0) {
      const blockingData = blockingTasks.map((t) => ({
        'Project': t.project_name,
        'Task': t.task,
        'Impact': t.blocks_description || 'Not specified',
        'POC': t.poc_name || '',
        'Status': t.status,
        'Days Waiting': t.days_since_contact ?? 'N/A',
      }));
      const blockingSheet = XLSX.utils.json_to_sheet(blockingData);
      XLSX.utils.book_append_sheet(wb, blockingSheet, 'Blocking Issues');
    }

    // Generate filename with date
    const date = new Date().toISOString().split('T')[0];
    const filename = `PLH-Report-${date}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
    >
      <span>📊</span>
      <span>Export to Excel</span>
    </button>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}
