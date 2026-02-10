import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../hooks/useAuth';
import { useUIStore } from '../../stores/uiStore';
import { followUpSettingsSchema, type FollowUpSettingsFormData } from '../../lib/schemas';
import { USER_ROLES } from '../../lib/constants';
import { ImportModal } from '../import';

export function SettingsPage() {
  const { user, profile, signOut, updateProfile } = useAuth();
  const { importModalOpen, openImportModal, closeImportModal } = useUIStore();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FollowUpSettingsFormData>({
    resolver: zodResolver(followUpSettingsSchema),
    defaultValues: {
      follow_up_days_client: profile?.follow_up_days_client || 3,
      follow_up_days_vendor: profile?.follow_up_days_vendor || 5,
      follow_up_days_contractor: profile?.follow_up_days_contractor || 3,
    },
  });

  const onSubmit = async (data: FollowUpSettingsFormData) => {
    setSaving(true);
    setSaved(false);

    try {
      await updateProfile(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const roleLabel = USER_ROLES.find((r) => r.value === profile?.role)?.label || 'Not set';

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Settings</h1>
        <p className="text-sm text-text-secondary">Manage your preferences</p>
      </div>

      {/* Account Info */}
      <section className="bg-white rounded-lg border border-border p-4 mb-6">
        <h2 className="font-medium text-text-primary mb-4">Account</h2>
        <div className="space-y-3">
          <div>
            <span className="text-sm text-text-secondary">Email</span>
            <p className="text-text-primary">{user?.email}</p>
          </div>
          <div>
            <span className="text-sm text-text-secondary">Role</span>
            <p className="text-text-primary">{roleLabel}</p>
          </div>
        </div>
      </section>

      {/* Follow-up Settings */}
      <section className="bg-white rounded-lg border border-border p-4 mb-6">
        <h2 className="font-medium text-text-primary mb-4">Follow-up Reminders</h2>
        <p className="text-sm text-text-secondary mb-4">
          Set how many days until a task becomes overdue based on who you're waiting on.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="flex items-center justify-between">
              <span className="text-sm text-text-primary">
                <span className="mr-2">👤</span>Waiting on Client
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="30"
                  {...register('follow_up_days_client', { valueAsNumber: true })}
                  className="w-16 px-2 py-1 border border-border rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-sm text-text-secondary">days</span>
              </div>
            </label>
            {errors.follow_up_days_client && (
              <p className="text-xs text-red-600 mt-1">{errors.follow_up_days_client.message}</p>
            )}
          </div>

          <div>
            <label className="flex items-center justify-between">
              <span className="text-sm text-text-primary">
                <span className="mr-2">📦</span>Waiting on Vendor
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="30"
                  {...register('follow_up_days_vendor', { valueAsNumber: true })}
                  className="w-16 px-2 py-1 border border-border rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-sm text-text-secondary">days</span>
              </div>
            </label>
            {errors.follow_up_days_vendor && (
              <p className="text-xs text-red-600 mt-1">{errors.follow_up_days_vendor.message}</p>
            )}
          </div>

          <div>
            <label className="flex items-center justify-between">
              <span className="text-sm text-text-primary">
                <span className="mr-2">🔨</span>Waiting on Contractor
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="30"
                  {...register('follow_up_days_contractor', { valueAsNumber: true })}
                  className="w-16 px-2 py-1 border border-border rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-sm text-text-secondary">days</span>
              </div>
            </label>
            {errors.follow_up_days_contractor && (
              <p className="text-xs text-red-600 mt-1">{errors.follow_up_days_contractor.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 px-4 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
          </button>
        </form>
      </section>

      {/* Data Management */}
      <section className="bg-white rounded-lg border border-border p-4 mb-6">
        <h2 className="font-medium text-text-primary mb-4">Data Management</h2>
        <div className="space-y-3">
          <button
            onClick={openImportModal}
            className="w-full py-3 px-4 border border-border rounded-lg hover:border-primary-300 hover:bg-primary-50 text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📄</span>
              <div>
                <span className="font-medium text-text-primary block">Import Data from CSV</span>
                <span className="text-sm text-text-secondary">
                  Import projects, tasks, budget items, or vendors
                </span>
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* App Info */}
      <section className="bg-white rounded-lg border border-border p-4 mb-6">
        <h2 className="font-medium text-text-primary mb-4">About</h2>
        <div className="space-y-2 text-sm text-text-secondary">
          <p>PLH Command Center v1.0.0</p>
          <p>Built for construction project coordination</p>
        </div>
      </section>

      {/* Sign Out */}
      <section className="bg-white rounded-lg border border-border p-4">
        <button
          onClick={() => signOut()}
          className="w-full py-2 px-4 bg-gray-100 text-text-primary font-medium rounded-lg hover:bg-gray-200 transition-colors"
        >
          Sign Out
        </button>
      </section>

      {/* Import Modal */}
      <ImportModal open={importModalOpen} onClose={closeImportModal} />
    </div>
  );
}
