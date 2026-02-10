import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Project, WarRoomItem, QuoteComparison, ProjectBudgetArea, BudgetLineItem } from '../lib/types';

// ============================================
// Types for Export Data
// ============================================

export interface ProjectHealth {
  projectId: string;
  projectName: string;
  clientName: string;
  status: string;
  health: 'On Track' | 'At Risk' | 'Blocked';
  totalBudgeted: number;
  totalActual: number;
  variance: number;
  variancePercent: number | null;
  openTasks: number;
  overdueItems: number;
  blockingItems: number;
  decisionsNeeded: number;
}

export interface BudgetDetailRow {
  projectName: string;
  areaName: string;
  itemName: string;
  budgeted: number;
  actual: number;
  variance: number;
  variancePercent: number | null;
  isAreaSubtotal?: boolean;
  isProjectTotal?: boolean;
}

export interface OpenTaskRow {
  projectName: string;
  task: string;
  priority: string;
  status: string;
  pocName: string;
  daysSinceContact: number | null;
  followUpDate: string | null;
  isBlocking: boolean;
  latestUpdate: string;
}

export interface QuoteRow {
  projectName: string;
  tradeName: string;
  vendorName: string;
  budgetAllowance: number | null;
  quotedPrice: number | null;
  variance: number | null;
  variancePercent: number | null;
  status: string;
  isApproved: boolean;
}

export interface ActivityRow {
  date: string;
  time: string;
  projectName: string;
  action: string;
  detail: string;
}

export interface DecisionRow {
  projectName: string;
  item: string;
  type: string;
  detail: string;
  amount: number | null;
  daysWaiting: number;
}

export interface ExportData {
  generatedAt: Date;
  executiveSummary: ProjectHealth[];
  budgetDetail: BudgetDetailRow[];
  openTasks: OpenTaskRow[];
  quoteComparison: QuoteRow[];
  recentActivity: ActivityRow[];
  decisionsNeeded: DecisionRow[];
}

// ============================================
// Main Export Data Hook
// ============================================

export function useExportData() {
  return useQuery({
    queryKey: ['export-data'],
    queryFn: async (): Promise<ExportData> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch all data in parallel, filtered by user
      const [
        { data: projects },
        { data: tasks },
        { data: quotes },
        { data: budgetAreas },
        { data: lineItems },
        { data: changeLog },
        { data: rfiActivity },
      ] = await Promise.all([
        supabase
          .from('projects')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['active', 'on_hold'])
          .order('name'),
        supabase
          .from('war_room_view')
          .select('*')
          .eq('user_id', user.id)
          .order('priority'),
        supabase
          .from('quote_comparison')
          .select('*')
          .eq('user_id', user.id)
          .order('project_name'),
        supabase
          .from('project_budget_areas')
          .select('*')
          .order('sort_order'),
        supabase
          .from('budget_line_items')
          .select('*')
          .order('sort_order'),
        supabase
          .from('change_log')
          .select('*')
          .eq('changed_by', user.id)
          .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false }),
        supabase
          .from('rfi_activity_log')
          .select(`
            id,
            rfi_id,
            previous_status,
            new_status,
            note,
            created_at,
            rfis!inner(project_id, task, user_id)
          `)
          .eq('rfis.user_id', user.id)
          .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false }),
      ]);

      const allProjects = (projects || []) as Project[];
      const allTasks = (tasks || []) as WarRoomItem[];
      const allQuotes = (quotes || []) as QuoteComparison[];
      const allBudgetAreas = (budgetAreas || []) as ProjectBudgetArea[];
      const allLineItems = (lineItems || []) as BudgetLineItem[];

      // Build lookup maps
      const projectMap = new Map(allProjects.map(p => [p.id, p]));
      const areasByProject = new Map<string, ProjectBudgetArea[]>();
      allBudgetAreas.forEach(area => {
        const existing = areasByProject.get(area.project_id) || [];
        areasByProject.set(area.project_id, [...existing, area]);
      });

      const lineItemsByArea = new Map<string, BudgetLineItem[]>();
      allLineItems.forEach(item => {
        const existing = lineItemsByArea.get(item.budget_area_id) || [];
        lineItemsByArea.set(item.budget_area_id, [...existing, item]);
      });

      // ============================================
      // Sheet 1: Executive Summary
      // ============================================
      const executiveSummary: ProjectHealth[] = allProjects.map(project => {
        const projectTasks = allTasks.filter(t => t.project_id === project.id);
        const projectQuotes = allQuotes.filter(q => q.project_id === project.id);
        const projectAreas = areasByProject.get(project.id) || [];

        // Calculate budget totals
        let totalBudgeted = 0;
        let totalActual = 0;
        projectAreas.forEach(area => {
          const items = lineItemsByArea.get(area.id) || [];
          items.forEach(item => {
            totalBudgeted += item.budgeted_amount || 0;
            totalActual += item.actual_amount || 0;
          });
        });

        const variance = totalActual - totalBudgeted;
        const variancePercent = totalBudgeted > 0 ? (variance / totalBudgeted) * 100 : null;

        // Calculate task metrics
        const openTasks = projectTasks.filter(t => t.status !== 'completed' && t.status !== 'dead').length;
        const overdueItems = projectTasks.filter(t => t.is_overdue).length;
        const blockingItems = projectTasks.filter(t => t.is_blocking).length;

        // Calculate decisions needed
        const decisionsNeeded = projectQuotes.filter(q =>
          q.status === 'quoted' || (q.budget_variance && q.budget_variance > 0)
        ).length;

        // Determine health status
        let health: 'On Track' | 'At Risk' | 'Blocked' = 'On Track';
        if (blockingItems > 0) {
          health = 'Blocked';
        } else if (overdueItems > 2 || variancePercent !== null && variancePercent > 10) {
          health = 'At Risk';
        }

        return {
          projectId: project.id,
          projectName: project.name,
          clientName: project.client_name || '',
          status: project.status,
          health,
          totalBudgeted,
          totalActual,
          variance,
          variancePercent,
          openTasks,
          overdueItems,
          blockingItems,
          decisionsNeeded,
        };
      });

      // ============================================
      // Sheet 2: Budget Detail
      // ============================================
      const budgetDetail: BudgetDetailRow[] = [];

      allProjects.forEach(project => {
        const projectAreas = areasByProject.get(project.id) || [];
        let projectBudgeted = 0;
        let projectActual = 0;

        projectAreas.forEach(area => {
          const items = lineItemsByArea.get(area.id) || [];
          let areaBudgeted = 0;
          let areaActual = 0;

          // Add line items
          items.forEach(item => {
            const budgeted = item.budgeted_amount || 0;
            const actual = item.actual_amount || 0;
            const variance = actual - budgeted;
            const variancePercent = budgeted > 0 ? (variance / budgeted) * 100 : null;

            budgetDetail.push({
              projectName: project.name,
              areaName: area.area_name,
              itemName: item.item_name,
              budgeted,
              actual,
              variance,
              variancePercent,
            });

            areaBudgeted += budgeted;
            areaActual += actual;
          });

          // Add area subtotal
          if (items.length > 0) {
            budgetDetail.push({
              projectName: project.name,
              areaName: area.area_name,
              itemName: `${area.area_name} Subtotal`,
              budgeted: areaBudgeted,
              actual: areaActual,
              variance: areaActual - areaBudgeted,
              variancePercent: areaBudgeted > 0 ? ((areaActual - areaBudgeted) / areaBudgeted) * 100 : null,
              isAreaSubtotal: true,
            });
          }

          projectBudgeted += areaBudgeted;
          projectActual += areaActual;
        });

        // Add project total
        if (projectAreas.length > 0) {
          budgetDetail.push({
            projectName: project.name,
            areaName: '',
            itemName: `${project.name} TOTAL`,
            budgeted: projectBudgeted,
            actual: projectActual,
            variance: projectActual - projectBudgeted,
            variancePercent: projectBudgeted > 0 ? ((projectActual - projectBudgeted) / projectBudgeted) * 100 : null,
            isProjectTotal: true,
          });
        }
      });

      // ============================================
      // Sheet 3: Open Tasks
      // ============================================
      const openTasks: OpenTaskRow[] = allTasks
        .filter(t => t.status !== 'completed' && t.status !== 'dead')
        .sort((a, b) => {
          // Sort by priority first (P1 > P2 > P3)
          const priorityOrder = { P1: 0, P2: 1, P3: 2 };
          const priorityDiff = (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) -
                              (priorityOrder[b.priority as keyof typeof priorityOrder] || 2);
          if (priorityDiff !== 0) return priorityDiff;
          // Then by days waiting (descending)
          return (b.days_since_contact || 0) - (a.days_since_contact || 0);
        })
        .map(task => ({
          projectName: task.project_name,
          task: task.task,
          priority: task.priority,
          status: formatStatus(task.status),
          pocName: task.poc_name || '',
          daysSinceContact: task.days_since_contact,
          followUpDate: task.next_action_date,
          isBlocking: task.is_blocking,
          latestUpdate: task.latest_update || '',
        }));

      // ============================================
      // Sheet 4: Quote Comparison
      // ============================================
      const quoteComparison: QuoteRow[] = allQuotes
        .sort((a, b) => {
          // Sort by project first, then trade
          const projectCompare = a.project_name.localeCompare(b.project_name);
          if (projectCompare !== 0) return projectCompare;
          return (a.trade_name || '').localeCompare(b.trade_name || '');
        })
        .map(quote => {
          const budgetAllowance = quote.budget_amount;
          const quotedPrice = quote.quoted_price;
          const variance = budgetAllowance && quotedPrice ? quotedPrice - budgetAllowance : null;
          const variancePercent = budgetAllowance && variance ? (variance / budgetAllowance) * 100 : null;
          const isApproved = ['approved', 'signed', 'contract_sent', 'in_progress', 'completed'].includes(quote.status);

          return {
            projectName: quote.project_name,
            tradeName: quote.trade_name || '',
            vendorName: quote.vendor_name || '',
            budgetAllowance,
            quotedPrice,
            variance,
            variancePercent,
            status: formatQuoteStatus(quote.status),
            isApproved,
          };
        });

      // ============================================
      // Sheet 5: Recent Activity (14 days)
      // ============================================
      const recentActivity: ActivityRow[] = [];

      // Process change_log entries
      (changeLog || []).forEach((change: Record<string, unknown>) => {
        const createdAt = new Date(change.created_at as string);
        let projectName = 'Unknown Project';

        // Try to find project name
        if (change.record_type === 'project') {
          const project = projectMap.get(change.record_id as string);
          projectName = project?.name || 'Unknown Project';
        } else {
          // For other record types, we'd need additional lookups
          // For now, use note or generic description
          projectName = 'See Detail';
        }

        recentActivity.push({
          date: createdAt.toLocaleDateString('en-US'),
          time: createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          projectName,
          action: formatChangeAction(change.record_type as string, change.field_name as string),
          detail: (change.note as string) || `${change.old_value || ''} → ${change.new_value || ''}`,
        });
      });

      // Process RFI activity
      (rfiActivity || []).forEach((item: Record<string, unknown>) => {
        const createdAt = new Date(item.created_at as string);
        const rfiData = item.rfis as { project_id: string; task: string } | null;
        const project = rfiData ? projectMap.get(rfiData.project_id) : null;

        recentActivity.push({
          date: createdAt.toLocaleDateString('en-US'),
          time: createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          projectName: project?.name || 'Unknown Project',
          action: 'Task Status Change',
          detail: `${rfiData?.task || 'Task'}: ${item.previous_status || 'new'} → ${item.new_status}`,
        });
      });

      // Sort by date/time descending
      recentActivity.sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time}`);
        const dateB = new Date(`${b.date} ${b.time}`);
        return dateB.getTime() - dateA.getTime();
      });

      // ============================================
      // Sheet 6: Decisions Needed
      // ============================================
      const decisionsNeeded: DecisionRow[] = [];
      const now = new Date();

      // Add pending quotes
      allQuotes
        .filter(q => q.status === 'quoted')
        .forEach(quote => {
          const createdAt = new Date(quote.created_at);
          const daysWaiting = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

          decisionsNeeded.push({
            projectName: quote.project_name,
            item: `${quote.trade_name || 'Quote'} from ${quote.vendor_name || 'vendor'}`,
            type: 'Approval',
            detail: 'Quote awaiting approval',
            amount: quote.quoted_price,
            daysWaiting,
          });
        });

      // Add over-budget items
      allQuotes
        .filter(q => q.budget_variance && q.budget_variance > 0 && q.status !== 'quoted')
        .forEach(quote => {
          const createdAt = new Date(quote.created_at);
          const daysWaiting = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

          decisionsNeeded.push({
            projectName: quote.project_name,
            item: `${quote.trade_name || 'Item'} over budget`,
            type: 'Decision',
            detail: `Over budget by $${quote.budget_variance?.toLocaleString()}`,
            amount: quote.budget_variance,
            daysWaiting,
          });
        });

      // Add blocking tasks as decisions
      allTasks
        .filter(t => t.is_blocking)
        .forEach(task => {
          const lastContact = task.last_contacted_at ? new Date(task.last_contacted_at) : new Date(task.created_at);
          const daysWaiting = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));

          decisionsNeeded.push({
            projectName: task.project_name,
            item: task.task,
            type: 'Blocker',
            detail: task.blocks_description || 'Blocking other work',
            amount: null,
            daysWaiting,
          });
        });

      // Sort by days waiting descending
      decisionsNeeded.sort((a, b) => b.daysWaiting - a.daysWaiting);

      return {
        generatedAt: new Date(),
        executiveSummary,
        budgetDetail,
        openTasks,
        quoteComparison,
        recentActivity,
        decisionsNeeded,
      };
    },
    staleTime: 0, // Always fetch fresh data for export
  });
}

// ============================================
// Helper Functions
// ============================================

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    open: 'Open',
    waiting_on_client: 'Waiting on Client',
    waiting_on_vendor: 'Waiting on Vendor',
    waiting_on_contractor: 'Waiting on Contractor',
    waiting_on_me: 'Waiting on Me',
    follow_up: 'Follow Up',
    completed: 'Completed',
    dead: 'Dead',
  };
  return statusMap[status] || status;
}

function formatQuoteStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Pending',
    quoted: 'Quoted',
    approved: 'Approved',
    declined: 'Declined',
    contract_sent: 'Contract Sent',
    signed: 'Signed',
    in_progress: 'In Progress',
    completed: 'Completed',
  };
  return statusMap[status] || status;
}

function formatChangeAction(recordType: string, fieldName: string): string {
  if (fieldName === '_created') {
    const typeLabels: Record<string, string> = {
      project: 'Project Created',
      rfi: 'Task Created',
      quote: 'Quote Logged',
      budget_area: 'Budget Area Added',
      budget_line_item: 'Budget Item Added',
      vendor: 'Vendor Added',
    };
    return typeLabels[recordType] || `${recordType} Created`;
  }

  if (fieldName === '_deleted') {
    return `${recordType.replace(/_/g, ' ')} Deleted`;
  }

  const fieldLabels: Record<string, string> = {
    status: 'Status Updated',
    quoted_price: 'Quote Amount Updated',
    budgeted_amount: 'Budget Updated',
    actual_amount: 'Actual Cost Updated',
    priority: 'Priority Changed',
    is_blocking: 'Blocking Status Changed',
  };

  return fieldLabels[fieldName] || `${recordType.replace(/_/g, ' ')} Updated`;
}
