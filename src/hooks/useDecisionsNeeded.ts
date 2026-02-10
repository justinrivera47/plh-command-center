import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { QuoteComparison } from '../lib/types';

export interface DecisionNeeded {
  type: 'quote_approval' | 'over_budget';
  id: string;
  projectId: string;
  projectName: string;
  description: string;
  amount?: number;
  variance?: number;
  createdAt: string;
}

export function useDecisionsNeeded() {
  return useQuery({
    queryKey: ['decisions-needed'],
    queryFn: async () => {
      // Get quotes awaiting approval (status = 'quoted')
      const { data: pendingQuotes, error: pendingError } = await supabase
        .from('quote_comparison')
        .select('*')
        .eq('status', 'quoted')
        .order('created_at', { ascending: false });

      if (pendingError) throw pendingError;

      // Get quotes that are over budget
      const { data: overBudgetQuotes, error: overBudgetError } = await supabase
        .from('quote_comparison')
        .select('*')
        .not('budget_variance', 'is', null)
        .gt('budget_variance', 0)
        .in('status', ['quoted', 'pending'])
        .order('budget_variance', { ascending: false });

      if (overBudgetError) throw overBudgetError;

      const decisions: DecisionNeeded[] = [];
      const seenIds = new Set<string>();

      // Add pending quotes as decisions
      (pendingQuotes || []).forEach((quote: QuoteComparison) => {
        decisions.push({
          type: 'quote_approval',
          id: quote.id,
          projectId: quote.project_id,
          projectName: quote.project_name,
          description: `${quote.trade_name || 'Quote'} from ${quote.vendor_name || 'vendor'} needs approval`,
          amount: quote.quoted_price || undefined,
          createdAt: quote.created_at,
        });
        seenIds.add(quote.id);
      });

      // Add over-budget items (if not already in pending)
      (overBudgetQuotes || []).forEach((quote: QuoteComparison) => {
        if (!seenIds.has(quote.id)) {
          decisions.push({
            type: 'over_budget',
            id: quote.id,
            projectId: quote.project_id,
            projectName: quote.project_name,
            description: `${quote.trade_name || 'Quote'} is over budget`,
            amount: quote.quoted_price || undefined,
            variance: quote.budget_variance || undefined,
            createdAt: quote.created_at,
          });
        }
      });

      return decisions;
    },
  });
}

// Get decisions for a specific project
export function useProjectDecisions(projectId: string | undefined) {
  const { data: allDecisions, ...rest } = useDecisionsNeeded();

  const projectDecisions = projectId
    ? allDecisions?.filter((d) => d.projectId === projectId) || []
    : [];

  return {
    data: projectDecisions,
    ...rest,
  };
}
