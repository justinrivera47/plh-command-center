import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useChangeLog } from './useChangeLog';
import { detectChanges } from '../lib/changeUtils';
import type { BudgetLineItem } from '../lib/types';

// Fetch line items for a specific budget area
export function useBudgetLineItems(budgetAreaId: string | undefined) {
  return useQuery({
    queryKey: ['budget-line-items', budgetAreaId],
    queryFn: async () => {
      if (!budgetAreaId) return [];

      const { data, error } = await supabase
        .from('budget_line_items')
        .select('*')
        .eq('budget_area_id', budgetAreaId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as BudgetLineItem[];
    },
    enabled: !!budgetAreaId,
  });
}

// Fetch all line items for a project (grouped by area)
export function useAllBudgetLineItems(projectId: string | undefined) {
  return useQuery({
    queryKey: ['budget-line-items-all', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      // First get all budget areas for this project
      const { data: areas, error: areasError } = await supabase
        .from('project_budget_areas')
        .select('id')
        .eq('project_id', projectId);

      if (areasError) throw areasError;
      if (!areas || areas.length === 0) return [];

      const areaIds = areas.map((a) => a.id);

      // Then get all line items for those areas
      const { data, error } = await supabase
        .from('budget_line_items')
        .select('*')
        .in('budget_area_id', areaIds)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as BudgetLineItem[];
    },
    enabled: !!projectId,
  });
}

export function useCreateBudgetLineItem() {
  const queryClient = useQueryClient();
  const { logCreation } = useChangeLog();

  return useMutation({
    mutationFn: async ({
      userId,
      projectId,
      ...lineItem
    }: Omit<BudgetLineItem, 'id' | 'created_at' | 'updated_at'> & {
      userId: string;
      projectId: string;
    }) => {
      const { data, error } = await supabase
        .from('budget_line_items')
        .insert({
          budget_area_id: lineItem.budget_area_id,
          item_name: lineItem.item_name,
          budgeted_amount: lineItem.budgeted_amount,
          actual_amount: lineItem.actual_amount,
          sort_order: lineItem.sort_order,
          notes: lineItem.notes,
        })
        .select()
        .single();

      if (error) throw error;

      // Log creation
      await logCreation({
        recordType: 'budget_line_item',
        recordId: data.id,
        userId,
        data: {
          item_name: lineItem.item_name,
          budgeted_amount: lineItem.budgeted_amount,
          actual_amount: lineItem.actual_amount,
        },
        note: `Added budget line item: ${lineItem.item_name}`,
      });

      return { ...data, projectId } as BudgetLineItem & { projectId: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['budget-line-items', data.budget_area_id] });
      queryClient.invalidateQueries({ queryKey: ['budget-line-items-all', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-activity', data.projectId] });
    },
  });
}

export function useUpdateBudgetLineItem() {
  const queryClient = useQueryClient();
  const { logChange } = useChangeLog();

  return useMutation({
    mutationFn: async ({
      id,
      budget_area_id,
      projectId,
      userId,
      ...updates
    }: Partial<BudgetLineItem> & {
      id: string;
      budget_area_id: string;
      projectId: string;
      userId?: string;
    }) => {
      // Fetch current for comparison if userId provided
      let current: BudgetLineItem | null = null;
      if (userId) {
        const { data: currentData } = await supabase
          .from('budget_line_items')
          .select('*')
          .eq('id', id)
          .single();
        current = currentData;
      }

      const { data, error } = await supabase
        .from('budget_line_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log changes if userId provided
      if (userId && current) {
        const changes = detectChanges(current, updates, ['item_name', 'budgeted_amount', 'actual_amount', 'notes']);
        if (changes.length > 0) {
          await logChange({
            recordType: 'budget_line_item',
            recordId: id,
            userId,
            changes,
            note: `Updated budget line item: ${current.item_name}`,
          });
        }
      }

      return { ...data, budget_area_id, projectId } as BudgetLineItem & { projectId: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['budget-line-items', data.budget_area_id] });
      queryClient.invalidateQueries({ queryKey: ['budget-line-items-all', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-activity', data.projectId] });
    },
  });
}

export function useDeleteBudgetLineItem() {
  const queryClient = useQueryClient();
  const { logDeletion } = useChangeLog();

  return useMutation({
    mutationFn: async ({
      id,
      budget_area_id,
      projectId,
      userId,
      lineItemData,
    }: {
      id: string;
      budget_area_id: string;
      projectId: string;
      userId: string;
      lineItemData: BudgetLineItem;
    }) => {
      const { error } = await supabase
        .from('budget_line_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Log deletion
      await logDeletion({
        recordType: 'budget_line_item',
        recordId: id,
        userId,
        data: {
          item_name: lineItemData.item_name,
          budgeted_amount: lineItemData.budgeted_amount,
          actual_amount: lineItemData.actual_amount,
        },
        note: `Deleted budget line item: ${lineItemData.item_name}`,
      });

      return { id, budget_area_id, projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['budget-line-items', data.budget_area_id] });
      queryClient.invalidateQueries({ queryKey: ['budget-line-items-all', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-activity', data.projectId] });
    },
  });
}

export function useReorderBudgetLineItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      budget_area_id,
      projectId,
      orderedIds,
    }: {
      budget_area_id: string;
      projectId: string;
      orderedIds: string[];
    }) => {
      // Update sort_order for each line item
      const updates = orderedIds.map((id, index) =>
        supabase
          .from('budget_line_items')
          .update({ sort_order: index + 1 })
          .eq('id', id)
      );

      await Promise.all(updates);
      return { budget_area_id, projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['budget-line-items', data.budget_area_id] });
      queryClient.invalidateQueries({ queryKey: ['budget-line-items-all', data.projectId] });
    },
  });
}
