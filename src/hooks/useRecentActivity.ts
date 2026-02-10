import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { formatRelativeTime } from '../lib/changeUtils';

export interface ActivityEntry {
  id: string;
  description: string;
  created_at: string;
  relativeTime: string;
}

export function useRecentActivityByProject(limit: number = 5) {
  return useQuery({
    queryKey: ['recent-activity-by-project', limit],
    queryFn: async () => {
      // Get recent change_log entries
      const { data: changes, error: changesError } = await supabase
        .from('change_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (changesError) throw changesError;

      // Get RFI activity
      const { data: rfiActivity, error: rfiError } = await supabase
        .from('rfi_activity_log')
        .select(`
          id,
          rfi_id,
          previous_status,
          new_status,
          note,
          created_at,
          rfis(project_id, task)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (rfiError) throw rfiError;

      // Get project info for mapping
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name');

      const { data: quotes } = await supabase
        .from('quotes')
        .select('id, project_id');

      const { data: budgetAreas } = await supabase
        .from('project_budget_areas')
        .select('id, project_id');

      const { data: budgetLineItems } = await supabase
        .from('budget_line_items')
        .select('id, budget_area_id');

      const { data: rfis } = await supabase
        .from('rfis')
        .select('id, project_id');

      // Build lookup maps
      const quoteProjectMap = new Map(quotes?.map((q) => [q.id, q.project_id]) || []);
      const budgetProjectMap = new Map(budgetAreas?.map((b) => [b.id, b.project_id]) || []);
      const rfiProjectMap = new Map(rfis?.map((r) => [r.id, r.project_id]) || []);

      // Build line item -> project map (line item -> budget area -> project)
      const lineItemProjectMap = new Map<string, string>();
      (budgetLineItems || []).forEach((li) => {
        const projectId = budgetProjectMap.get(li.budget_area_id);
        if (projectId) {
          lineItemProjectMap.set(li.id, projectId);
        }
      });

      // Group activity by project
      const projectActivity: Record<string, ActivityEntry[]> = {};

      // Initialize all projects with empty arrays
      projects?.forEach((p) => {
        projectActivity[p.id] = [];
      });

      // Process change_log entries
      (changes || []).forEach((change) => {
        let projectId: string | undefined;

        if (change.record_type === 'project') {
          projectId = change.record_id;
        } else if (change.record_type === 'quote') {
          projectId = quoteProjectMap.get(change.record_id);
        } else if (change.record_type === 'budget_area') {
          projectId = budgetProjectMap.get(change.record_id);
        } else if (change.record_type === 'budget_line_item') {
          projectId = lineItemProjectMap.get(change.record_id);
        } else if (change.record_type === 'rfi') {
          projectId = rfiProjectMap.get(change.record_id);
        }

        if (projectId && projectActivity[projectId]) {
          if (projectActivity[projectId].length < limit) {
            projectActivity[projectId].push({
              id: change.id,
              description: formatActivityDescription(change.record_type, change.field_name, change.note),
              created_at: change.created_at,
              relativeTime: formatRelativeTime(change.created_at),
            });
          }
        }
      });

      // Process RFI activity
      (rfiActivity || []).forEach((item) => {
        const rfiData = item.rfis as unknown as { project_id: string; task: string } | null;
        const projectId = rfiData?.project_id;

        if (projectId && projectActivity[projectId]) {
          if (projectActivity[projectId].length < limit) {
            projectActivity[projectId].push({
              id: item.id,
              description: formatRFIActivity(item.previous_status, item.new_status, rfiData?.task),
              created_at: item.created_at,
              relativeTime: formatRelativeTime(item.created_at),
            });
          }
        }
      });

      // Sort each project's activity by date and limit
      Object.keys(projectActivity).forEach((projectId) => {
        projectActivity[projectId] = projectActivity[projectId]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, limit);
      });

      return projectActivity;
    },
    staleTime: 30000, // Cache for 30 seconds
  });
}

function formatActivityDescription(recordType: string, fieldName: string, note: string | null): string {
  if (fieldName === '_created') {
    const typeLabels: Record<string, string> = {
      project: 'Project created',
      rfi: 'Task created',
      quote: 'Quote logged',
      budget_area: 'Budget area added',
      budget_line_item: 'Budget item added',
    };
    return note || typeLabels[recordType] || `${capitalize(recordType)} created`;
  }

  if (fieldName === '_deleted') {
    const deleteLabels: Record<string, string> = {
      budget_line_item: 'Budget item removed',
    };
    return note || deleteLabels[recordType] || `${capitalize(recordType)} deleted`;
  }

  // Field updates
  const fieldLabels: Record<string, string> = {
    status: 'Status updated',
    quoted_price: 'Quote amount updated',
    budgeted_amount: 'Budget updated',
    actual_amount: 'Actual cost updated',
    priority: 'Priority changed',
    is_blocking: 'Blocking status changed',
    item_name: 'Budget item renamed',
  };

  // Type-specific field labels
  if (recordType === 'budget_line_item') {
    if (fieldName === 'budgeted_amount') return note || 'Budget item estimate updated';
    if (fieldName === 'actual_amount') return note || 'Budget item actual updated';
  }

  return note || fieldLabels[fieldName] || `${capitalize(recordType)} updated`;
}

function formatRFIActivity(prevStatus: string | null, newStatus: string, taskName?: string): string {
  const statusLabels: Record<string, string> = {
    open: 'Open',
    waiting_on_client: 'Waiting on Client',
    waiting_on_vendor: 'Waiting on Vendor',
    waiting_on_contractor: 'Waiting on Contractor',
    waiting_on_me: 'Waiting on Me',
    follow_up: 'Follow Up',
    completed: 'Completed',
    dead: 'Dead',
  };

  const newLabel = statusLabels[newStatus] || newStatus;

  if (!prevStatus) {
    return `Task created: ${taskName || 'New task'}`;
  }

  if (newStatus === 'completed') {
    return `Task completed: ${taskName || 'Task'}`;
  }

  return `Status → ${newLabel}`;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}
