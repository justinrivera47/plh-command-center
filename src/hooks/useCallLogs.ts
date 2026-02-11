import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { CallLog, CallLogView, CallOutcome } from '../lib/types';

// Fetch all call logs for the current user
export function useCallLogs(projectId?: string) {
  return useQuery({
    queryKey: projectId ? ['call-logs', { projectId }] : ['call-logs'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('call_logs_view')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CallLogView[];
    },
  });
}

// Fetch recent call logs (for dashboard/boss view)
export function useRecentCallLogs(limit: number = 10) {
  return useQuery({
    queryKey: ['call-logs', 'recent', limit],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('call_logs_view')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as CallLogView[];
    },
  });
}

// Fetch call logs grouped by project (for boss view)
export function useCallLogsByProject() {
  const { data: callLogs, ...rest } = useCallLogs();

  const groupedByProject = callLogs?.reduce((acc, log) => {
    const projectId = log.project_id || 'no-project';
    if (!acc[projectId]) {
      acc[projectId] = [];
    }
    acc[projectId].push(log);
    return acc;
  }, {} as Record<string, CallLogView[]>);

  return {
    data: groupedByProject,
    callLogs,
    ...rest,
  };
}

// Create a new call log
export function useCreateCallLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (callLog: Omit<CallLog, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('call_logs')
        .insert(callLog)
        .select()
        .single();

      if (error) throw error;
      return data as CallLog;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['call-logs'] });
      if (data.project_id) {
        queryClient.invalidateQueries({ queryKey: ['call-logs', { projectId: data.project_id }] });
      }
    },
  });
}

// Update call log's follow-up RFI link
export function useUpdateCallLogRFI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, follow_up_rfi_id }: { id: string; follow_up_rfi_id: string }) => {
      const { data, error } = await supabase
        .from('call_logs')
        .update({ follow_up_rfi_id })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as CallLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-logs'] });
    },
  });
}

// Get call log stats for a project
export function useProjectCallStats(projectId: string | undefined) {
  return useQuery({
    queryKey: ['call-logs', 'stats', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('call_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const logs = data as CallLog[];
      const lastCall = logs[0];
      const totalCalls = logs.length;
      const pendingFollowUps = logs.filter(
        l => l.outcome !== 'done' && !l.follow_up_rfi_id
      ).length;

      return {
        totalCalls,
        pendingFollowUps,
        lastCall,
        lastCallDate: lastCall?.created_at || null,
      };
    },
    enabled: !!projectId,
  });
}

// Format outcome for display
export function formatOutcome(outcome: CallOutcome): string {
  const labels: Record<CallOutcome, string> = {
    waiting_on_them: 'Waiting on them',
    i_need_to_do: 'I need to follow up',
    done: 'Done',
    follow_up_by: 'Follow up scheduled',
  };
  return labels[outcome] || outcome;
}

// Get outcome color
export function getOutcomeColor(outcome: CallOutcome): string {
  const colors: Record<CallOutcome, string> = {
    waiting_on_them: 'text-blue-600 bg-blue-100',
    i_need_to_do: 'text-amber-600 bg-amber-100',
    done: 'text-green-600 bg-green-100',
    follow_up_by: 'text-purple-600 bg-purple-100',
  };
  return colors[outcome] || 'text-gray-600 bg-gray-100';
}
