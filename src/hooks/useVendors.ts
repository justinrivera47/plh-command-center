import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Vendor, TradeCategory } from '../lib/types';

export function useVendors() {
  return useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('company_name', { ascending: true });

      if (error) throw error;
      return data as Vendor[];
    },
  });
}

// Fetch vendors with their trades
export function useVendorsWithTrades() {
  return useQuery({
    queryKey: ['vendors', 'with-trades'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch vendors
      const { data: vendors, error: vendorsError } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('company_name', { ascending: true });

      if (vendorsError) throw vendorsError;

      // Fetch all vendor trades with trade names
      const { data: vendorTrades, error: tradesError } = await supabase
        .from('vendor_trades')
        .select('vendor_id, trade_categories(id, name)');

      if (tradesError) throw tradesError;

      // Map trades to vendors
      const tradesMap: Record<string, string[]> = {};
      vendorTrades?.forEach((vt: any) => {
        if (!tradesMap[vt.vendor_id]) {
          tradesMap[vt.vendor_id] = [];
        }
        if (vt.trade_categories?.name) {
          tradesMap[vt.vendor_id].push(vt.trade_categories.name);
        }
      });

      return (vendors as Vendor[]).map((vendor) => ({
        ...vendor,
        trades: tradesMap[vendor.id] || [],
      }));
    },
  });
}

export type VendorWithTrades = Vendor & { trades: string[] };
export type VendorWithTradeIds = Vendor & { trade_ids: string[] };

// Fetch vendors with their trade category IDs for filtering
export function useVendorsWithTradeIds() {
  return useQuery({
    queryKey: ['vendors', 'with-trade-ids'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch vendors
      const { data: vendors, error: vendorsError } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('company_name', { ascending: true });

      if (vendorsError) throw vendorsError;

      // Fetch all vendor trades
      const { data: vendorTrades, error: tradesError } = await supabase
        .from('vendor_trades')
        .select('vendor_id, trade_category_id');

      if (tradesError) throw tradesError;

      // Map trade IDs to vendors
      const tradesMap: Record<string, string[]> = {};
      vendorTrades?.forEach((vt: { vendor_id: string; trade_category_id: string }) => {
        if (!tradesMap[vt.vendor_id]) {
          tradesMap[vt.vendor_id] = [];
        }
        tradesMap[vt.vendor_id].push(vt.trade_category_id);
      });

      return (vendors as Vendor[]).map((vendor) => ({
        ...vendor,
        trade_ids: tradesMap[vendor.id] || [],
      })) as VendorWithTradeIds[];
    },
  });
}

export function useAllVendors() {
  return useQuery({
    queryKey: ['vendors', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .order('company_name', { ascending: true });

      if (error) throw error;
      return data as Vendor[];
    },
  });
}

export function useVendor(id: string | undefined) {
  return useQuery({
    queryKey: ['vendors', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Vendor;
    },
    enabled: !!id,
  });
}

export function useVendorTrades(vendorId: string | undefined) {
  return useQuery({
    queryKey: ['vendor-trades', vendorId],
    queryFn: async () => {
      if (!vendorId) return [];

      const { data, error } = await supabase
        .from('vendor_trades')
        .select('trade_category_id, trade_categories(id, name)')
        .eq('vendor_id', vendorId);

      if (error) throw error;
      return data.map((vt: any) => vt.trade_categories) as TradeCategory[];
    },
    enabled: !!vendorId,
  });
}

export function useTradeCategories() {
  return useQuery({
    queryKey: ['trade-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trade_categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as TradeCategory[];
    },
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      vendor,
      tradeIds,
    }: {
      vendor: Omit<Vendor, 'id' | 'created_at' | 'updated_at'>;
      tradeIds: string[];
    }) => {
      // Insert vendor
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .insert(vendor)
        .select()
        .single();

      if (vendorError) throw vendorError;

      // Insert vendor trades
      if (tradeIds.length > 0) {
        const vendorTrades = tradeIds.map((tradeId) => ({
          vendor_id: vendorData.id,
          trade_category_id: tradeId,
        }));

        const { error: tradesError } = await supabase
          .from('vendor_trades')
          .insert(vendorTrades);

        if (tradesError) throw tradesError;
      }

      return vendorData as Vendor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Vendor> & { id: string }) => {
      const { data, error } = await supabase
        .from('vendors')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Vendor;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendors', data.id] });
    },
  });
}

// Update vendor trades (replace all trades with new set)
export function useUpdateVendorTrades() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ vendorId, tradeIds }: { vendorId: string; tradeIds: string[] }) => {
      // Delete existing trades
      const { error: deleteError } = await supabase
        .from('vendor_trades')
        .delete()
        .eq('vendor_id', vendorId);

      if (deleteError) throw deleteError;

      // Insert new trades
      if (tradeIds.length > 0) {
        const vendorTrades = tradeIds.map((tradeId) => ({
          vendor_id: vendorId,
          trade_category_id: tradeId,
        }));

        const { error: insertError } = await supabase
          .from('vendor_trades')
          .insert(vendorTrades);

        if (insertError) throw insertError;
      }

      return { vendorId, tradeIds };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-trades', data.vendorId] });
    },
  });
}

// Delete a vendor
export function useDeleteVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vendorId: string) => {
      // Delete vendor trades first (foreign key constraint)
      const { error: tradesError } = await supabase
        .from('vendor_trades')
        .delete()
        .eq('vendor_id', vendorId);

      if (tradesError) throw tradesError;

      // Delete the vendor
      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', vendorId);

      if (error) throw error;
      return vendorId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
}

// Search vendors by name
export function useSearchVendors(searchTerm: string) {
  const { data: vendors, ...rest } = useVendors();

  const filtered = vendors?.filter((vendor) =>
    vendor.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.poc_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return {
    data: filtered,
    ...rest,
  };
}
