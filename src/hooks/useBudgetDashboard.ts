import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Project, QuoteComparison, ProjectBudgetArea, BudgetLineItem } from '../lib/types';

// Types for dashboard data
export interface BudgetAreaData {
  areaId: string;
  areaName: string;
  budgeted: number;
  actual: number;
  remaining: number;
}

export interface ProjectBudgetData {
  projectId: string;
  projectName: string;
  budgeted: number;
  actual: number;
  remaining: number;
}

export interface TradeQuoteData {
  tradeName: string;
  tradeId: string | null;
  budgetAllowance: number;
  lowestQuote: number | null;
  approvedQuote: number | null;
  isApprovedOverBudget: boolean;
  isLowestUnderBudget: boolean;
  quoteCount: number;
}

export interface BudgetDashboardData {
  // Summary stats
  totalBudgeted: number;
  totalCommitted: number;
  totalVariance: number;
  percentQuoted: number;
  tradesWithQuotes: number;
  totalTrades: number;

  // Chart data
  budgetByArea: BudgetAreaData[];
  budgetByProject: ProjectBudgetData[];
  quotesByTrade: TradeQuoteData[];

  // For project selector
  projects: Project[];
}

export function useBudgetDashboard(selectedProjectId?: string | null) {
  return useQuery({
    queryKey: ['budget-dashboard', selectedProjectId],
    queryFn: async (): Promise<BudgetDashboardData> => {
      // Fetch all data in parallel
      const [
        { data: projects },
        { data: budgetAreas },
        { data: lineItems },
        { data: quotes },
      ] = await Promise.all([
        supabase
          .from('projects')
          .select('*')
          .in('status', ['active', 'on_hold'])
          .order('name'),
        supabase
          .from('project_budget_areas')
          .select('*')
          .order('sort_order'),
        supabase
          .from('budget_line_items')
          .select('*'),
        supabase
          .from('quote_comparison')
          .select('*'),
      ]);

      const allProjects = (projects || []) as Project[];
      const allAreas = (budgetAreas || []) as ProjectBudgetArea[];
      const allLineItems = (lineItems || []) as BudgetLineItem[];
      const allQuotes = (quotes || []) as QuoteComparison[];

      // Filter by project if selected
      const filteredProjects = selectedProjectId
        ? allProjects.filter(p => p.id === selectedProjectId)
        : allProjects;

      const filteredProjectIds = new Set(filteredProjects.map(p => p.id));

      const filteredAreas = allAreas.filter(a => filteredProjectIds.has(a.project_id));
      const filteredAreaIds = new Set(filteredAreas.map(a => a.id));
      const filteredLineItems = allLineItems.filter(li => filteredAreaIds.has(li.budget_area_id));
      const filteredQuotes = allQuotes.filter(q => filteredProjectIds.has(q.project_id));

      // Calculate budget by area (for single project view)
      const budgetByArea: BudgetAreaData[] = filteredAreas.map(area => {
        const areaLineItems = filteredLineItems.filter(li => li.budget_area_id === area.id);
        const budgeted = areaLineItems.reduce((sum, li) => sum + (li.budgeted_amount || 0), 0);
        const actual = areaLineItems.reduce((sum, li) => sum + (li.actual_amount || 0), 0);
        return {
          areaId: area.id,
          areaName: area.area_name,
          budgeted,
          actual,
          remaining: Math.max(0, budgeted - actual),
        };
      }).filter(a => a.budgeted > 0 || a.actual > 0);

      // Calculate budget by project (for all projects view)
      const budgetByProject: ProjectBudgetData[] = filteredProjects.map(project => {
        const projectAreaIds = filteredAreas
          .filter(a => a.project_id === project.id)
          .map(a => a.id);
        const projectLineItems = filteredLineItems.filter(li => projectAreaIds.includes(li.budget_area_id));
        const budgeted = projectLineItems.reduce((sum, li) => sum + (li.budgeted_amount || 0), 0);
        const actual = projectLineItems.reduce((sum, li) => sum + (li.actual_amount || 0), 0);
        return {
          projectId: project.id,
          projectName: project.name,
          budgeted,
          actual,
          remaining: Math.max(0, budgeted - actual),
        };
      }).filter(p => p.budgeted > 0 || p.actual > 0);

      // Calculate quotes by trade
      const quotesByTradeMap = new Map<string, {
        tradeName: string;
        tradeId: string | null;
        budgetAllowance: number;
        quotes: QuoteComparison[];
      }>();

      // Group quotes by trade
      filteredQuotes.forEach(quote => {
        const tradeName = quote.trade_name || 'Other';
        if (!quotesByTradeMap.has(tradeName)) {
          quotesByTradeMap.set(tradeName, {
            tradeName,
            tradeId: quote.trade_category_id,
            budgetAllowance: 0,
            quotes: [],
          });
        }
        const tradeData = quotesByTradeMap.get(tradeName)!;
        tradeData.quotes.push(quote);
        // Sum budget allowances (take max per trade for budget)
        if (quote.budget_amount && quote.budget_amount > tradeData.budgetAllowance) {
          tradeData.budgetAllowance = quote.budget_amount;
        }
      });

      const quotesByTrade: TradeQuoteData[] = Array.from(quotesByTradeMap.values())
        .map(({ tradeName, tradeId, budgetAllowance, quotes: tradeQuotes }) => {
          // Find lowest quoted price
          const quotedPrices = tradeQuotes
            .filter(q => q.quoted_price !== null && q.quoted_price > 0)
            .map(q => q.quoted_price!);
          const lowestQuote = quotedPrices.length > 0 ? Math.min(...quotedPrices) : null;

          // Find approved/selected quote
          const approvedQuote = tradeQuotes.find(q =>
            ['approved', 'signed', 'contract_sent', 'in_progress', 'completed'].includes(q.status)
          );
          const approvedQuotePrice = approvedQuote?.quoted_price || null;

          return {
            tradeName,
            tradeId,
            budgetAllowance,
            lowestQuote,
            approvedQuote: approvedQuotePrice,
            isApprovedOverBudget: approvedQuotePrice !== null && budgetAllowance > 0 && approvedQuotePrice > budgetAllowance,
            isLowestUnderBudget: lowestQuote !== null && budgetAllowance > 0 && lowestQuote < budgetAllowance,
            quoteCount: tradeQuotes.length,
          };
        })
        .filter(t => t.budgetAllowance > 0 || t.lowestQuote || t.approvedQuote)
        .sort((a, b) => a.tradeName.localeCompare(b.tradeName));

      // Calculate summary stats
      const totalBudgeted = budgetByProject.reduce((sum, p) => sum + p.budgeted, 0);
      const totalCommitted = budgetByProject.reduce((sum, p) => sum + p.actual, 0);
      const totalVariance = totalCommitted - totalBudgeted;

      // Count trades with quotes vs total trades used
      const tradesWithQuotes = quotesByTradeMap.size;
      const totalTrades = new Set(filteredQuotes.map(q => q.trade_name || 'Other')).size || tradesWithQuotes;
      const percentQuoted = totalTrades > 0 ? Math.round((tradesWithQuotes / Math.max(totalTrades, 1)) * 100) : 0;

      return {
        totalBudgeted,
        totalCommitted,
        totalVariance,
        percentQuoted,
        tradesWithQuotes,
        totalTrades,
        budgetByArea,
        budgetByProject,
        quotesByTrade,
        projects: allProjects,
      };
    },
    staleTime: 30000,
  });
}
