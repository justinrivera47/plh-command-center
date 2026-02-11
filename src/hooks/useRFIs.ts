import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useChangeLog } from './useChangeLog';
import { detectChanges } from '../lib/changeUtils';
import type { RFI } from '../lib/types';

export function useRFIs(projectId?: string) {
  return useQuery({
    queryKey: projectId ? ['rfis', { projectId }] : ['rfis'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('rfis')
        .select('*')
        .eq('user_id', user.id)
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('rfis')
        .select('*')
        .eq('user_id', user.id)
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
  const { logCreation } = useChangeLog();

  return useMutation({
    mutationFn: async (rfi: Omit<RFI, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('rfis')
        .insert(rfi)
        .select()
        .single();

      if (error) throw error;

      // Log creation
      await logCreation({
        recordType: 'rfi',
        recordId: data.id,
        userId: rfi.user_id,
        data: {
          task: rfi.task,
          project_id: rfi.project_id,
          priority: rfi.priority,
          is_blocking: rfi.is_blocking,
          status: rfi.status,
        },
        note: `Created task: ${rfi.task}`,
      });

      return data as RFI;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfis'] });
      queryClient.invalidateQueries({ queryKey: ['war-room'] });
      queryClient.invalidateQueries({ queryKey: ['project-activity'] });
    },
  });
}

export function useUpdateRFI() {
  const queryClient = useQueryClient();
  const { logChange } = useChangeLog();

  return useMutation({
    mutationFn: async ({ id, userId, ...updates }: Partial<RFI> & { id: string; userId?: string }) => {
      // Fetch current for comparison if userId provided (for logging)
      let current: RFI | null = null;
      if (userId) {
        const { data: currentData } = await supabase
          .from('rfis')
          .select('*')
          .eq('id', id)
          .single();
        current = currentData;
      }

      const { data, error } = await supabase
        .from('rfis')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log changes if userId provided (exclude status as it has its own logging)
      if (userId && current) {
        const changes = detectChanges(current, updates, [
          'task', 'scope', 'priority', 'is_blocking', 'blocks_description',
          'poc_name', 'poc_type', 'next_action_date', 'latest_update'
        ]);
        if (changes.length > 0) {
          await logChange({
            recordType: 'rfi',
            recordId: id,
            userId,
            changes,
          });
        }
      }

      return data as RFI;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rfis'] });
      queryClient.invalidateQueries({ queryKey: ['rfis', data.id] });
      queryClient.invalidateQueries({ queryKey: ['war-room'] });
      queryClient.invalidateQueries({ queryKey: ['project-activity'] });
    },
  });
}

// Update RFI status with activity log
export function useUpdateRFIStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      rfi_id,
      new_status,
      note,
      next_action_date,
    }: {
      rfi_id: string;
      new_status: RFI['status'];
      note?: string;
      next_action_date?: string;
    }) => {
      // Get current RFI to log previous status
      const { data: currentRFI, error: fetchError } = await supabase
        .from('rfis')
        .select('status')
        .eq('id', rfi_id)
        .single();

      if (fetchError) throw fetchError;

      // Update RFI
      const updates: Partial<RFI> = {
        status: new_status,
        latest_update: note || null,
        last_contacted_at: new Date().toISOString(),
        is_complete: new_status === 'completed',
      };

      if (next_action_date) {
        updates.next_action_date = next_action_date;
      }

      const { data: updatedRFI, error: updateError } = await supabase
        .from('rfis')
        .update(updates)
        .eq('id', rfi_id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Log activity
      const { error: logError } = await supabase
        .from('rfi_activity_log')
        .insert({
          rfi_id,
          previous_status: currentRFI.status,
          new_status,
          note: note || null,
          source: 'quick_entry',
        });

      if (logError) throw logError;

      return updatedRFI as RFI;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfis'] });
      queryClient.invalidateQueries({ queryKey: ['war-room'] });
      queryClient.invalidateQueries({ queryKey: ['project-activity'] });
    },
  });
}

// Get RFI counts for a project (for badges)
export function useProjectRFICounts(projectId: string) {
  return useQuery({
    queryKey: ['rfis', 'counts', projectId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('war_room')
        .select('*')
        .eq('user_id', user.id)
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

// Delete an RFI
export function useDeleteRFI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rfiId: string) => {
      const { error } = await supabase
        .from('rfis')
        .delete()
        .eq('id', rfiId);

      if (error) throw error;
      return rfiId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfis'] });
      queryClient.invalidateQueries({ queryKey: ['war-room'] });
      queryClient.invalidateQueries({ queryKey: ['project-activity'] });
    },
  });
}
