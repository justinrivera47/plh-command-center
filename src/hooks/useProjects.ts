import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useChangeLog } from './useChangeLog';
import { detectChanges } from '../lib/changeUtils';
import type { Project, ProjectBudgetArea, ChangeLog } from '../lib/types';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
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
  const { logCreation } = useChangeLog();

  return useMutation({
    mutationFn: async ({ userId, ...project }: Omit<Project, 'id' | 'created_at' | 'updated_at'> & { userId: string }) => {
      const { data, error } = await supabase
        .from('projects')
        .insert(project)
        .select()
        .single();

      if (error) throw error;

      // Log creation
      await logCreation({
        recordType: 'project',
        recordId: data.id,
        userId,
        data: {
          name: project.name,
          client_name: project.client_name,
          total_budget: project.total_budget,
        },
        note: `Created project: ${project.name}`,
      });

      return data as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  const { logChange } = useChangeLog();

  return useMutation({
    mutationFn: async ({ id, userId, ...updates }: Partial<Project> & { id: string; userId?: string }) => {
      // Fetch current for comparison if userId provided (for logging)
      let current: Project | null = null;
      if (userId) {
        const { data: currentData } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .single();
        current = currentData;
      }

      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log changes if userId provided
      if (userId && current) {
        const changes = detectChanges(current, updates, ['name', 'status', 'total_budget', 'client_name', 'address']);
        if (changes.length > 0) {
          await logChange({
            recordType: 'project',
            recordId: id,
            userId,
            changes,
          });
        }
      }

      return data as Project;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects', data.id] });
      queryClient.invalidateQueries({ queryKey: ['project-activity', data.id] });
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
  const { logCreation } = useChangeLog();

  return useMutation({
    mutationFn: async ({ userId, ...area }: Omit<ProjectBudgetArea, 'id'> & { userId: string }) => {
      const { data, error } = await supabase
        .from('project_budget_areas')
        .insert(area)
        .select()
        .single();

      if (error) throw error;

      // Log creation
      await logCreation({
        recordType: 'budget_area',
        recordId: data.id,
        userId,
        data: {
          area_name: area.area_name,
          budgeted_amount: area.budgeted_amount,
          actual_amount: area.actual_amount,
        },
        note: `Added budget area: ${area.area_name}`,
      });

      return data as ProjectBudgetArea;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['budget-areas', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['project-activity', data.project_id] });
    },
  });
}

export function useUpdateBudgetArea() {
  const queryClient = useQueryClient();
  const { logChange } = useChangeLog();

  return useMutation({
    mutationFn: async ({ id, project_id, userId, ...updates }: Partial<ProjectBudgetArea> & { id: string; project_id: string; userId?: string }) => {
      // Fetch current for comparison if userId provided
      let current: ProjectBudgetArea | null = null;
      if (userId) {
        const { data: currentData } = await supabase
          .from('project_budget_areas')
          .select('*')
          .eq('id', id)
          .single();
        current = currentData;
      }

      const { data, error } = await supabase
        .from('project_budget_areas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log changes if userId provided
      if (userId && current) {
        const changes = detectChanges(current, updates, ['area_name', 'budgeted_amount', 'actual_amount']);
        if (changes.length > 0) {
          await logChange({
            recordType: 'budget_area',
            recordId: id,
            userId,
            changes,
            note: `Updated budget area: ${current.area_name}`,
          });
        }
      }

      return { ...data, project_id } as ProjectBudgetArea;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['budget-areas', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['project-activity', data.project_id] });
    },
  });
}

export function useDeleteBudgetArea() {
  const queryClient = useQueryClient();
  const { logDeletion } = useChangeLog();

  return useMutation({
    mutationFn: async ({
      id,
      project_id,
      userId,
      areaData,
    }: {
      id: string;
      project_id: string;
      userId: string;
      areaData: ProjectBudgetArea;
    }) => {
      const { error } = await supabase
        .from('project_budget_areas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Log deletion
      await logDeletion({
        recordType: 'budget_area',
        recordId: id,
        userId,
        data: {
          area_name: areaData.area_name,
          budgeted_amount: areaData.budgeted_amount,
          actual_amount: areaData.actual_amount,
        },
        note: `Deleted budget area: ${areaData.area_name}`,
      });

      return { id, project_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['budget-areas', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['project-activity', data.project_id] });
    },
  });
}

export function useReorderBudgetAreas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      project_id,
      orderedIds,
    }: {
      project_id: string;
      orderedIds: string[];
    }) => {
      // Update sort_order for each area
      const updates = orderedIds.map((id, index) =>
        supabase
          .from('project_budget_areas')
          .update({ sort_order: index + 1 })
          .eq('id', id)
      );

      await Promise.all(updates);
      return { project_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['budget-areas', data.project_id] });
    },
  });
}

// Delete a project
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
      return projectId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
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
