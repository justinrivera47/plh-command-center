import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addProjectsSchema, type AddProjectsFormData } from '../../lib/schemas';

interface AddProjectsProps {
  onNext: (data: AddProjectsFormData) => void;
  onBack: () => void;
}

export function AddProjects({ onNext, onBack }: AddProjectsProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AddProjectsFormData>({
    resolver: zodResolver(addProjectsSchema),
    defaultValues: {
      projects: [
        { name: '', client_name: '', address: '', client_email: '', client_phone: '' },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'projects',
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-text-primary mb-2">Add your projects</h2>
        <p className="text-text-secondary">
          Add all your active projects. You can add more later.
        </p>
      </div>

      <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="bg-surface-secondary rounded-lg p-4 border border-border"
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-text-secondary">
                Project {index + 1}
              </span>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-red-500 hover:text-red-600 text-sm"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="space-y-3">
              {/* Project Name - Required */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Project Name / Address *
                </label>
                <input
                  {...register(`projects.${index}.name`)}
                  placeholder="e.g., 123 Main St Renovation"
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {errors.projects?.[index]?.name && (
                  <p className="text-red-600 text-xs mt-1">
                    {errors.projects[index]?.name?.message}
                  </p>
                )}
              </div>

              {/* Client Name - Required */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Client Name *
                </label>
                <input
                  {...register(`projects.${index}.client_name`)}
                  placeholder="e.g., John Smith"
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {errors.projects?.[index]?.client_name && (
                  <p className="text-red-600 text-xs mt-1">
                    {errors.projects[index]?.client_name?.message}
                  </p>
                )}
              </div>

              {/* Optional fields - collapsed by default on mobile */}
              <details className="group">
                <summary className="text-sm text-primary-600 cursor-pointer hover:text-primary-700">
                  + Add contact details & budget (optional)
                </summary>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      Client Email
                    </label>
                    <input
                      {...register(`projects.${index}.client_email`)}
                      type="email"
                      placeholder="client@email.com"
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    {errors.projects?.[index]?.client_email && (
                      <p className="text-red-600 text-xs mt-1">
                        {errors.projects[index]?.client_email?.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      Client Phone
                    </label>
                    <input
                      {...register(`projects.${index}.client_phone`)}
                      type="tel"
                      placeholder="(555) 123-4567"
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      Total Budget
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-text-secondary">$</span>
                      <input
                        {...register(`projects.${index}.total_budget`, {
                          valueAsNumber: true,
                        })}
                        type="number"
                        placeholder="0"
                        className="w-full pl-7 pr-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </details>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() =>
          append({ name: '', client_name: '', address: '', client_email: '', client_phone: '' })
        }
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-text-secondary hover:border-primary-500 hover:text-primary-600 transition-colors"
      >
        + Add another project
      </button>

      {errors.projects?.root && (
        <p className="text-red-600 text-sm">{errors.projects.root.message}</p>
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
