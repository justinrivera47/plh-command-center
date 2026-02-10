import { supabase } from '../lib/supabase';

export type RecordType = 'project' | 'rfi' | 'quote' | 'budget_area' | 'vendor';

interface ChangeEntry {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

interface LogChangeParams {
  recordType: RecordType;
  recordId: string;
  userId: string;
  changes: ChangeEntry[];
  note?: string;
}

interface LogCreationParams {
  recordType: RecordType;
  recordId: string;
  userId: string;
  data: Record<string, unknown>;
  note?: string;
}

interface LogDeletionParams {
  recordType: RecordType;
  recordId: string;
  userId: string;
  data: Record<string, unknown>;
  note?: string;
}

/**
 * Hook for logging changes to the change_log table.
 * Provides functions to log field changes, record creation, and record deletion.
 */
export function useChangeLog() {
  /**
   * Log field-level changes to a record
   */
  const logChange = async ({ recordType, recordId, userId, changes, note }: LogChangeParams) => {
    if (changes.length === 0) return;

    const entries = changes.map((change) => ({
      record_type: recordType,
      record_id: recordId,
      field_name: change.field,
      old_value: change.oldValue != null ? String(change.oldValue) : null,
      new_value: change.newValue != null ? String(change.newValue) : null,
      changed_by: userId,
      note: note || null,
    }));

    const { error } = await supabase.from('change_log').insert(entries);
    if (error) {
      console.error('Failed to log changes:', error);
    }
  };

  /**
   * Log record creation
   */
  const logCreation = async ({ recordType, recordId, userId, data, note }: LogCreationParams) => {
    const { error } = await supabase.from('change_log').insert({
      record_type: recordType,
      record_id: recordId,
      field_name: '_created',
      old_value: null,
      new_value: JSON.stringify(data),
      changed_by: userId,
      note: note || 'Record created',
    });

    if (error) {
      console.error('Failed to log creation:', error);
    }
  };

  /**
   * Log record deletion
   */
  const logDeletion = async ({ recordType, recordId, userId, data, note }: LogDeletionParams) => {
    const { error } = await supabase.from('change_log').insert({
      record_type: recordType,
      record_id: recordId,
      field_name: '_deleted',
      old_value: JSON.stringify(data),
      new_value: null,
      changed_by: userId,
      note: note || 'Record deleted',
    });

    if (error) {
      console.error('Failed to log deletion:', error);
    }
  };

  return { logChange, logCreation, logDeletion };
}
