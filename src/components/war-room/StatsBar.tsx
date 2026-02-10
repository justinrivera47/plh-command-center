import { useWarRoomStats } from '../../hooks/useWarRoom';
import { useUIStore } from '../../stores/uiStore';

interface StatCardProps {
  label: string;
  value: number;
  color: 'slate' | 'red' | 'amber';
  onClick?: () => void;
  active?: boolean;
}

function StatCard({ label, value, color, onClick, active }: StatCardProps) {
  const colorClasses = {
    slate: 'bg-slate-50 text-slate-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
  };

  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-lg text-left transition-all ${colorClasses[color]} ${
        onClick ? 'hover:ring-2 hover:ring-offset-1' : ''
      } ${active ? 'ring-2 ring-offset-1' : ''} ${
        color === 'red' ? 'hover:ring-red-300 ring-red-400' : ''
      } ${color === 'amber' ? 'hover:ring-amber-300 ring-amber-400' : ''} ${
        color === 'slate' ? 'hover:ring-slate-300 ring-slate-400' : ''
      }`}
      disabled={!onClick}
    >
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium opacity-80">{label}</div>
    </button>
  );
}

export function StatsBar() {
  const { data: stats, isLoading } = useWarRoomStats();
  const { warRoomFilters, setWarRoomFilters } = useUIStore();

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <StatCard
        label="Active Tasks"
        value={stats.total}
        color="slate"
        onClick={() => setWarRoomFilters({ status: null })}
        active={!warRoomFilters.status}
      />
      <StatCard
        label="Overdue"
        value={stats.overdue}
        color="red"
        onClick={() =>
          setWarRoomFilters({
            status: warRoomFilters.status === 'overdue' ? null : 'overdue',
          })
        }
        active={warRoomFilters.status === 'overdue'}
      />
      <StatCard
        label="On Me"
        value={stats.onMe}
        color="amber"
        onClick={() =>
          setWarRoomFilters({
            status: warRoomFilters.status === 'on_me' ? null : 'on_me',
          })
        }
        active={warRoomFilters.status === 'on_me'}
      />
      <StatCard
        label="Blocking"
        value={stats.blocking}
        color="red"
        onClick={() =>
          setWarRoomFilters({
            status: warRoomFilters.status === 'blocking' ? null : 'blocking',
          })
        }
        active={warRoomFilters.status === 'blocking'}
      />
    </div>
  );
}
