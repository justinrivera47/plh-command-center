import { type FieldDefinition } from '../../lib/importSchemas';

interface ColumnMapperProps {
  csvHeaders: string[];
  targetFields: FieldDefinition[];
  mapping: Record<string, string>;
  onMappingChange: (mapping: Record<string, string>) => void;
}

export function ColumnMapper({
  csvHeaders,
  targetFields,
  mapping,
  onMappingChange,
}: ColumnMapperProps) {
  const handleFieldChange = (fieldKey: string, csvColumn: string) => {
    onMappingChange({
      ...mapping,
      [fieldKey]: csvColumn,
    });
  };

  const getMappedColumn = (fieldKey: string) => {
    return mapping[fieldKey] || '';
  };

  const isColumnUsed = (csvColumn: string, excludeField: string) => {
    return Object.entries(mapping).some(
      ([key, value]) => value === csvColumn && key !== excludeField
    );
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Match your CSV columns to the database fields. Required fields are marked with *.
      </p>

      <div className="space-y-3">
        {targetFields.map((field) => {
          const currentValue = getMappedColumn(field.key);
          const isMapped = !!currentValue;

          return (
            <div
              key={field.key}
              className={`flex items-center gap-4 p-3 rounded-lg border ${
                field.required && !isMapped
                  ? 'border-amber-300 bg-amber-50'
                  : isMapped
                    ? 'border-green-200 bg-green-50'
                    : 'border-border bg-white'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text-primary">
                    {field.label}
                  </span>
                  {field.required && (
                    <span className="text-red-500 text-sm">*</span>
                  )}
                </div>
                {!isMapped && field.required && (
                  <p className="text-xs text-amber-600 mt-0.5">
                    Required - please select a column
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-text-secondary text-sm">
                  maps to
                </span>
                <select
                  value={currentValue}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  className={`w-48 px-3 py-2 border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    isMapped ? 'border-green-300' : 'border-border'
                  }`}
                >
                  <option value="">-- Skip this field --</option>
                  {csvHeaders.map((header) => {
                    const used = isColumnUsed(header, field.key);
                    return (
                      <option
                        key={header}
                        value={header}
                        disabled={used}
                        className={used ? 'text-gray-400' : ''}
                      >
                        {header} {used ? '(already mapped)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mapping summary */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-sm">
          <span className="text-text-secondary">Mapped: </span>
          <span className="font-medium text-text-primary">
            {Object.values(mapping).filter(Boolean).length} of {targetFields.length} fields
          </span>
        </div>
        {targetFields.some(f => f.required && !mapping[f.key]) && (
          <p className="text-sm text-amber-600 mt-1">
            Some required fields are not mapped
          </p>
        )}
      </div>
    </div>
  );
}
