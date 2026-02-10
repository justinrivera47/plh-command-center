import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { firstFireSchema, type FirstFireFormData } from '../../lib/schemas';
import type { Project } from '../../lib/types';

const BLOCKING_OPTIONS = [
  {
    value: 'waiting_on_someone',
    label: 'Waiting on someone',
    description: 'Someone else needs to get back to me',
  },
  {
    value: 'missing_info',
    label: 'Missing information',
    description: "I need specific info before I can proceed",
  },
  {
    value: 'havent_started',
    label: "Haven't gotten to it yet",
    description: "It's on my list but I haven't started",
  },
  {
    value: 'unclear_next_step',
    label: 'Not sure what to do next',
    description: "I'm stuck and unsure how to proceed",
  },
] as const;

const POC_TYPES = [
  { value: 'client', label: 'Client' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'contractor', label: 'Contractor' },
] as const;

interface FirstFireProps {
  projects: Project[];
  onNext: (data: FirstFireFormData) => void;
  onBack: () => void;
}

export function FirstFire({ projects, onNext, onBack }: FirstFireProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FirstFireFormData>({
    resolver: zodResolver(firstFireSchema),
    defaultValues: {
      project_id: projects.length === 1 ? projects[0].id : '',
      blocking_type: undefined,
    },
  });

  const blockingType = watch('blocking_type');
  const selectedBlockingType = watch('blocking_type');

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-text-primary mb-2">
          What's keeping you up at night?
        </h2>
        <p className="text-text-secondary">
          Let's capture that one thing that's been on your mind. We'll make it your first priority task.
        </p>
      </div>

      {/* Project Selection */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Which project is this for? *
        </label>
        <select
          {...register('project_id')}
          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
        >
          <option value="">Select a project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        {errors.project_id && (
          <p className="text-red-600 text-xs mt-1">{errors.project_id.message}</p>
        )}
      </div>

      {/* Task Description */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          What's the task or issue? *
        </label>
        <input
          {...register('task')}
          placeholder="e.g., Need cabinet dimensions from builder"
          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        {errors.task && (
          <p className="text-red-600 text-xs mt-1">{errors.task.message}</p>
        )}
      </div>

      {/* What's Blocking It */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          What's blocking it? *
        </label>
        <div className="space-y-2">
          {BLOCKING_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setValue('blocking_type', option.value)}
              className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                selectedBlockingType === option.value
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-border hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-text-primary text-sm">{option.label}</div>
              <div className="text-xs text-text-secondary">{option.description}</div>
            </button>
          ))}
        </div>
        {errors.blocking_type && (
          <p className="text-red-600 text-xs mt-1">{errors.blocking_type.message}</p>
        )}
      </div>

      {/* Conditional Fields based on blocking type */}
      {blockingType === 'waiting_on_someone' && (
        <div className="space-y-3 p-4 bg-surface-secondary rounded-lg border border-border">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Who are you waiting on?
            </label>
            <input
              {...register('poc_name')}
              placeholder="e.g., John the builder"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              What type of contact?
            </label>
            <div className="flex gap-2">
              {POC_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setValue('poc_type', type.value)}
                  className={`flex-1 py-2 px-3 rounded-md border-2 text-sm font-medium transition-colors ${
                    watch('poc_type') === type.value
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-border hover:border-gray-300'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {blockingType === 'missing_info' && (
        <div className="p-4 bg-surface-secondary rounded-lg border border-border">
          <label className="block text-sm font-medium text-text-primary mb-1">
            What information do you need?
          </label>
          <input
            {...register('missing_info')}
            placeholder="e.g., Final paint colors from designer"
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
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
        <button
          type="submit"
          className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-6 rounded-md transition-colors"
        >
          Continue
        </button>
      </div>
    </form>
  );
}
