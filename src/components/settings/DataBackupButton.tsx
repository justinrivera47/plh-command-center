import { useState } from 'react';
import { toast } from 'sonner';
import { useDataBackup, type BackupData } from '../../hooks/useDataBackup';

// Lazy load xlsx library
type XLSXType = typeof import('xlsx-js-style');

export function DataBackupButton() {
  const { refetch, isLoading } = useDataBackup();
  const [isExporting, setIsExporting] = useState(false);

  const handleBackup = async () => {
    setIsExporting(true);

    try {
      // Lazy load xlsx
      const xlsx: XLSXType = await import('xlsx-js-style');

      // Fetch all data
      const { data } = await refetch();
      if (!data) {
        toast.error('Failed to load data for backup');
        return;
      }

      generateBackupExcel(xlsx, data);
      toast.success('Data backup downloaded successfully!');
    } catch (error) {
      console.error('Backup failed:', error);
      toast.error('Backup failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleBackup}
      disabled={isLoading || isExporting}
      className="w-full py-3 px-4 border border-border rounded-lg hover:border-primary-300 hover:bg-primary-50 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{isExporting ? '⏳' : '💾'}</span>
        <div>
          <span className="font-medium text-text-primary block">
            {isExporting ? 'Creating Backup...' : 'Backup All Data'}
          </span>
          <span className="text-sm text-text-secondary">
            Download all projects, tasks, quotes & vendors as Excel
          </span>
        </div>
      </div>
    </button>
  );
}

function generateBackupExcel(xlsx: XLSXType, data: BackupData) {
  const wb = xlsx.utils.book_new();
  const dateStr = data.exportedAt.toISOString().split('T')[0];
  const timeStr = data.exportedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '2563EB' } },
    alignment: { horizontal: 'center' },
  };

  // Sheet 1: Projects
  const projectsData = [
    ['PLH Command Center - Data Backup'],
    [`Exported: ${dateStr} at ${timeStr}`],
    [],
    ['Project Name', 'Client Name', 'Client Email', 'Client Phone', 'Address', 'Status', 'Total Budget', 'Notes', 'Created'],
    ...data.projects.map(p => [
      p.name,
      p.clientName,
      p.clientEmail,
      p.clientPhone,
      p.address,
      p.status,
      p.totalBudget,
      p.notes,
      new Date(p.createdAt).toLocaleDateString(),
    ]),
  ];
  const wsProjects = xlsx.utils.aoa_to_sheet(projectsData);
  wsProjects['!cols'] = [
    { wch: 30 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 12 }, { wch: 15 }, { wch: 40 }, { wch: 12 },
  ];
  // Style header row
  for (let col = 0; col < 9; col++) {
    const cell = xlsx.utils.encode_cell({ r: 3, c: col });
    if (wsProjects[cell]) wsProjects[cell].s = headerStyle;
  }
  xlsx.utils.book_append_sheet(wb, wsProjects, 'Projects');

  // Sheet 2: Tasks/RFIs
  const tasksData = [
    ['PLH Command Center - Tasks/RFIs'],
    [`Exported: ${dateStr} at ${timeStr}`],
    [],
    ['Project', 'Task', 'Scope', 'Status', 'Priority', 'Contact Type', 'Contact Name', 'Latest Update', 'Blocking', 'Complete', 'Next Action', 'Notes', 'Created'],
    ...data.tasks.map(t => [
      t.projectName,
      t.task,
      t.scope,
      t.status,
      t.priority,
      t.pocType,
      t.pocName,
      t.latestUpdate,
      t.isBlocking ? 'Yes' : 'No',
      t.isComplete ? 'Yes' : 'No',
      t.nextActionDate,
      t.notes,
      new Date(t.createdAt).toLocaleDateString(),
    ]),
  ];
  const wsTasks = xlsx.utils.aoa_to_sheet(tasksData);
  wsTasks['!cols'] = [
    { wch: 25 }, { wch: 40 }, { wch: 40 }, { wch: 20 }, { wch: 10 }, { wch: 15 }, { wch: 20 }, { wch: 40 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 40 }, { wch: 12 },
  ];
  for (let col = 0; col < 13; col++) {
    const cell = xlsx.utils.encode_cell({ r: 3, c: col });
    if (wsTasks[cell]) wsTasks[cell].s = headerStyle;
  }
  xlsx.utils.book_append_sheet(wb, wsTasks, 'Tasks');

  // Sheet 3: Quotes
  const quotesData = [
    ['PLH Command Center - Quotes'],
    [`Exported: ${dateStr} at ${timeStr}`],
    [],
    ['Project', 'Trade', 'Vendor', 'Vendor Contact', 'Status', 'Budget Amount', 'Quoted Price', 'Variance', 'Scope Notes', 'Availability', 'Notes', 'Created'],
    ...data.quotes.map(q => [
      q.projectName,
      q.tradeName,
      q.vendorName,
      q.vendorContact,
      q.status,
      q.budgetAmount,
      q.quotedPrice,
      q.budgetAmount && q.quotedPrice ? q.quotedPrice - q.budgetAmount : null,
      q.scopeNotes,
      q.availability,
      q.notes,
      new Date(q.createdAt).toLocaleDateString(),
    ]),
  ];
  const wsQuotes = xlsx.utils.aoa_to_sheet(quotesData);
  wsQuotes['!cols'] = [
    { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 40 }, { wch: 20 }, { wch: 40 }, { wch: 12 },
  ];
  for (let col = 0; col < 12; col++) {
    const cell = xlsx.utils.encode_cell({ r: 3, c: col });
    if (wsQuotes[cell]) wsQuotes[cell].s = headerStyle;
  }
  xlsx.utils.book_append_sheet(wb, wsQuotes, 'Quotes');

  // Sheet 4: Vendors
  const vendorsData = [
    ['PLH Command Center - Vendors'],
    [`Exported: ${dateStr} at ${timeStr}`],
    [],
    ['Company Name', 'Contact Name', 'Phone', 'Email', 'Website', 'License #', 'Quality Rating', 'Communication', 'Trades', 'Status', 'Notes', 'Created'],
    ...data.vendors.map(v => [
      v.companyName,
      v.contactName,
      v.phone,
      v.email,
      v.website,
      v.licenseNumber,
      v.qualityRating,
      v.communicationRating,
      v.trades,
      v.status,
      v.notes,
      new Date(v.createdAt).toLocaleDateString(),
    ]),
  ];
  const wsVendors = xlsx.utils.aoa_to_sheet(vendorsData);
  wsVendors['!cols'] = [
    { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 10 }, { wch: 40 }, { wch: 12 },
  ];
  for (let col = 0; col < 12; col++) {
    const cell = xlsx.utils.encode_cell({ r: 3, c: col });
    if (wsVendors[cell]) wsVendors[cell].s = headerStyle;
  }
  xlsx.utils.book_append_sheet(wb, wsVendors, 'Vendors');

  // Sheet 5: Budget Line Items
  const budgetData = [
    ['PLH Command Center - Budget Details'],
    [`Exported: ${dateStr} at ${timeStr}`],
    [],
    ['Project', 'Budget Area', 'Line Item', 'Budgeted Amount', 'Actual Amount', 'Variance', 'Notes'],
    ...data.budgetLineItems.map(li => [
      li.projectName,
      li.areaName,
      li.itemName,
      li.budgetedAmount,
      li.actualAmount,
      li.budgetedAmount && li.actualAmount ? li.actualAmount - li.budgetedAmount : null,
      li.notes,
    ]),
  ];
  const wsBudget = xlsx.utils.aoa_to_sheet(budgetData);
  wsBudget['!cols'] = [
    { wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 40 },
  ];
  for (let col = 0; col < 7; col++) {
    const cell = xlsx.utils.encode_cell({ r: 3, c: col });
    if (wsBudget[cell]) wsBudget[cell].s = headerStyle;
  }
  xlsx.utils.book_append_sheet(wb, wsBudget, 'Budget Details');

  // Summary sheet
  const summaryData = [
    ['PLH Command Center - Backup Summary'],
    [`Exported: ${dateStr} at ${timeStr}`],
    [],
    ['Data Type', 'Count'],
    ['Projects', data.projects.length],
    ['Tasks/RFIs', data.tasks.length],
    ['Quotes', data.quotes.length],
    ['Vendors', data.vendors.length],
    ['Budget Areas', data.budgetAreas.length],
    ['Budget Line Items', data.budgetLineItems.length],
    [],
    ['This backup contains all your data from PLH Command Center.'],
    ['Keep this file in a safe place for your records.'],
  ];
  const wsSummary = xlsx.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 25 }, { wch: 15 }];
  for (let col = 0; col < 2; col++) {
    const cell = xlsx.utils.encode_cell({ r: 3, c: col });
    if (wsSummary[cell]) wsSummary[cell].s = headerStyle;
  }
  // Insert summary at beginning
  wb.SheetNames.unshift('Summary');
  wb.Sheets['Summary'] = wsSummary;

  // Save file
  xlsx.writeFile(wb, `PLH-Data-Backup-${dateStr}.xlsx`);
}
