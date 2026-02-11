import { useState, useCallback, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { useCSVImport, type ImportResult, type ValidationError } from '../../hooks/useCSVImport';
import { useActiveProjects, useCreateProject } from '../../hooks/useProjects';
import { useAuth } from '../../hooks/useAuth';
import {
  type ImportType,
  IMPORT_TYPE_CONFIG,
  getFieldsForType,
  autoDetectMapping,
} from '../../lib/importSchemas';
import { ColumnMapper } from './ColumnMapper';
import { ImportPreview } from './ImportPreview';

type ImportStep = 'select_type' | 'select_project' | 'upload' | 'map_columns' | 'preview' | 'importing' | 'summary';

// Import types that require a project to be selected
const PROJECT_REQUIRED_TYPES: ImportType[] = ['tasks', 'budget_items'];

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
}

export function ImportModal({ open, onClose }: ImportModalProps) {
  const [step, setStep] = useState<ImportStep>('select_type');
  const [importType, setImportType] = useState<ImportType | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [validatedData, setValidatedData] = useState<unknown[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [skipRows, setSkipRows] = useState<number>(0);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Project selection state
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [newClientName, setNewClientName] = useState<string>('');
  const [projectSource, setProjectSource] = useState<'existing' | 'new' | 'csv'>('new');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { parseFile, applyMapping, validateData, importData, progress } = useCSVImport();
  const { data: projects } = useActiveProjects();
  const createProject = useCreateProject();
  const { user } = useAuth();

  const resetState = useCallback(() => {
    setStep('select_type');
    setImportType(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setColumnMapping({});
    setValidatedData([]);
    setValidationErrors([]);
    setImportResult(null);
    setFileName('');
    setSkipRows(0);
    setPendingFile(null);
    setSelectedProjectId('');
    setNewProjectName('');
    setNewClientName('');
    setProjectSource('new');
  }, []);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleTypeSelect = (type: ImportType) => {
    setImportType(type);
    // For tasks and budget_items, go to project selection first
    if (PROJECT_REQUIRED_TYPES.includes(type)) {
      setStep('select_project');
    } else {
      setStep('upload');
    }
  };

  const handleProjectContinue = () => {
    if (projectSource === 'existing' && !selectedProjectId) {
      toast.error('Please select a project');
      return;
    }
    if (projectSource === 'new') {
      if (!newProjectName.trim()) {
        toast.error('Please enter a project name');
        return;
      }
      if (!newClientName.trim()) {
        toast.error('Please enter a client name');
        return;
      }
    }
    setStep('upload');
  };

  // Get the project name to inject into rows (when not using CSV column)
  const getProjectNameForInjection = (): string | null => {
    if (projectSource === 'csv') return null; // Use CSV column
    if (projectSource === 'existing') {
      const project = projects?.find(p => p.id === selectedProjectId);
      return project?.name || null;
    }
    if (projectSource === 'new') {
      return newProjectName.trim();
    }
    return null;
  };

  const handleFileSelect = async (file: File, rowsToSkip: number = 0) => {
    try {
      setFileName(file.name);
      setPendingFile(file);
      setSkipRows(rowsToSkip);
      const { headers, rows } = await parseFile(file, rowsToSkip);
      setCsvHeaders(headers);
      setCsvRows(rows);

      // Auto-detect column mapping
      if (importType) {
        const autoMapping = autoDetectMapping(headers, importType);
        setColumnMapping(autoMapping);
      }

      setStep('map_columns');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to parse file');
    }
  };

  const handleSkipRowsChange = async (newSkipRows: number) => {
    if (!pendingFile) return;
    setSkipRows(newSkipRows);

    try {
      const { headers, rows } = await parseFile(pendingFile, newSkipRows);
      setCsvHeaders(headers);
      setCsvRows(rows);

      // Re-run auto-detect with new headers
      if (importType) {
        const autoMapping = autoDetectMapping(headers, importType);
        setColumnMapping(autoMapping);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to parse file');
    }
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      handleFileSelect(file);
    }
  }, [importType]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleMappingContinue = () => {
    if (!importType) return;

    // Check required fields (skip project_name if project is selected from UI)
    const fields = getFieldsForType(importType);
    const projectNameFromUI = getProjectNameForInjection();
    const missingRequired = fields.filter(f => {
      // If project is selected from UI, don't require project_name mapping
      if (f.key === 'project_name' && projectNameFromUI) return false;
      return f.required && !columnMapping[f.key];
    });

    if (missingRequired.length > 0) {
      toast.error(`Please map required fields: ${missingRequired.map(f => f.label).join(', ')}`);
      return;
    }

    // Apply mapping and validate
    let mappedData = applyMapping(csvRows, columnMapping);

    // Inject project name if selected from UI (not from CSV)
    if (projectNameFromUI && PROJECT_REQUIRED_TYPES.includes(importType)) {
      mappedData = mappedData.map(row => ({
        ...row,
        project_name: projectNameFromUI,
      }));
    }

    const { valid, errors } = validateData(mappedData, importType);

    setValidatedData(valid);
    setValidationErrors(errors);
    setStep('preview');
  };

  const handleImport = async () => {
    if (!importType || validatedData.length === 0 || !user) return;

    setStep('importing');

    try {
      // If creating a new project, create it first
      if (projectSource === 'new' && PROJECT_REQUIRED_TYPES.includes(importType)) {
        try {
          await createProject.mutateAsync({
            user_id: user.id,
            name: newProjectName.trim(),
            client_name: newClientName.trim(),
            status: 'active',
            userId: user.id,
          });
          toast.success(`Created project: ${newProjectName}`);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to create project');
          setStep('preview');
          return;
        }
      }

      const result = await importData(validatedData, importType);
      setImportResult(result);
      setStep('summary');
      toast.success(`Imported ${result.success} rows successfully`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
      setStep('preview');
    }
  };

  const renderStepIndicator = () => {
    // Adjust steps based on whether project selection is needed
    const needsProjectStep = importType && PROJECT_REQUIRED_TYPES.includes(importType);
    const steps = needsProjectStep
      ? ['Type', 'Project', 'Upload', 'Map', 'Preview']
      : ['Type', 'Upload', 'Map', 'Preview', 'Import'];
    const currentIdx = needsProjectStep
      ? {
          select_type: 0,
          select_project: 1,
          upload: 2,
          map_columns: 3,
          preview: 4,
          importing: 4,
          summary: 4,
        }[step]
      : {
          select_type: 0,
          select_project: 0,
          upload: 1,
          map_columns: 2,
          preview: 3,
          importing: 4,
          summary: 4,
        }[step];

    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((s, idx) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                idx < currentIdx
                  ? 'bg-green-500 text-white'
                  : idx === currentIdx
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-text-secondary'
              }`}
            >
              {idx < currentIdx ? '✓' : idx + 1}
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`w-8 h-0.5 mx-1 ${
                  idx < currentIdx ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed z-50 bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold text-text-primary">
                Import Data from CSV
              </Dialog.Title>
              <Dialog.Close className="p-1 hover:bg-gray-100 rounded text-text-secondary">
                ✕
              </Dialog.Close>
            </div>

            {/* Step indicator */}
            {step !== 'summary' && renderStepIndicator()}

            {/* Step: Select Type */}
            {step === 'select_type' && (
              <div className="space-y-4">
                <p className="text-sm text-text-secondary">
                  What type of data would you like to import?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.entries(IMPORT_TYPE_CONFIG) as [ImportType, typeof IMPORT_TYPE_CONFIG.projects][]).map(
                    ([type, config]) => (
                      <button
                        key={type}
                        onClick={() => handleTypeSelect(type)}
                        className="p-4 border border-border rounded-lg hover:border-primary-300 hover:bg-primary-50 text-left transition-colors"
                      >
                        <span className="font-medium text-text-primary block">
                          {config.label}
                        </span>
                        <span className="text-sm text-text-secondary mt-1 block">
                          {config.description}
                        </span>
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Step: Select Project */}
            {step === 'select_project' && importType && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => setStep('select_type')}
                    className="text-sm text-text-secondary hover:text-text-primary"
                  >
                    ← Back
                  </button>
                  <span className="text-sm text-text-secondary">|</span>
                  <span className="text-sm font-medium text-text-primary">
                    {IMPORT_TYPE_CONFIG[importType].label}
                  </span>
                </div>

                <p className="text-sm text-text-secondary">
                  Which project should these items be added to?
                </p>

                {/* Project source selection */}
                <div className="space-y-3">
                  {/* Existing project option */}
                  <label
                    className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      projectSource === 'existing'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-border hover:border-primary-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="projectSource"
                      value="existing"
                      checked={projectSource === 'existing'}
                      onChange={() => setProjectSource('existing')}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-text-primary">Existing project</span>
                      <p className="text-sm text-text-secondary mt-1">
                        Add items to a project you've already created
                      </p>
                      {projectSource === 'existing' && (
                        <select
                          value={selectedProjectId}
                          onChange={(e) => setSelectedProjectId(e.target.value)}
                          className="mt-2 w-full px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">Select a project...</option>
                          {projects?.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </label>

                  {/* New project option */}
                  <label
                    className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      projectSource === 'new'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-border hover:border-primary-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="projectSource"
                      value="new"
                      checked={projectSource === 'new'}
                      onChange={() => setProjectSource('new')}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-text-primary">New project</span>
                      <p className="text-sm text-text-secondary mt-1">
                        Create a new project for these items
                      </p>
                      {projectSource === 'new' && (
                        <div className="space-y-2 mt-2">
                          <input
                            type="text"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            placeholder="Project name *"
                            className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                          <input
                            type="text"
                            value={newClientName}
                            onChange={(e) => setNewClientName(e.target.value)}
                            placeholder="Client name *"
                            className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      )}
                    </div>
                  </label>

                  {/* From CSV option */}
                  <label
                    className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      projectSource === 'csv'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-border hover:border-primary-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="projectSource"
                      value="csv"
                      checked={projectSource === 'csv'}
                      onChange={() => setProjectSource('csv')}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-text-primary">From CSV column</span>
                      <p className="text-sm text-text-secondary mt-1">
                        My CSV file has a project name column that I'll map later
                      </p>
                    </div>
                  </label>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleProjectContinue}
                    className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step: Upload File */}
            {step === 'upload' && importType && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => PROJECT_REQUIRED_TYPES.includes(importType) ? setStep('select_project') : setStep('select_type')}
                    className="text-sm text-text-secondary hover:text-text-primary"
                  >
                    ← Back
                  </button>
                  <span className="text-sm text-text-secondary">|</span>
                  <span className="text-sm font-medium text-text-primary">
                    {IMPORT_TYPE_CONFIG[importType].label}
                  </span>
                </div>

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary-300 hover:bg-primary-50 transition-colors"
                >
                  <div className="text-4xl mb-3">📄</div>
                  <p className="font-medium text-text-primary mb-1">
                    Drop your CSV file here
                  </p>
                  <p className="text-sm text-text-secondary">
                    or click to browse
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>

                {/* Show selected project info if applicable */}
                {PROJECT_REQUIRED_TYPES.includes(importType) && projectSource !== 'csv' && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <span className="font-medium">Project:</span>{' '}
                      {projectSource === 'existing'
                        ? projects?.find(p => p.id === selectedProjectId)?.name
                        : newProjectName}
                      {projectSource === 'new' && newClientName && (
                        <span className="text-green-600"> (Client: {newClientName})</span>
                      )}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      {projectSource === 'new'
                        ? 'A new project will be created and all items will be added to it'
                        : 'All imported items will be added to this project'}
                    </p>
                  </div>
                )}

                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-text-primary mb-2">
                    Expected columns:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {IMPORT_TYPE_CONFIG[importType].requiredFields
                      .filter(f => {
                        // Don't show project_name as required if a project is selected from UI
                        if (f === 'project_name' && projectSource !== 'csv') return false;
                        return true;
                      })
                      .map((f) => (
                        <span
                          key={f}
                          className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded"
                        >
                          {f} *
                        </span>
                      ))}
                    {IMPORT_TYPE_CONFIG[importType].optionalFields.map((f) => (
                      <span
                        key={f}
                        className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step: Map Columns */}
            {step === 'map_columns' && importType && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => setStep('upload')}
                    className="text-sm text-text-secondary hover:text-text-primary"
                  >
                    ← Back
                  </button>
                  <span className="text-sm text-text-secondary">|</span>
                  <span className="text-sm text-text-secondary">
                    {fileName} ({csvRows.length} rows)
                  </span>
                </div>

                {/* Skip rows option */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-blue-800 font-medium whitespace-nowrap">
                      Skip rows before header:
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={skipRows}
                      onChange={(e) => handleSkipRowsChange(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-16 px-2 py-1 border border-blue-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs text-blue-600">
                      (Use if your CSV has title/description rows before the column headers)
                    </span>
                  </div>
                  {csvHeaders.length > 0 && (
                    <div className="mt-2 text-xs text-blue-700">
                      Detected columns: {csvHeaders.slice(0, 5).join(', ')}{csvHeaders.length > 5 ? `, +${csvHeaders.length - 5} more` : ''}
                    </div>
                  )}
                </div>

                {/* Show project confirmation if selected from UI */}
                {PROJECT_REQUIRED_TYPES.includes(importType) && projectSource !== 'csv' && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <span className="font-medium">Project:</span>{' '}
                      {projectSource === 'existing'
                        ? projects?.find(p => p.id === selectedProjectId)?.name
                        : newProjectName}
                      {projectSource === 'new' && newClientName && (
                        <span className="text-green-600"> (Client: {newClientName})</span>
                      )}
                    </p>
                  </div>
                )}

                <ColumnMapper
                  csvHeaders={csvHeaders}
                  targetFields={getFieldsForType(importType).filter(field => {
                    // Hide project_name field if project is selected from UI
                    if (field.key === 'project_name' && projectSource !== 'csv') return false;
                    return true;
                  })}
                  mapping={columnMapping}
                  onMappingChange={setColumnMapping}
                />

                <div className="flex justify-end">
                  <button
                    onClick={handleMappingContinue}
                    className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Continue to Preview
                  </button>
                </div>
              </div>
            )}

            {/* Step: Preview */}
            {step === 'preview' && importType && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => setStep('map_columns')}
                    className="text-sm text-text-secondary hover:text-text-primary"
                  >
                    ← Back to Mapping
                  </button>
                </div>

                <ImportPreview
                  data={applyMapping(csvRows, columnMapping)}
                  errors={validationErrors}
                  fields={getFieldsForType(importType)}
                  validCount={validatedData.length}
                  errorCount={csvRows.length - validatedData.length}
                />

                <div className="flex justify-between items-center pt-4 border-t border-border">
                  <p className="text-sm text-text-secondary">
                    {validatedData.length} rows will be imported
                    {validationErrors.length > 0 && `, ${csvRows.length - validatedData.length} will be skipped`}
                  </p>
                  <button
                    onClick={handleImport}
                    disabled={validatedData.length === 0}
                    className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Import {validatedData.length} Rows
                  </button>
                </div>
              </div>
            )}

            {/* Step: Importing */}
            {step === 'importing' && (
              <div className="py-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                <p className="font-medium text-text-primary mb-2">Importing data...</p>
                <p className="text-sm text-text-secondary">{progress}% complete</p>
                <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Step: Summary */}
            {step === 'summary' && importResult && (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-3xl">✓</span>
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">
                    Import Complete
                  </h3>
                  <p className="text-text-secondary">
                    Successfully imported {importResult.success} rows
                    {importResult.failed > 0 && `, ${importResult.failed} failed`}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-700">{importResult.success}</p>
                    <p className="text-sm text-green-600">Successful</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-red-700">{importResult.failed}</p>
                    <p className="text-sm text-red-600">Failed</p>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-800 mb-2">
                      Errors ({importResult.errors.length})
                    </p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {importResult.errors.map((err, idx) => (
                        <p key={idx} className="text-xs text-red-700">
                          Row {err.row}: {err.message}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <button
                    onClick={resetState}
                    className="px-4 py-2 border border-border text-text-primary font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Import More
                  </button>
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
