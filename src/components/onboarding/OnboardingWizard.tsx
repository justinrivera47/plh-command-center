import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { Project, RFIStatus, StallReason } from '../../lib/types';
import type { RoleSelectFormData, AddProjectsFormData, FirstFireFormData } from '../../lib/schemas';

import { RoleSelect } from './RoleSelect';
import { AddProjects } from './AddProjects';
import { FirstFire } from './FirstFire';
import { ImportOrSkip } from './ImportOrSkip';
import { OnboardingDone } from './OnboardingDone';

type Step = 'role' | 'projects' | 'first-fire' | 'import' | 'done';

const STEPS: Step[] = ['role', 'projects', 'first-fire', 'import', 'done'];

// Map blocking type to RFI status and stall reason
function mapBlockingTypeToRFI(blockingType: FirstFireFormData['blocking_type']): {
  status: RFIStatus;
  stall_reason: StallReason | null;
} {
  switch (blockingType) {
    case 'waiting_on_someone':
      return { status: 'waiting_on_client', stall_reason: 'avoiding_contact' };
    case 'missing_info':
      return { status: 'waiting_on_me', stall_reason: 'missing_info' };
    case 'havent_started':
      return { status: 'waiting_on_me', stall_reason: 'deprioritized' };
    case 'unclear_next_step':
      return { status: 'waiting_on_me', stall_reason: 'unclear_next_step' };
    default:
      return { status: 'open', stall_reason: null };
  }
}

export function OnboardingWizard() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>('role');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Collected data across steps
  const [role, setRole] = useState<RoleSelectFormData['role'] | null>(null);
  const [createdProjects, setCreatedProjects] = useState<Project[]>([]);
  const [hasFirstFire, setHasFirstFire] = useState(false);

  const currentStepIndex = STEPS.indexOf(currentStep);

  // Step 1: Save role
  async function handleRoleSelect(data: RoleSelectFormData) {
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ role: data.role })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setRole(data.role);
      setCurrentStep('projects');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save role');
    } finally {
      setSaving(false);
    }
  }

  // Step 2: Save projects
  async function handleAddProjects(data: AddProjectsFormData) {
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      const projectsToInsert = data.projects.map((p) => ({
        user_id: user.id,
        name: p.name,
        client_name: p.client_name,
        address: p.address || null,
        client_email: p.client_email || null,
        client_phone: p.client_phone || null,
        total_budget: p.total_budget || null,
        status: 'active' as const,
      }));

      const { data: insertedProjects, error: insertError } = await supabase
        .from('projects')
        .insert(projectsToInsert)
        .select();

      if (insertError) throw insertError;

      setCreatedProjects(insertedProjects as Project[]);
      setCurrentStep('first-fire');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save projects');
    } finally {
      setSaving(false);
    }
  }

  // Step 3: Save first fire (first RFI)
  async function handleFirstFire(data: FirstFireFormData) {
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      const { status, stall_reason } = mapBlockingTypeToRFI(data.blocking_type);

      // Determine POC type based on blocking type selection
      let pocType = data.poc_type || null;
      if (data.blocking_type === 'waiting_on_someone' && data.poc_type) {
        pocType = data.poc_type;
      }

      // Build scope from missing_info if applicable
      let scope = null;
      if (data.blocking_type === 'missing_info' && data.missing_info) {
        scope = `Missing: ${data.missing_info}`;
      }

      const rfiToInsert = {
        user_id: user.id,
        project_id: data.project_id,
        task: data.task,
        scope,
        poc_type: pocType,
        poc_name: data.poc_name || null,
        status,
        priority: 'P1' as const,
        stall_reason,
        is_blocking: false,
        is_complete: false,
        follow_up_days: 3,
      };

      const { error: insertError } = await supabase.from('rfis').insert(rfiToInsert);

      if (insertError) throw insertError;

      setHasFirstFire(true);
      setCurrentStep('import');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task');
    } finally {
      setSaving(false);
    }
  }

  // Step 4: Handle import or skip
  async function handleImportOrSkip(_imported: boolean) {
    // For now, just proceed to done step
    // Full CSV import can be added later
    await completeOnboarding();
  }

  // Final: Complete onboarding
  async function completeOnboarding() {
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setCurrentStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding');
    } finally {
      setSaving(false);
    }
  }

  function goBack() {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  }

  return (
    <div className="min-h-screen bg-surface-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress indicator - show for steps 1-4, not for done */}
        {currentStep !== 'done' && (
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2">
              {STEPS.slice(0, -1).map((step, i) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-3 h-3 rounded-full transition-colors ${
                      i <= currentStepIndex ? 'bg-primary-600' : 'bg-gray-300'
                    }`}
                  />
                  {i < STEPS.length - 2 && (
                    <div
                      className={`w-8 h-0.5 transition-colors ${
                        i < currentStepIndex ? 'bg-primary-600' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-border p-6 md:p-8">
          {/* Error display */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md mb-4">
              {error}
            </div>
          )}

          {/* Loading overlay */}
          {saving && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          )}

          {/* Step content */}
          <div className={saving ? 'opacity-50 pointer-events-none' : ''}>
            {currentStep === 'role' && (
              <RoleSelect onNext={handleRoleSelect} defaultValue={role || undefined} />
            )}

            {currentStep === 'projects' && (
              <AddProjects onNext={handleAddProjects} onBack={goBack} />
            )}

            {currentStep === 'first-fire' && (
              <FirstFire
                projects={createdProjects}
                onNext={handleFirstFire}
                onBack={goBack}
              />
            )}

            {currentStep === 'import' && (
              <ImportOrSkip onNext={handleImportOrSkip} onBack={goBack} />
            )}

            {currentStep === 'done' && (
              <OnboardingDone
                projectCount={createdProjects.length}
                hasFirstFire={hasFirstFire}
              />
            )}
          </div>
        </div>

        {/* Step indicator text */}
        {currentStep !== 'done' && (
          <p className="text-center text-sm text-text-secondary mt-4">
            Step {currentStepIndex + 1} of {STEPS.length - 1}
          </p>
        )}
      </div>
    </div>
  );
}
