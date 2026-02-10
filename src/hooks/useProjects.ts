import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Project, ProjectBudgetArea, ChangeLog } from '../lib/types';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Project[];
    },
  });
}

export function useActiveProjects() {
  return useQuery({
    queryKey: ['projects', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Project[];
    },
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Project;
    },
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('projects')
        .insert(project)
        .select()
        .single();

      if (error) throw error;
      return data as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Project;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects', data.id] });
    },
  });
}

// Budget areas for a project
export function useProjectBudgetAreas(projectId: string | undefined) {
  return useQuery({
    queryKey: ['budget-areas', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('project_budget_areas')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as ProjectBudgetArea[];
    },
    enabled: !!projectId,
  });
}

export function useCreateBudgetArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (area: Omit<ProjectBudgetArea, 'id'>) => {
      const { data, error } = await supabase
        .from('project_budget_areas')
        .insert(area)
        .select()
        .single();

      if (error) throw error;
      return data as ProjectBudgetArea;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['budget-areas', data.project_id] });
    },
  });
}

export function useUpdateBudgetArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, project_id, ...updates }: Partial<ProjectBudgetArea> & { id: string; project_id: string }) => {
      const { data, error } = await supabase
        .from('project_budget_areas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, project_id } as ProjectBudgetArea;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['budget-areas', data.project_id] });
    },
  });
}

// Project activity log - changes to RFIs, quotes, and project itself
export function useProjectActivity(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-activity', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      // Get RFI activity for this project
      const { data: rfiActivity, error: rfiError } = await supabase
        .from('rfi_activity_log')
        .select(`
          id,
          rfi_id,
          previous_status,
          new_status,
          note,
          source,
          created_at,
          rfis!inner(project_id, task)
        `)
        .eq('rfis.project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (rfiError) throw rfiError;

      // Get quote changes for this project
      const { data: quoteChanges, error: quoteError } = await supabase
        .from('change_log')
        .select(`
          id,
          record_type,
          record_id,
          field_name,
          old_value,
          new_value,
          changed_by,
          note,
          created_at
        `)
        .eq('record_type', 'quote')
        .order('created_at', { ascending: false })
        .limit(50);

      if (quoteError) throw quoteError;

      // Transform RFI activity into common format
      const rfiItems = (rfiActivity || []).map((item: Record<string, unknown>) => ({
        id: item.id as string,
        type: 'rfi_status' as const,
        description: `Task status changed: ${item.previous_status} → ${item.new_status}`,
        detail: (item.rfis as Record<string, unknown>)?.task as string,
        note: item.note as string | null,
        created_at: item.created_at as string,
      }));

      // Transform quote changes into common format
      const quoteItems = (quoteChanges || []).map((item: ChangeLog) => ({
        id: item.id,
        type: 'quote_change' as const,
        description: `Quote ${item.field_name.replace(/_/g, ' ')} updated`,
        detail: `${item.old_value || '(empty)'} → ${item.new_value || '(empty)'}`,
        note: item.note,
        created_at: item.created_at,
      }));

      // Combine and sort by date
      const combined = [...rfiItems, ...quoteItems].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return combined.slice(0, 50);
    },
    enabled: !!projectId,
  });
}
