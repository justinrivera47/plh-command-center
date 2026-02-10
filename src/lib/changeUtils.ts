/**
 * Utility functions for detecting and formatting changes
 */

interface ChangeEntry {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

/**
 * Compare two objects and return an array of changed fields.
 * Only compares fields that exist in the newObj (partial updates).
 *
 * @param oldObj - The original object
 * @param newObj - The updated object (partial)
 * @param fieldsToTrack - Optional list of fields to track (defaults to all keys in newObj)
 */
export function detectChanges<T extends object>(
  oldObj: T | null,
  newObj: Partial<T>,
  fieldsToTrack?: (keyof T)[]
): ChangeEntry[] {
  const changes: ChangeEntry[] = [];

  const fields = fieldsToTrack || (Object.keys(newObj) as (keyof T)[]);

  for (const field of fields) {
    if (field in newObj) {
      const oldValue = oldObj ? oldObj[field] : undefined;
      const newValue = newObj[field];

      // Compare values (handle null, undefined, and actual changes)
      if (!valuesEqual(oldValue, newValue)) {
        changes.push({
          field: String(field),
          oldValue,
          newValue,
        });
      }
    }
  }

  return changes;
}

/**
 * Check if two values are equal (handles null, undefined, numbers, strings)
 */
function valuesEqual(a: unknown, b: unknown): boolean {
  // Both null or undefined
  if (a == null && b == null) return true;

  // One is null/undefined, other isn't
  if (a == null || b == null) return false;

  // Compare as strings for consistent comparison
  return String(a) === String(b);
}

/**
 * Format a field name for display (replace underscores with spaces, capitalize)
 */
export function formatFieldName(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Format a currency value for display
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a relative time string (e.g., "2m ago", "3h ago", "5d ago")
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
