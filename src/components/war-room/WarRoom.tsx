import { useWarRoom } from '../../hooks/useWarRoom';
import { useUIStore } from '../../stores/uiStore';
import { StatsBar } from './StatsBar';
import { Filters } from './Filters';
import { TaskCard } from './TaskCard';
import { EmptyState } from '../shared/EmptyState';
import { SkeletonList } from '../shared/SkeletonCard';

export function WarRoom() {
  const { data: tasks, isLoading, error } = useWarRoom();
  const openQuickEntry = useUIStore((state) => state.openQuickEntry);

  return (
    <div className="px-4 py-6">
      <StatsBar />
      <Filters />

      {/* Error state */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
          Failed to load tasks. Please try again.
        </div>
      )}

      {/* Loading state */}
      {isLoading && <SkeletonList count={5} />}

      {/* Empty state */}
      {!isLoading && tasks && tasks.length === 0 && (
        <EmptyState
          icon="✨"
          title="All clear!"
          description="No tasks need attention right now. Nice work!"
          actionLabel="Add a Task"
          onAction={() => openQuickEntry('rfi')}
        />
      )}

      {/* Task list */}
      {!isLoading && tasks && tasks.length > 0 && (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
