import * as Dialog from '@radix-ui/react-dialog';
import { useUIStore } from '../../stores/uiStore';

const ENTRY_TYPES = [
  { type: 'quote', icon: '💰', label: 'Got a quote back' },
  { type: 'status', icon: '🔄', label: 'Status update' },
  { type: 'rfi', icon: '📋', label: 'New task / RFI' },
  { type: 'call', icon: '📞', label: 'Just had a call' },
  { type: 'vendor', icon: '📇', label: 'New vendor' },
] as const;

export function QuickEntryModal() {
  const { quickEntryOpen, quickEntryType, openQuickEntry, closeQuickEntry } = useUIStore();

  return (
    <Dialog.Root open={quickEntryOpen} onOpenChange={(open) => !open && closeQuickEntry()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed z-50 bg-white rounded-t-2xl md:rounded-lg shadow-xl max-h-[85vh] overflow-y-auto bottom-0 left-0 right-0 md:bottom-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-lg md:w-full">
          {/* Handle for mobile */}
          <div className="md:hidden flex justify-center py-2">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          <div className="p-4 md:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold text-text-primary">
                {quickEntryType ? getEntryTypeLabel(quickEntryType) : 'Log it'}
              </Dialog.Title>
              <Dialog.Close className="p-1 hover:bg-gray-100 rounded text-text-secondary">
                ✕
              </Dialog.Close>
            </div>

            {/* Entry type selector (when no type selected) */}
            {!quickEntryType && (
              <div className="grid grid-cols-1 gap-2">
                {ENTRY_TYPES.map((entry) => (
                  <button
                    key={entry.type}
                    onClick={() => openQuickEntry(entry.type)}
                    className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary-300 hover:bg-primary-50 transition-colors text-left"
                  >
                    <span className="text-2xl">{entry.icon}</span>
                    <span className="font-medium text-text-primary">{entry.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Form content based on type */}
            {quickEntryType === 'rfi' && <NewRFIForm />}
            {quickEntryType === 'status' && <StatusUpdateForm />}
            {quickEntryType === 'quote' && <LogQuoteForm />}
            {quickEntryType === 'call' && <CallLogForm />}
            {quickEntryType === 'vendor' && <NewVendorForm />}

            {/* Back button when form is shown */}
            {quickEntryType && (
              <button
                onClick={() => openQuickEntry(null)}
                className="mt-4 text-sm text-text-secondary hover:text-text-primary"
              >
                ← Back to options
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function getEntryTypeLabel(type: string): string {
  const entry = ENTRY_TYPES.find((e) => e.type === type);
  return entry?.label ?? 'Log it';
}

// Placeholder forms - will be fully implemented in Phase 5
function NewRFIForm() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        New task/RFI form coming in Phase 5
      </p>
      <div className="p-4 bg-gray-50 rounded-lg text-center text-text-secondary text-sm">
        This form will allow you to quickly add new tasks and RFIs
      </div>
    </div>
  );
}

function StatusUpdateForm() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Status update form coming in Phase 5
      </p>
      <div className="p-4 bg-gray-50 rounded-lg text-center text-text-secondary text-sm">
        This form will allow you to update task status and add notes
      </div>
    </div>
  );
}

function LogQuoteForm() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Log quote form coming in Phase 5
      </p>
      <div className="p-4 bg-gray-50 rounded-lg text-center text-text-secondary text-sm">
        This form will allow you to log quotes from vendors
      </div>
    </div>
  );
}

function CallLogForm() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Call log form coming in Phase 5
      </p>
      <div className="p-4 bg-gray-50 rounded-lg text-center text-text-secondary text-sm">
        This form will allow you to log calls and their outcomes
      </div>
    </div>
  );
}

function NewVendorForm() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        New vendor form coming in Phase 5
      </p>
      <div className="p-4 bg-gray-50 rounded-lg text-center text-text-secondary text-sm">
        This form will allow you to add new vendors
      </div>
    </div>
  );
}
