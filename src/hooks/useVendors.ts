import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Vendor, TradeCategory } from '../lib/types';

export function useVendors() {
  return useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('status', 'active')
        .order('company_name', { ascending: true });

      if (error) throw error;
      return data as Vendor[];
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
