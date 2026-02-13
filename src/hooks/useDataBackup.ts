import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface BackupData {
  exportedAt: Date;
  projects: ProjectBackup[];
  tasks: TaskBackup[];
  quotes: QuoteBackup[];
  vendors: VendorBackup[];
  budgetAreas: BudgetAreaBackup[];
  budgetLineItems: BudgetLineItemBackup[];
}

export interface ProjectBackup {
  name: string;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  address: string | null;
  status: string;
  totalBudget: number | null;
  notes: string | null;
  createdAt: string;
}

export interface TaskBackup {
  projectName: string;
  task: string;
  scope: string | null;
  status: string;
  priority: string;
  pocType: string | null;
  pocName: string | null;
  latestUpdate: string | null;
  isBlocking: boolean;
  isComplete: boolean;
  nextActionDate: string | null;
  notes: string | null;
  createdAt: string;
}

export interface QuoteBackup {
  projectName: string;
  tradeName: string | null;
  vendorName: string | null;
  vendorContact: string | null;
  status: string;
  budgetAmount: number | null;
  quotedPrice: number | null;
  scopeNotes: string | null;
  availability: string | null;
  notes: string | null;
  createdAt: string;
}

export interface VendorBackup {
  companyName: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  licenseNumber: string | null;
  qualityRating: string;
  communicationRating: string;
  trades: string;
  status: string;
  notes: string | null;
  createdAt: string;
}

export interface BudgetAreaBackup {
  projectName: string;
  areaName: string;
  budgetedAmount: number | null;
  sortOrder: number;
}

export interface BudgetLineItemBackup {
  projectName: string;
  areaName: string;
  itemName: string;
  budgetedAmount: number | null;
  actualAmount: number | null;
  notes: string | null;
}

export function useDataBackup() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['data-backup', user?.id],
    queryFn: async (): Promise<BackupData> => {
      if (!user) throw new Error('Not authenticated');

      // Fetch all data in parallel
      const [
        projectsResult,
        rfisResult,
        quotesResult,
        vendorsResult,
        vendorTradesResult,
        tradeCategoriesResult,
        budgetAreasResult,
        lineItemsResult,
      ] = await Promise.all([
        supabase.from('projects').select('*').eq('user_id', user.id).order('name'),
        supabase.from('rfis').select('*, projects(name)').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('quotes').select('*, projects(name), vendors(company_name, poc_name), trade_categories(name)').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('vendors').select('*').eq('user_id', user.id).order('company_name'),
        supabase.from('vendor_trades').select('vendor_id, trade_category_id'),
        supabase.from('trade_categories').select('*'),
        supabase.from('project_budget_areas').select('*, projects(name)').order('sort_order'),
        supabase.from('budget_line_items').select('*, project_budget_areas(area_name, projects(name))').order('sort_order'),
      ]);

      // Create lookup maps
      const tradeMap = new Map((tradeCategoriesResult.data || []).map(t => [t.id, t.name]));

      // Build vendor trades lookup
      const vendorTradesMap = new Map<string, string[]>();
      (vendorTradesResult.data || []).forEach(vt => {
        const trades = vendorTradesMap.get(vt.vendor_id) || [];
        const tradeName = tradeMap.get(vt.trade_category_id);
        if (tradeName) trades.push(tradeName);
        vendorTradesMap.set(vt.vendor_id, trades);
      });

      // Transform projects
      const projects: ProjectBackup[] = (projectsResult.data || []).map(p => ({
        name: p.name,
        clientName: p.client_name,
        clientEmail: p.client_email,
        clientPhone: p.client_phone,
        address: p.address,
        status: p.status,
        totalBudget: p.total_budget,
        notes: p.notes,
        createdAt: p.created_at,
      }));

      // Transform tasks/RFIs
      const tasks: TaskBackup[] = (rfisResult.data || []).map(r => ({
        projectName: (r.projects as { name: string })?.name || 'Unknown',
        task: r.task,
        scope: r.scope,
        status: r.status,
        priority: r.priority,
        pocType: r.poc_type,
        pocName: r.poc_name,
        latestUpdate: r.latest_update,
        isBlocking: r.is_blocking,
        isComplete: r.is_complete,
        nextActionDate: r.next_action_date,
        notes: r.notes,
        createdAt: r.created_at,
      }));

      // Transform quotes
      const quotes: QuoteBackup[] = (quotesResult.data || []).map(q => ({
        projectName: (q.projects as { name: string })?.name || 'Unknown',
        tradeName: (q.trade_categories as { name: string })?.name || null,
        vendorName: (q.vendors as { company_name: string })?.company_name || null,
        vendorContact: (q.vendors as { poc_name: string })?.poc_name || null,
        status: q.status,
        budgetAmount: q.budget_amount,
        quotedPrice: q.quoted_price,
        scopeNotes: q.scope_notes,
        availability: q.availability,
        notes: q.notes,
        createdAt: q.created_at,
      }));

      // Transform vendors
      const vendors: VendorBackup[] = (vendorsResult.data || []).map(v => ({
        companyName: v.company_name,
        contactName: v.poc_name,
        phone: v.phone,
        email: v.email,
        website: v.website,
        licenseNumber: v.license_number,
        qualityRating: v.quality_rating,
        communicationRating: v.communication_rating,
        trades: vendorTradesMap.get(v.id)?.join(', ') || '',
        status: v.status,
        notes: v.notes,
        createdAt: v.created_at,
      }));

      // Transform budget areas
      const budgetAreas: BudgetAreaBackup[] = (budgetAreasResult.data || []).map(a => ({
        projectName: (a.projects as { name: string })?.name || 'Unknown',
        areaName: a.area_name,
        budgetedAmount: a.budgeted_amount,
        sortOrder: a.sort_order,
      }));

      // Transform line items
      const budgetLineItems: BudgetLineItemBackup[] = (lineItemsResult.data || []).map(li => ({
        projectName: (li.project_budget_areas as { projects: { name: string } })?.projects?.name || 'Unknown',
        areaName: (li.project_budget_areas as { area_name: string })?.area_name || 'Unknown',
        itemName: li.item_name,
        budgetedAmount: li.budgeted_amount,
        actualAmount: li.actual_amount,
        notes: li.notes,
      }));

      return {
        exportedAt: new Date(),
        projects,
        tasks,
        quotes,
        vendors,
        budgetAreas,
        budgetLineItems,
      };
    },
    enabled: false, // Only fetch when manually triggered
  });
}
