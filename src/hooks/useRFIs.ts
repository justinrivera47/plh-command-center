import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { RFI } from '../lib/types';

export function useRFIs(projectId?: string) {
  return useQuery({
    queryKey: projectId ? ['rfis', { projectId }] : ['rfis'],
    queryFn: async () => {
      let query = supabase
        .from('rfis')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as RFI[];
    },
  });
}

export function useOpenRFIs(projectId?: string) {
  return useQuery({
    queryKey: projectId ? ['rfis', 'open', { projectId }] : ['rfis', 'open'],
    queryFn: async () => {
      let query = supabase
        .from('rfis')
        .select('*')
        .eq('is_complete', false)
        .neq('status', 'dead')
        .order('priority', { ascending: true });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as RFI[];
    },
  });
}

export function useRFI(id: string | undefined) {
  return useQuery({
    queryKey: ['rfis', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('rfis')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as RFI;
    },
    enabled: !!id,
  });
}

export function useCreateRFI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rfi: Omit<RFI, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('rfis')
        .insert(rfi)
        .select()
        .single();

      if (error) throw error;
      return data as RFI;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfis'] });
      queryClient.invalidateQueries({ queryKey: ['war-room'] });
    },
  });
}

export function useUpdateRFI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RFI> & { id: string }) => {
      const { data, error } = await supabase
        .from('rfis')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as RFI;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rfis'] });
      queryClient.invalidateQueries({ queryKey: ['rfis', data.id] });
      queryClient.invalidateQueries({ queryKey: ['war-room'] });
    },
  });
}

// Get RFI counts for a project (for badges)
export function useProjectRFICounts(projectId: string) {
  return useQuery({
    queryKey: ['rfis', 'counts', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('war_room')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;

      const items = data || [];
      return {
        total: items.length,
        blocking: items.filter((i) => i.is_blocking).length,
        overdue: items.filter((i) => i.is_overdue).length,
        onMe: items.filter((i) => i.status === 'waiting_on_me').length,
      };
    },
    enabled: !!projectId,
  });
}
