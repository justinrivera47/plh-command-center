import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../lib/types';

type Step = 'welcome' | 'role' | 'settings' | 'complete';

const ROLES: { value: UserRole; label: string; description: string }[] = [
  {
    value: 'project_coordinator',
    label: 'Project Coordinator',
    description: 'I manage projects and coordinate between clients, vendors, and contractors',
  },
  {
    value: 'builder_gc',
    label: 'Builder / General Contractor',
    description: 'I oversee construction and manage subcontractors',
  },
  {
    value: 'designer_architect',
    label: 'Designer / Architect',
    description: 'I design spaces and specify materials and finishes',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'My role is different from the above',
  },
];

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>('welcome');
  const [role, setRole] = useState<UserRole | null>(null);
  const [followUpDays, setFollowUpDays] = useState({
    client: 3,
    vendor: 5,
    contractor: 3,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function completeOnboarding() {
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          role,
          follow_up_days_client: followUpDays.client,
          follow_up_days_vendor: followUpDays.vendor,
          follow_up_days_contractor: followUpDays.contractor,
          onboarding_completed: true,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setStep('complete');
      // Brief delay to show completion, then redirect
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            {['welcome', 'role', 'settings'].map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-3 h-3 rounded-full transition-colors ${
                    step === s || ['role', 'settings'].indexOf(step) > ['welcome', 'role', 'settings'].indexOf(s)
                      ? 'bg-primary-600'
                      : 'bg-gray-300'
                  }`}
                />
                {i < 2 && (
                  <div
                    className={`w-12 h-0.5 transition-colors ${
                      ['role', 'settings'].indexOf(step) > i ? 'bg-primary-600' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-border p-8">
          {/* Welcome Step */}
          {step === 'welcome' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-text-primary mb-2">
                Welcome to PLH Command Center
              </h1>
              <p className="text-text-secondary mb-8">
                Let's get you set up in just a couple of steps. This will help us personalize your experience.
              </p>
              <button
                onClick={() => setStep('role')}
                className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-8 rounded-md transition-colors"
              >
                Get Started
              </button>
            </div>
          )}

          {/* Role Selection Step */}
          {step === 'role' && (
            <div>
              <h2 className="text-xl font-bold text-text-primary mb-2">
                What's your role?
              </h2>
              <p className="text-text-secondary mb-6">
                This helps us tailor the experience to your workflow.
              </p>

              <div className="space-y-3 mb-8">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setRole(r.value)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                      role === r.value
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-border hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-text-primary">{r.label}</div>
                    <div className="text-sm text-text-secondary">{r.description}</div>
                  </button>
                ))}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep('welcome')}
                  className="text-text-secondary hover:text-text-primary font-medium py-2 px-4"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('settings')}
                  disabled={!role}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-6 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Settings Step */}
          {step === 'settings' && (
            <div>
              <h2 className="text-xl font-bold text-text-primary mb-2">
                Follow-up Preferences
              </h2>
              <p className="text-text-secondary mb-6">
                Set your default follow-up reminders. You can change these later.
              </p>

              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md mb-4">
                  {error}
                </div>
              )}

              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Client follow-up (days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={followUpDays.client}
                    onChange={(e) =>
                      setFollowUpDays((prev) => ({ ...prev, client: parseInt(e.target.value) || 3 }))
                    }
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-xs text-text-secondary mt-1">
                    Remind me if I haven't heard from a client in this many days
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Vendor follow-up (days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={followUpDays.vendor}
                    onChange={(e) =>
                      setFollowUpDays((prev) => ({ ...prev, vendor: parseInt(e.target.value) || 5 }))
                    }
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-xs text-text-secondary mt-1">
                    Remind me if I haven't heard from a vendor in this many days
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Contractor follow-up (days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={followUpDays.contractor}
                    onChange={(e) =>
                      setFollowUpDays((prev) => ({ ...prev, contractor: parseInt(e.target.value) || 3 }))
                    }
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-xs text-text-secondary mt-1">
                    Remind me if I haven't heard from a contractor in this many days
                  </p>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep('role')}
                  disabled={saving}
                  className="text-text-secondary hover:text-text-primary font-medium py-2 px-4 disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={completeOnboarding}
                  disabled={saving}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-6 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Complete Setup'}
                </button>
              </div>
            </div>
          )}

          {/* Complete Step */}
          {step === 'complete' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-text-primary mb-2">
                You're All Set!
              </h1>
              <p className="text-text-secondary">
                Taking you to your command center...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
