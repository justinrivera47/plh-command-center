import { useState } from 'react';

interface ImportOrSkipProps {
  onNext: (imported: boolean) => void;
  onBack: () => void;
}

export function ImportOrSkip({ onNext, onBack }: ImportOrSkipProps) {
  const [showImportInfo, setShowImportInfo] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-text-primary mb-2">
          Import existing data?
        </h2>
        <p className="text-text-secondary">
          You can import data from spreadsheets or start fresh and add everything manually.
        </p>
      </div>

      <div className="space-y-4">
        {/* Start Fresh Option */}
        <button
          onClick={() => onNext(false)}
          className="w-full p-6 rounded-lg border-2 border-primary-600 bg-primary-50 hover:bg-primary-100 transition-colors text-left"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-text-primary text-lg">Start Fresh</div>
              <div className="text-sm text-text-secondary mt-1">
                Jump right in and add your data as you go. Recommended for most users.
              </div>
            </div>
          </div>
        </button>

        {/* Import Option */}
        <button
          onClick={() => setShowImportInfo(true)}
          className="w-full p-6 rounded-lg border-2 border-border hover:border-gray-300 transition-colors text-left"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-text-primary text-lg">Upload Spreadsheets</div>
              <div className="text-sm text-text-secondary mt-1">
                Import RFIs, vendors, or budget data from CSV files.
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Import Info Modal */}
      {showImportInfo && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div className="font-medium text-amber-800">CSV Import Coming Soon</div>
              <p className="text-sm text-amber-700 mt-1">
                The full import feature is being built. For now, you can add your data manually using the quick entry forms - it's designed to be fast!
              </p>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowImportInfo(false)}
                  className="text-sm text-amber-700 hover:text-amber-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => onNext(false)}
                  className="text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  Start Fresh Instead
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="text-text-secondary hover:text-text-primary font-medium py-2 px-4"
        >
          Back
        </button>
      </div>
    </div>
  );
}
