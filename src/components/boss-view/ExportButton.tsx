import { useState } from 'react';
import { toast } from 'sonner';
import { useExportData, type ExportData } from '../../hooks/useExportData';

// Lazy load xlsx library - it's ~800KB and only needed when exporting
type XLSXType = typeof import('xlsx-js-style');
let XLSX: XLSXType | null = null;

// ============================================
// Style Definitions
// ============================================

const STYLES = {
  header: {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '2D3748' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } },
    },
  },
  currency: {
    numFmt: '"$"#,##0',
  },
  currencyDecimal: {
    numFmt: '"$"#,##0.00',
  },
  percent: {
    numFmt: '0.0%',
  },
  percentPlain: {
    numFmt: '0.0"%"',
  },
  variancePositive: {
    font: { color: { rgb: 'DC2626' } },
    numFmt: '"$"#,##0',
  },
  varianceNegative: {
    font: { color: { rgb: '16A34A' } },
    numFmt: '"$"#,##0',
  },
  subtotalRow: {
    font: { bold: true },
    fill: { fgColor: { rgb: 'E5E7EB' } },
  },
  projectTotalRow: {
    font: { bold: true },
    fill: { fgColor: { rgb: 'D1D5DB' } },
  },
  healthOnTrack: {
    font: { color: { rgb: '16A34A' } },
  },
  healthAtRisk: {
    font: { color: { rgb: 'D97706' } },
  },
  healthBlocked: {
    font: { color: { rgb: 'DC2626' }, bold: true },
  },
  approved: {
    font: { bold: true, color: { rgb: '16A34A' } },
  },
  titleCell: {
    font: { bold: true, sz: 14 },
  },
  dateCell: {
    font: { italic: true, color: { rgb: '6B7280' } },
  },
};

// ============================================
// Export Button Component
// ============================================

export function ExportButton() {
  const { refetch, isLoading } = useExportData();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      // Lazy load xlsx library if not already loaded
      if (!XLSX) {
        XLSX = await import('xlsx-js-style');
      }

      // Refetch to get latest data
      const { data } = await refetch();
      if (!data) {
        toast.error('Failed to load export data');
        return;
      }

      generateExcel(XLSX, data);
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isLoading || isExporting}
      className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
    >
      {isExporting ? (
        <>
          <span className="animate-spin">⏳</span>
          <span>Generating...</span>
        </>
      ) : (
        <>
          <span>📊</span>
          <span>Export to Excel</span>
        </>
      )}
    </button>
  );
}

// ============================================
// Excel Generation
// ============================================

function generateExcel(xlsx: XLSXType, data: ExportData) {
  const wb = xlsx.utils.book_new();
  const reportDate = data.generatedAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Sheet 1: Executive Summary
  createExecutiveSummarySheet(xlsx, wb, data, reportDate);

  // Sheet 2: Budget Detail
  createBudgetDetailSheet(xlsx, wb, data, reportDate);

  // Sheet 3: Open Tasks
  createOpenTasksSheet(xlsx, wb, data, reportDate);

  // Sheet 4: Quote Comparison
  createQuoteComparisonSheet(xlsx, wb, data, reportDate);

  // Sheet 5: Recent Activity
  createRecentActivitySheet(xlsx, wb, data, reportDate);

  // Sheet 6: Decisions Needed
  createDecisionsNeededSheet(xlsx, wb, data, reportDate);

  // Generate filename and save
  const dateStr = data.generatedAt.toISOString().split('T')[0];
  xlsx.writeFile(wb, `PLH-Executive-Report-${dateStr}.xlsx`);
}

// ============================================
// Sheet 1: Executive Summary
// ============================================

function createExecutiveSummarySheet(xlsx: XLSXType, wb: ReturnType<XLSXType['utils']['book_new']>, data: ExportData, reportDate: string) {
  const headers = [
    'Project Name',
    'Client',
    'Status',
    'Health',
    'Total Budget',
    'Total Committed',
    'Variance',
    'Variance %',
    'Open Tasks',
    'Overdue',
    'Blocking',
    'Decisions Needed',
  ];

  const rows = data.executiveSummary.map(project => [
    project.projectName,
    project.clientName,
    project.status,
    project.health,
    project.totalBudgeted,
    project.totalActual,
    project.variance,
    project.variancePercent !== null ? project.variancePercent / 100 : null,
    project.openTasks,
    project.overdueItems,
    project.blockingItems,
    project.decisionsNeeded,
  ]);

  // Add title rows
  const sheetData = [
    ['PLH Command Center - Executive Summary'],
    [`Generated: ${reportDate}`],
    [],
    headers,
    ...rows,
  ];

  const ws = xlsx.utils.aoa_to_sheet(sheetData);

  // Set column widths
  ws['!cols'] = [
    { wch: 30 }, // Project Name
    { wch: 20 }, // Client
    { wch: 12 }, // Status
    { wch: 12 }, // Health
    { wch: 15 }, // Total Budget
    { wch: 15 }, // Total Committed
    { wch: 15 }, // Variance
    { wch: 12 }, // Variance %
    { wch: 12 }, // Open Tasks
    { wch: 10 }, // Overdue
    { wch: 10 }, // Blocking
    { wch: 18 }, // Decisions Needed
  ];

  // Style title
  ws['A1'].s = STYLES.titleCell;
  ws['A2'].s = STYLES.dateCell;

  // Style headers (row 4)
  for (let col = 0; col < headers.length; col++) {
    const cellRef = xlsx.utils.encode_cell({ r: 3, c: col });
    if (ws[cellRef]) {
      ws[cellRef].s = STYLES.header;
    }
  }

  // Style data rows
  for (let row = 4; row < sheetData.length; row++) {
    const rowData = data.executiveSummary[row - 4];
    if (!rowData) continue;

    // Health column (D)
    const healthCell = xlsx.utils.encode_cell({ r: row, c: 3 });
    if (ws[healthCell]) {
      ws[healthCell].s = rowData.health === 'On Track'
        ? STYLES.healthOnTrack
        : rowData.health === 'At Risk'
          ? STYLES.healthAtRisk
          : STYLES.healthBlocked;
    }

    // Currency columns (E, F, G)
    [4, 5, 6].forEach(col => {
      const cellRef = xlsx.utils.encode_cell({ r: row, c: col });
      if (ws[cellRef]) {
        if (col === 6) {
          // Variance column - color coded
          ws[cellRef].s = (ws[cellRef].v || 0) > 0 ? STYLES.variancePositive : STYLES.varianceNegative;
        } else {
          ws[cellRef].s = STYLES.currency;
        }
      }
    });

    // Percentage column (H)
    const pctCell = xlsx.utils.encode_cell({ r: row, c: 7 });
    if (ws[pctCell] && ws[pctCell].v !== null) {
      ws[pctCell].s = STYLES.percent;
    }
  }

  // Freeze panes (freeze after row 4 - header row)
  ws['!freeze'] = { xSplit: 0, ySplit: 4 };

  xlsx.utils.book_append_sheet(wb, ws, 'Executive Summary');
}

// ============================================
// Sheet 2: Budget Detail
// ============================================

function createBudgetDetailSheet(xlsx: XLSXType, wb: ReturnType<XLSXType['utils']['book_new']>, data: ExportData, reportDate: string) {
  const headers = ['Project', 'Budget Area', 'Line Item', 'Budgeted', 'Actual', 'Variance', 'Variance %'];

  const rows = data.budgetDetail.map(item => [
    item.projectName,
    item.areaName,
    item.itemName,
    item.budgeted,
    item.actual,
    item.variance,
    item.variancePercent !== null ? item.variancePercent / 100 : null,
  ]);

  const sheetData = [
    ['PLH Command Center - Budget Detail'],
    [`Generated: ${reportDate}`],
    [],
    headers,
    ...rows,
  ];

  const ws = xlsx.utils.aoa_to_sheet(sheetData);

  ws['!cols'] = [
    { wch: 30 }, // Project
    { wch: 25 }, // Budget Area
    { wch: 35 }, // Line Item
    { wch: 15 }, // Budgeted
    { wch: 15 }, // Actual
    { wch: 15 }, // Variance
    { wch: 12 }, // Variance %
  ];

  // Style title
  ws['A1'].s = STYLES.titleCell;
  ws['A2'].s = STYLES.dateCell;

  // Style headers
  for (let col = 0; col < headers.length; col++) {
    const cellRef = xlsx.utils.encode_cell({ r: 3, c: col });
    if (ws[cellRef]) {
      ws[cellRef].s = STYLES.header;
    }
  }

  // Style data rows
  for (let row = 4; row < sheetData.length; row++) {
    const rowData = data.budgetDetail[row - 4];
    if (!rowData) continue;

    // Apply subtotal/total row styling
    if (rowData.isProjectTotal) {
      for (let col = 0; col < headers.length; col++) {
        const cellRef = xlsx.utils.encode_cell({ r: row, c: col });
        if (ws[cellRef]) {
          ws[cellRef].s = { ...STYLES.projectTotalRow, ...(col >= 3 ? STYLES.currency : {}) };
        }
      }
    } else if (rowData.isAreaSubtotal) {
      for (let col = 0; col < headers.length; col++) {
        const cellRef = xlsx.utils.encode_cell({ r: row, c: col });
        if (ws[cellRef]) {
          ws[cellRef].s = { ...STYLES.subtotalRow, ...(col >= 3 ? STYLES.currency : {}) };
        }
      }
    } else {
      // Regular rows - style currency and variance
      [3, 4].forEach(col => {
        const cellRef = xlsx.utils.encode_cell({ r: row, c: col });
        if (ws[cellRef]) {
          ws[cellRef].s = STYLES.currency;
        }
      });

      // Variance column with color
      const varCell = xlsx.utils.encode_cell({ r: row, c: 5 });
      if (ws[varCell]) {
        ws[varCell].s = (ws[varCell].v || 0) > 0 ? STYLES.variancePositive : STYLES.varianceNegative;
      }

      // Variance % column
      const pctCell = xlsx.utils.encode_cell({ r: row, c: 6 });
      if (ws[pctCell] && ws[pctCell].v !== null) {
        ws[pctCell].s = STYLES.percent;
      }
    }
  }

  ws['!freeze'] = { xSplit: 0, ySplit: 4 };

  xlsx.utils.book_append_sheet(wb, ws, 'Budget Detail');
}

// ============================================
// Sheet 3: Open Tasks
// ============================================

function createOpenTasksSheet(xlsx: XLSXType, wb: ReturnType<XLSXType['utils']['book_new']>, data: ExportData, reportDate: string) {
  const headers = [
    'Project',
    'Task',
    'Priority',
    'Status',
    'Contact',
    'Days Since Contact',
    'Follow-Up Date',
    'Blocking',
    'Latest Update',
  ];

  const rows = data.openTasks.map(task => [
    task.projectName,
    task.task,
    task.priority,
    task.status,
    task.pocName,
    task.daysSinceContact,
    task.followUpDate,
    task.isBlocking ? 'YES' : '',
    task.latestUpdate,
  ]);

  const sheetData = [
    ['PLH Command Center - Open Tasks'],
    [`Generated: ${reportDate}`],
    [],
    headers,
    ...rows,
  ];

  const ws = xlsx.utils.aoa_to_sheet(sheetData);

  ws['!cols'] = [
    { wch: 25 }, // Project
    { wch: 40 }, // Task
    { wch: 10 }, // Priority
    { wch: 20 }, // Status
    { wch: 20 }, // Contact
    { wch: 18 }, // Days Since Contact
    { wch: 15 }, // Follow-Up Date
    { wch: 10 }, // Blocking
    { wch: 40 }, // Latest Update
  ];

  ws['A1'].s = STYLES.titleCell;
  ws['A2'].s = STYLES.dateCell;

  for (let col = 0; col < headers.length; col++) {
    const cellRef = xlsx.utils.encode_cell({ r: 3, c: col });
    if (ws[cellRef]) {
      ws[cellRef].s = STYLES.header;
    }
  }

  // Style blocking cells
  for (let row = 4; row < sheetData.length; row++) {
    const blockingCell = xlsx.utils.encode_cell({ r: row, c: 7 });
    if (ws[blockingCell] && ws[blockingCell].v === 'YES') {
      ws[blockingCell].s = STYLES.healthBlocked;
    }
  }

  ws['!freeze'] = { xSplit: 0, ySplit: 4 };

  xlsx.utils.book_append_sheet(wb, ws, 'Open Tasks');
}

// ============================================
// Sheet 4: Quote Comparison
// ============================================

function createQuoteComparisonSheet(xlsx: XLSXType, wb: ReturnType<XLSXType['utils']['book_new']>, data: ExportData, reportDate: string) {
  const headers = [
    'Project',
    'Trade',
    'Vendor',
    'Budget Allowance',
    'Quoted Price',
    'Variance',
    'Variance %',
    'Status',
  ];

  const rows = data.quoteComparison.map(quote => [
    quote.projectName,
    quote.tradeName,
    quote.vendorName,
    quote.budgetAllowance,
    quote.quotedPrice,
    quote.variance,
    quote.variancePercent !== null ? quote.variancePercent / 100 : null,
    quote.status,
  ]);

  const sheetData = [
    ['PLH Command Center - Quote Comparison'],
    [`Generated: ${reportDate}`],
    [],
    headers,
    ...rows,
  ];

  const ws = xlsx.utils.aoa_to_sheet(sheetData);

  ws['!cols'] = [
    { wch: 25 }, // Project
    { wch: 25 }, // Trade
    { wch: 25 }, // Vendor
    { wch: 18 }, // Budget Allowance
    { wch: 15 }, // Quoted Price
    { wch: 15 }, // Variance
    { wch: 12 }, // Variance %
    { wch: 15 }, // Status
  ];

  ws['A1'].s = STYLES.titleCell;
  ws['A2'].s = STYLES.dateCell;

  for (let col = 0; col < headers.length; col++) {
    const cellRef = xlsx.utils.encode_cell({ r: 3, c: col });
    if (ws[cellRef]) {
      ws[cellRef].s = STYLES.header;
    }
  }

  // Style data rows
  for (let row = 4; row < sheetData.length; row++) {
    const rowData = data.quoteComparison[row - 4];
    if (!rowData) continue;

    // Currency columns
    [3, 4].forEach(col => {
      const cellRef = xlsx.utils.encode_cell({ r: row, c: col });
      if (ws[cellRef]) {
        ws[cellRef].s = STYLES.currency;
      }
    });

    // Variance column
    const varCell = xlsx.utils.encode_cell({ r: row, c: 5 });
    if (ws[varCell] && ws[varCell].v !== null) {
      ws[varCell].s = (ws[varCell].v || 0) > 0 ? STYLES.variancePositive : STYLES.varianceNegative;
    }

    // Variance % column
    const pctCell = xlsx.utils.encode_cell({ r: row, c: 6 });
    if (ws[pctCell] && ws[pctCell].v !== null) {
      ws[pctCell].s = STYLES.percent;
    }

    // Status column - highlight approved
    const statusCell = xlsx.utils.encode_cell({ r: row, c: 7 });
    if (ws[statusCell] && rowData.isApproved) {
      ws[statusCell].s = STYLES.approved;
    }
  }

  ws['!freeze'] = { xSplit: 0, ySplit: 4 };

  xlsx.utils.book_append_sheet(wb, ws, 'Quote Comparison');
}

// ============================================
// Sheet 5: Recent Activity
// ============================================

function createRecentActivitySheet(xlsx: XLSXType, wb: ReturnType<XLSXType['utils']['book_new']>, data: ExportData, reportDate: string) {
  const headers = ['Date', 'Time', 'Project', 'Action', 'Detail'];

  const rows = data.recentActivity.map(activity => [
    activity.date,
    activity.time,
    activity.projectName,
    activity.action,
    activity.detail,
  ]);

  const sheetData = [
    ['PLH Command Center - Recent Activity (14 Days)'],
    [`Generated: ${reportDate}`],
    [],
    headers,
    ...rows,
  ];

  const ws = xlsx.utils.aoa_to_sheet(sheetData);

  ws['!cols'] = [
    { wch: 12 }, // Date
    { wch: 10 }, // Time
    { wch: 25 }, // Project
    { wch: 25 }, // Action
    { wch: 50 }, // Detail
  ];

  ws['A1'].s = STYLES.titleCell;
  ws['A2'].s = STYLES.dateCell;

  for (let col = 0; col < headers.length; col++) {
    const cellRef = xlsx.utils.encode_cell({ r: 3, c: col });
    if (ws[cellRef]) {
      ws[cellRef].s = STYLES.header;
    }
  }

  ws['!freeze'] = { xSplit: 0, ySplit: 4 };

  xlsx.utils.book_append_sheet(wb, ws, 'Recent Activity');
}

// ============================================
// Sheet 6: Decisions Needed
// ============================================

function createDecisionsNeededSheet(xlsx: XLSXType, wb: ReturnType<XLSXType['utils']['book_new']>, data: ExportData, reportDate: string) {
  const headers = ['Project', 'Item', 'Type', 'Detail', 'Amount', 'Days Waiting'];

  const rows = data.decisionsNeeded.map(decision => [
    decision.projectName,
    decision.item,
    decision.type,
    decision.detail,
    decision.amount,
    decision.daysWaiting,
  ]);

  const sheetData = [
    ['PLH Command Center - Decisions Needed'],
    [`Generated: ${reportDate}`],
    [],
    headers,
    ...rows,
  ];

  const ws = xlsx.utils.aoa_to_sheet(sheetData);

  ws['!cols'] = [
    { wch: 25 }, // Project
    { wch: 35 }, // Item
    { wch: 12 }, // Type
    { wch: 40 }, // Detail
    { wch: 15 }, // Amount
    { wch: 15 }, // Days Waiting
  ];

  ws['A1'].s = STYLES.titleCell;
  ws['A2'].s = STYLES.dateCell;

  for (let col = 0; col < headers.length; col++) {
    const cellRef = xlsx.utils.encode_cell({ r: 3, c: col });
    if (ws[cellRef]) {
      ws[cellRef].s = STYLES.header;
    }
  }

  // Style amount column
  for (let row = 4; row < sheetData.length; row++) {
    const amountCell = xlsx.utils.encode_cell({ r: row, c: 4 });
    if (ws[amountCell] && ws[amountCell].v !== null) {
      ws[amountCell].s = STYLES.currency;
    }
  }

  ws['!freeze'] = { xSplit: 0, ySplit: 4 };

  xlsx.utils.book_append_sheet(wb, ws, 'Decisions Needed');
}
