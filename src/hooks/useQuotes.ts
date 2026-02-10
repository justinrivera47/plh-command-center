import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Quote, QuoteComparison } from '../lib/types';

export function useQuotes(projectId?: string) {
  return useQuery({
    queryKey: projectId ? ['quotes', { projectId }] : ['quotes'],
    queryFn: async () => {
      let query = supabase
        .from('quote_comparison')
        .select('*')
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

  return useMutation({
    mutationFn: async (quote: Omit<Quote, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('quotes')
        .insert(quote)
        .select()
        .single();

      if (error) throw error;
      return data as Quote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
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
