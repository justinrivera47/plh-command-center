import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { roleSelectSchema, type RoleSelectFormData } from '../../lib/schemas';
import type { UserRole } from '../../lib/types';

const ROLES: { value: UserRole; label: string; description: string }[] = [
  {
    value: 'project_coordinator',
    label: 'Project Coordinator / Manager',
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

interface RoleSelectProps {
  onNext: (data: RoleSelectFormData) => void;
  defaultValue?: UserRole;
}

export function RoleSelect({ onNext, defaultValue }: RoleSelectProps) {
  const {
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<RoleSelectFormData>({
    resolver: zodResolver(roleSelectSchema),
    defaultValues: {
      role: defaultValue,
    },
  });

  const selectedRole = watch('role');

  return (
    <form onSubmit={handleSubmit(onNext)}>
      <h2 className="text-xl font-bold text-text-primary mb-2">What's your role?</h2>
      <p className="text-text-secondary mb-6">
        This helps us tailor the experience to your workflow.
      </p>

      {errors.role && (
        <p className="text-red-600 text-sm mb-4">{errors.role.message}</p>
      )}

      <div className="space-y-3 mb-8">
        {ROLES.map((role) => (
          <button
            key={role.value}
            type="button"
            onClick={() => setValue('role', role.value)}
            className={`w-full text-left p-4 rounded-lg border-2 transition-colors min-h-[56px] ${
              selectedRole === role.value
                ? 'border-primary-600 bg-primary-50'
                : 'border-border hover:border-gray-300'
            }`}
          >
            <div className="font-medium text-text-primary">{role.label}</div>
            <div className="text-sm text-text-secondary">{role.description}</div>
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!selectedRole}
          className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-6 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </form>
  );
}
