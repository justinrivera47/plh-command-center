import { useActiveProjects } from '../../hooks/useProjects';
import { useUIStore } from '../../stores/uiStore';

const STATUS_FILTERS = [
  { value: null, label: 'All' },
  { value: 'overdue', label: '🔥 Overdue' },
  { value: 'blocking', label: '⛔ Blocking' },
  { value: 'on_me', label: '⚡ On Me' },
  { value: 'waiting_on_client', label: '👤 Client' },
  { value: 'waiting_on_contractor', label: '🔨 Contractor' },
  { value: 'waiting_on_vendor', label: '📦 Vendor' },
];

const SORT_OPTIONS = [
  { value: 'urgency', label: 'Urgency' },
  { value: 'priority', label: 'Priority' },
  { value: 'project', label: 'Project' },
  { value: 'date_newest', label: 'Newest First' },
  { value: 'date_oldest', label: 'Oldest First' },
  { value: 'alpha_az', label: 'A → Z' },
  { value: 'alpha_za', label: 'Z → A' },
  { value: 'status', label: 'By Status' },
] as const;

export function Filters() {
  const { data: projects } = useActiveProjects();
  const { warRoomFilters, setWarRoomFilters } = useUIStore();

  return (
    <div className="space-y-3 mb-6">
      {/* Mobile: Horizontal scrolling chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 md:hidden">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value ?? 'all'}
            onClick={() => setWarRoomFilters({ status: filter.value })}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              warRoomFilters.status === filter.value
                ? 'bg-primary-600 text-white'
                : 'bg-white text-text-secondary border border-border hover:border-gray-300'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Desktop: Dropdowns */}
      <div className="hidden md:flex items-center gap-4">
        {/* Project filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-secondary">Project:</label>
          <select
            value={warRoomFilters.projectId ?? ''}
            onChange={(e) => setWarRoomFilters({ projectId: e.target.value || null })}
            className="px-3 py-1.5 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Projects</option>
            {projects?.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-secondary">Status:</label>
          <select
            value={warRoomFilters.status ?? ''}
            onChange={(e) => setWarRoomFilters({ status: e.target.value || null })}
            className="px-3 py-1.5 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {STATUS_FILTERS.map((filter) => (
              <option key={filter.value ?? 'all'} value={filter.value ?? ''}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-secondary">Sort:</label>
          <select
            value={warRoomFilters.sortBy}
            onChange={(e) =>
              setWarRoomFilters({ sortBy: e.target.value as typeof SORT_OPTIONS[number]['value'] })
            }
            className="px-3 py-1.5 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile project filter and sort */}
      <div className="md:hidden flex gap-2">
        <select
          value={warRoomFilters.projectId ?? ''}
          onChange={(e) => setWarRoomFilters({ projectId: e.target.value || null })}
          className="flex-1 px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Projects</option>
          {projects?.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <select
          value={warRoomFilters.sortBy}
          onChange={(e) =>
            setWarRoomFilters({ sortBy: e.target.value as typeof SORT_OPTIONS[number]['value'] })
          }
          className="px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
