import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { useChangeLog } from './useChangeLog';
import {
  type ImportType,
  getSchemaForType,
  autoDetectMapping,
  type ValidatedProjectRow,
  type ValidatedTaskRow,
  type ValidatedBudgetItemRow,
  type ValidatedVendorRow,
} from '../lib/importSchemas';

// ============================================
// Types
// ============================================

export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: unknown[];
  errors: ValidationError[];
  validCount: number;
  errorCount: number;
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: ValidationError[];
}

// ============================================
// Hook
// ============================================

export function useCSVImport() {
  const { user } = useAuth();
  const { logCreation } = useChangeLog();
  const queryClient = useQueryClient();

  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  // Parse a CSV file and return headers + rows
  // skipRows: number of rows to skip before the header row (for files with description rows at top)
  const parseFile = useCallback(async (file: File, skipRows: number = 0): Promise<ParsedCSV> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: false, // We'll handle headers manually to support skipping rows
        skipEmptyLines: true,
        complete: (results) => {
          const allRows = results.data as string[][];

          if (allRows.length <= skipRows) {
            reject(new Error('Not enough rows after skipping'));
            return;
          }

          // Get headers from the row after skipped rows
          const headers = allRows[skipRows].map((h, idx) =>
            h?.toString().trim() || `Column ${idx + 1}`
          );

          // Convert remaining rows to objects
          const rows: Record<string, string>[] = [];
          for (let i = skipRows + 1; i < allRows.length; i++) {
            const row = allRows[i];
            // Skip if row is empty or has no values
            if (!row || row.every(cell => !cell || !cell.toString().trim())) continue;

            const obj: Record<string, string> = {};
            headers.forEach((header, idx) => {
              obj[header] = row[idx]?.toString().trim() || '';
            });
            rows.push(obj);
          }

          resolve({ headers, rows });
        },
        error: (error) => {
          reject(new Error(`Failed to parse CSV: ${error.message}`));
        },
      });
    });
  }, []);

  // Apply column mapping to transform CSV rows to target format
  const applyMapping = useCallback((
    rows: Record<string, string>[],
    mapping: Record<string, string>
  ): Record<string, string>[] => {
    return rows.map((row) => {
      const mapped: Record<string, string> = {};
      for (const [targetField, sourceColumn] of Object.entries(mapping)) {
        if (sourceColumn && row[sourceColumn] !== undefined) {
          mapped[targetField] = row[sourceColumn];
        }
      }
      return mapped;
    });
  }, []);

  // Validate data against schema
  const validateData = useCallback((
    data: Record<string, string>[],
    type: ImportType
  ): ValidationResult => {
    const schema = getSchemaForType(type);
    const valid: unknown[] = [];
    const errors: ValidationError[] = [];

    data.forEach((row, index) => {
      const result = schema.safeParse(row);
      if (result.success) {
        valid.push(result.data);
      } else {
        const zodErrors = result.error.issues || [];
        zodErrors.forEach((err) => {
          errors.push({
            row: index + 1, // 1-indexed for user display
            field: String(err.path.join('.')),
            message: err.message,
          });
        });
      }
    });

    return {
      valid,
      errors,
      validCount: valid.length,
      errorCount: data.length - valid.length,
    };
  }, []);

  // Import projects
  const importProjects = useCallback(async (
    data: ValidatedProjectRow[]
  ): Promise<ImportResult> => {
    if (!user) throw new Error('Not authenticated');

    const errors: ValidationError[] = [];
    let success = 0;
    let failed = 0;

    for (let i = 0; i < data.length; i++) {
      setProgress(Math.round(((i + 1) / data.length) * 100));
      const row = data[i];

      try {
        const { data: project, error } = await supabase
          .from('projects')
          .insert({
            user_id: user.id,
            name: row.name,
            client_name: row.client_name,
            address: row.address,
            client_email: row.client_email,
            client_phone: row.client_phone,
            total_budget: row.total_budget,
            status: 'active',
          })
          .select()
          .single();

        if (error) throw error;

        await logCreation({
          recordType: 'project',
          recordId: project.id,
          userId: user.id,
          data: { name: row.name, client_name: row.client_name },
          note: `Imported project: ${row.name}`,
        });

        success++;
      } catch (err) {
        failed++;
        errors.push({
          row: i + 1,
          field: 'general',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    await queryClient.invalidateQueries({ queryKey: ['projects'] });
    return { success, failed, errors };
  }, [user, logCreation, queryClient]);

  // Import tasks/RFIs
  const importTasks = useCallback(async (
    data: ValidatedTaskRow[]
  ): Promise<ImportResult> => {
    if (!user) throw new Error('Not authenticated');

    // Get projects for lookup
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name')
      .eq('user_id', user.id);

    const projectMap = new Map<string, string>(
      (projects || []).map((p) => [p.name.toLowerCase(), p.id])
    );

    const errors: ValidationError[] = [];
    let success = 0;
    let failed = 0;

    for (let i = 0; i < data.length; i++) {
      setProgress(Math.round(((i + 1) / data.length) * 100));
      const row = data[i];

      try {
        // Look up project by name
        const projectId = projectMap.get(row.project_name.toLowerCase());
        if (!projectId) {
          throw new Error(`Project not found: ${row.project_name}`);
        }

        const { error } = await supabase
          .from('rfis')
          .insert({
            user_id: user.id,
            project_id: projectId,
            task: row.task,
            status: row.status,
            priority: row.priority,
            poc_name: row.poc_name,
            poc_type: row.poc_type,
            is_blocking: row.is_blocking,
            is_complete: row.is_complete || row.status === 'completed',
            scope: row.scope,
            latest_update: row.latest_update,
            follow_up_days: 3,
          });

        if (error) throw error;
        success++;
      } catch (err) {
        failed++;
        errors.push({
          row: i + 1,
          field: 'general',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    await queryClient.invalidateQueries({ queryKey: ['rfis'] });
    await queryClient.invalidateQueries({ queryKey: ['war-room'] });
    return { success, failed, errors };
  }, [user, queryClient]);

  // Import budget items
  const importBudgetItems = useCallback(async (
    data: ValidatedBudgetItemRow[]
  ): Promise<ImportResult> => {
    if (!user) throw new Error('Not authenticated');

    // Get projects for lookup
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name')
      .eq('user_id', user.id);

    const projectMap = new Map<string, string>(
      (projects || []).map((p) => [p.name.toLowerCase(), p.id])
    );

    // Get existing budget areas
    const { data: areas } = await supabase
      .from('project_budget_areas')
      .select('id, project_id, area_name');

    const areaMap = new Map<string, string>();
    (areas || []).forEach((a) => {
      const key = `${a.project_id}:${a.area_name.toLowerCase()}`;
      areaMap.set(key, a.id);
    });

    const errors: ValidationError[] = [];
    let success = 0;
    let failed = 0;

    for (let i = 0; i < data.length; i++) {
      setProgress(Math.round(((i + 1) / data.length) * 100));
      const row = data[i];

      try {
        // Look up project by name
        const projectId = projectMap.get(row.project_name.toLowerCase());
        if (!projectId) {
          throw new Error(`Project not found: ${row.project_name}`);
        }

        // Look up or create budget area
        const areaKey = `${projectId}:${row.area_name.toLowerCase()}`;
        let areaId: string | undefined = areaMap.get(areaKey);

        if (!areaId) {
          // Create new budget area
          const { data: newArea, error: areaError } = await supabase
            .from('project_budget_areas')
            .insert({
              project_id: projectId,
              area_name: row.area_name,
              sort_order: 999, // Will be at the end
            })
            .select()
            .single();

          if (areaError) throw areaError;
          areaId = newArea.id as string;
          areaMap.set(areaKey, areaId);
        }

        // Create budget line item
        const { error } = await supabase
          .from('budget_line_items')
          .insert({
            budget_area_id: areaId!,
            item_name: row.item_name,
            budgeted_amount: row.budgeted_amount,
            actual_amount: row.actual_amount,
            sort_order: 999,
          });

        if (error) throw error;
        success++;
      } catch (err) {
        failed++;
        errors.push({
          row: i + 1,
          field: 'general',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    await queryClient.invalidateQueries({ queryKey: ['budget-areas'] });
    await queryClient.invalidateQueries({ queryKey: ['line-items'] });
    await queryClient.invalidateQueries({ queryKey: ['budget-dashboard'] });
    return { success, failed, errors };
  }, [user, queryClient]);

  // Import vendors
  const importVendors = useCallback(async (
    data: ValidatedVendorRow[]
  ): Promise<ImportResult> => {
    if (!user) throw new Error('Not authenticated');

    // Get trade categories for lookup
    const { data: trades } = await supabase
      .from('trade_categories')
      .select('id, name');

    const tradeMap = new Map<string, string>(
      (trades || []).map((t) => [t.name.toLowerCase(), t.id])
    );

    const errors: ValidationError[] = [];
    let success = 0;
    let failed = 0;

    for (let i = 0; i < data.length; i++) {
      setProgress(Math.round(((i + 1) / data.length) * 100));
      const row = data[i];

      try {
        // Create vendor
        const { data: vendor, error: vendorError } = await supabase
          .from('vendors')
          .insert({
            user_id: user.id,
            company_name: row.company_name,
            poc_name: row.poc_name,
            phone: row.phone,
            email: row.email,
            quality_rating: 'unknown',
            communication_rating: 'unknown',
            status: 'active',
          })
          .select()
          .single();

        if (vendorError) throw vendorError;

        // Parse and associate trades
        if (row.trades) {
          const tradeNames = row.trades.split(',').map(t => t.trim());
          const tradeIds: string[] = [];

          for (const tradeName of tradeNames) {
            const tradeId = tradeMap.get(tradeName.toLowerCase());
            if (tradeId) {
              tradeIds.push(tradeId);
            }
          }

          if (tradeIds.length > 0) {
            const vendorTrades = tradeIds.map(tradeId => ({
              vendor_id: vendor.id,
              trade_category_id: tradeId,
            }));

            await supabase
              .from('vendor_trades')
              .insert(vendorTrades);
          }
        }

        await logCreation({
          recordType: 'vendor',
          recordId: vendor.id,
          userId: user.id,
          data: { company_name: row.company_name },
          note: `Imported vendor: ${row.company_name}`,
        });

        success++;
      } catch (err) {
        failed++;
        errors.push({
          row: i + 1,
          field: 'general',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    await queryClient.invalidateQueries({ queryKey: ['vendors'] });
    return { success, failed, errors };
  }, [user, logCreation, queryClient]);

  // Main import function
  const importData = useCallback(async (
    data: unknown[],
    type: ImportType
  ): Promise<ImportResult> => {
    setIsImporting(true);
    setProgress(0);

    try {
      switch (type) {
        case 'projects':
          return await importProjects(data as ValidatedProjectRow[]);
        case 'tasks':
          return await importTasks(data as ValidatedTaskRow[]);
        case 'budget_items':
          return await importBudgetItems(data as ValidatedBudgetItemRow[]);
        case 'vendors':
          return await importVendors(data as ValidatedVendorRow[]);
      }
    } finally {
      setIsImporting(false);
      setProgress(0);
    }
  }, [importProjects, importTasks, importBudgetItems, importVendors]);

  return {
    parseFile,
    applyMapping,
    validateData,
    importData,
    autoDetectMapping,
    isImporting,
    progress,
  };
}
