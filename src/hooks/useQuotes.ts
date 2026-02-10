import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useChangeLog } from './useChangeLog';
import type { Quote, QuoteComparison } from '../lib/types';

export function useQuotes(projectId?: string) {
  return useQuery({
    queryKey: projectId ? ['quotes', { projectId }] : ['quotes'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('quote_comparison')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as QuoteComparison[];
    },
  });
}

export function useQuote(id: string | undefined) {
  return useQuery({
    queryKey: ['quotes', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('quote_comparison')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as QuoteComparison;
    },
    enabled: !!id,
  });
}

export function useCreateQuote() {
  const queryClient = useQueryClient();
  const { logCreation } = useChangeLog();

  return useMutation({
    mutationFn: async (quote: Omit<Quote, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('quotes')
        .insert(quote)
        .select()
        .single();

      if (error) throw error;

      // Log creation
      await logCreation({
        recordType: 'quote',
        recordId: data.id,
        userId: quote.user_id,
        data: {
          project_id: quote.project_id,
          vendor_id: quote.vendor_id,
          quoted_price: quote.quoted_price,
          status: quote.status,
        },
        note: `New quote logged: $${quote.quoted_price || 0}`,
      });

      return data as Quote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['project-activity'] });
    },
  });
}

export function useUpdateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Quote> & { id: string }) => {
      const { data, error } = await supabase
        .from('quotes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Quote;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quotes', data.id] });
    },
  });
}

// Update quote with change logging
export function useUpdateQuoteWithLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
      userId,
    }: {
      id: string;
      updates: Partial<Quote>;
      userId: string;
    }) => {
      // Get current quote to compare changes
      const { data: currentQuote, error: fetchError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Update the quote
      const { data: updatedQuote, error: updateError } = await supabase
        .from('quotes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Log changes
      const changes: { field: string; old: unknown; new: unknown }[] = [];
      for (const [key, newValue] of Object.entries(updates)) {
        const oldValue = (currentQuote as Record<string, unknown>)[key];
        if (oldValue !== newValue) {
          changes.push({ field: key, old: oldValue, new: newValue });
        }
      }

      if (changes.length > 0) {
        const logEntries = changes.map((change) => ({
          record_type: 'quote',
          record_id: id,
          field_name: change.field,
          old_value: change.old != null ? String(change.old) : null,
          new_value: change.new != null ? String(change.new) : null,
          changed_by: userId,
          note: null,
        }));

        await supabase.from('change_log').insert(logEntries);
      }

      return updatedQuote as Quote;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quotes', data.id] });
      queryClient.invalidateQueries({ queryKey: ['quote-history'] });
      queryClient.invalidateQueries({ queryKey: ['project-activity'] });
    },
  });
}

// Get change history for a quote
export function useQuoteHistory(quoteId: string | undefined) {
  return useQuery({
    queryKey: ['quote-history', quoteId],
    queryFn: async () => {
      if (!quoteId) return [];

      const { data, error } = await supabase
        .from('change_log')
        .select('*')
        .eq('record_type', 'quote')
        .eq('record_id', quoteId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!quoteId,
  });
}

// Get quotes grouped by trade for a project
export function useQuotesByTrade(projectId?: string) {
  const { data: quotes, ...rest } = useQuotes(projectId);

  const groupedByTrade = quotes?.reduce((acc, quote) => {
    const tradeName = quote.trade_name || 'Other';
    if (!acc[tradeName]) {
      acc[tradeName] = [];
    }
    acc[tradeName].push(quote);
    return acc;
  }, {} as Record<string, QuoteComparison[]>);

  return {
    data: groupedByTrade,
    quotes,
    ...rest,
  };
}
