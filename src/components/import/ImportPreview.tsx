import { type ValidationError } from '../../hooks/useCSVImport';
import { type FieldDefinition } from '../../lib/importSchemas';

interface ImportPreviewProps {
  data: unknown[];
  errors: ValidationError[];
  fields: FieldDefinition[];
  validCount: number;
  errorCount: number;
}

export function ImportPreview({
  data,
  errors,
  fields,
  validCount,
  errorCount,
}: ImportPreviewProps) {
  // Create error lookup by row
  const errorsByRow = new Map<number, ValidationError[]>();
  errors.forEach((err) => {
    const existing = errorsByRow.get(err.row) || [];
    errorsByRow.set(err.row, [...existing, err]);
  });

  // Limit to first 50 rows for preview
  const previewData = data.slice(0, 50);

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-text-primary">
              <span className="font-medium">{validCount}</span> valid
            </span>
          </div>
          {errorCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm text-text-primary">
                <span className="font-medium">{errorCount}</span> with errors
              </span>
            </div>
          )}
        </div>
        <span className="text-sm text-text-secondary">
          Showing {previewData.length} of {data.length} rows
        </span>
      </div>

      {/* Error summary */}
      {errors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-medium text-red-800 mb-2">
            Validation Errors ({errors.length})
          </p>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {errors.slice(0, 10).map((err, idx) => (
              <p key={idx} className="text-xs text-red-700">
                Row {err.row}: {err.field} - {err.message}
              </p>
            ))}
            {errors.length > 10 && (
              <p className="text-xs text-red-600 font-medium">
                ...and {errors.length - 10} more errors
              </p>
            )}
          </div>
        </div>
      )}

      {/* Data preview table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-border">
                <th className="px-3 py-2 text-left font-medium text-text-secondary w-12">
                  #
                </th>
                {fields.map((field) => (
                  <th
                    key={field.key}
                    className="px-3 py-2 text-left font-medium text-text-secondary whitespace-nowrap"
                  >
                    {field.label}
                    {field.required && <span className="text-red-500 ml-0.5">*</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewData.map((row, rowIdx) => {
                const rowNumber = rowIdx + 1;
                const rowErrors = errorsByRow.get(rowNumber) || [];
                const hasError = rowErrors.length > 0;

                return (
                  <tr
                    key={rowIdx}
                    className={`border-b border-border ${
                      hasError ? 'bg-red-50' : 'hover:bg-gray-50'
                    }`}
                    title={
                      hasError
                        ? rowErrors.map((e) => `${e.field}: ${e.message}`).join('\n')
                        : undefined
                    }
                  >
                    <td className="px-3 py-2 text-text-secondary">
                      <span className="flex items-center gap-1">
                        {rowNumber}
                        {hasError && (
                          <span className="w-4 h-4 flex items-center justify-center bg-red-500 text-white rounded-full text-xs">
                            !
                          </span>
                        )}
                      </span>
                    </td>
                    {fields.map((field) => {
                      const value = (row as Record<string, unknown>)[field.key];
                      const fieldError = rowErrors.find((e) => e.field === field.key);

                      return (
                        <td
                          key={field.key}
                          className={`px-3 py-2 ${
                            fieldError
                              ? 'text-red-700 bg-red-100'
                              : 'text-text-primary'
                          }`}
                          title={fieldError?.message}
                        >
                          <span className="block max-w-xs truncate">
                            {value !== null && value !== undefined
                              ? String(value)
                              : <span className="text-text-secondary italic">empty</span>}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Help text */}
      <p className="text-xs text-text-secondary text-center">
        {errorCount > 0
          ? 'Rows with errors will be skipped during import. Fix the errors or proceed to import only valid rows.'
          : 'All rows validated successfully and are ready for import.'}
      </p>
    </div>
  );
}
