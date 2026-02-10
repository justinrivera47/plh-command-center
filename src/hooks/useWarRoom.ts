import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useUIStore } from '../stores/uiStore';
import type { WarRoomItem, Priority } from '../lib/types';

// Priority sort order
const PRIORITY_ORDER: Record<Priority, number> = {
  P1: 0,
  P2: 1,
  P3: 2,
};

export function useWarRoom() {
  const filters = useUIStore((state) => state.warRoomFilters);

  return useQuery({
    queryKey: ['war-room', filters],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch RFIs from the war_room view (which joins with projects)
      const { data, error } = await supabase
        .from('war_room')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      let items = data as WarRoomItem[];

      // Apply filters
      if (filters.projectId) {
        items = items.filter((item) => item.project_id === filters.projectId);
      }

      if (filters.status) {
        switch (filters.status) {
          case 'overdue':
            items = items.filter((item) => item.is_overdue);
            break;
          case 'blocking':
            items = items.filter((item) => item.is_blocking);
            break;
          case 'on_me':
            items = items.filter((item) => item.status === 'waiting_on_me');
            break;
          default:
            items = items.filter((item) => item.status === filters.status);
        }
      }

      // Sort
      if (filters.sortBy === 'urgency') {
        items.sort((a, b) => {
          // Blocking first
          if (a.is_blocking && !b.is_blocking) return -1;
          if (!a.is_blocking && b.is_blocking) return 1;

          // Overdue next
          if (a.is_overdue && !b.is_overdue) return -1;
          if (!a.is_overdue && b.is_overdue) return 1;

          // On me next
          if (a.status === 'waiting_on_me' && b.status !== 'waiting_on_me') return -1;
          if (a.status !== 'waiting_on_me' && b.status === 'waiting_on_me') return 1;

          // Then by priority
          const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
          if (priorityDiff !== 0) return priorityDiff;

          // Then by next action date
          if (a.next_action_date && b.next_action_date) {
            return new Date(a.next_action_date).getTime() - new Date(b.next_action_date).getTime();
          }
          if (a.next_action_date) return -1;
          if (b.next_action_date) return 1;

          return 0;
        });
      } else {
        // Sort by project
        items.sort((a, b) => {
          const projectCompare = a.project_name.localeCompare(b.project_name);
          if (projectCompare !== 0) return projectCompare;

          // Within project, sort by priority
          return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        });
      }

      return items;
    },
  });
}

export function useWarRoomStats() {
  return useQuery({
    queryKey: ['war-room', 'stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('war_room')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const items = data as WarRoomItem[];

      return {
        total: items.length,
        overdue: items.filter((item) => item.is_overdue).length,
        onMe: items.filter((item) => item.status === 'waiting_on_me').length,
        blocking: items.filter((item) => item.is_blocking).length,
      };
    },
  });
}
