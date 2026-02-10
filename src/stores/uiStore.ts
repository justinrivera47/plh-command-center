import { create } from 'zustand';

interface UIState {
  // War Room filters
  warRoomFilters: {
    projectId: string | null;
    status: string | null;
    sortBy: 'urgency' | 'project';
  };
  setWarRoomFilters: (filters: Partial<UIState['warRoomFilters']>) => void;

  // Quick Entry modal
  quickEntryOpen: boolean;
  quickEntryType: 'quote' | 'status' | 'rfi' | 'call' | 'vendor' | null;
  openQuickEntry: (type: UIState['quickEntryType']) => void;
  closeQuickEntry: () => void;

  // Quote detail drawer
  quoteDrawerOpen: boolean;
  quoteDrawerId: string | null;
  openQuoteDrawer: (quoteId: string) => void;
  closeQuoteDrawer: () => void;

  // Selected project context (for quick entry defaults)
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;

  // Message composer
  messageComposerOpen: boolean;
  messageComposerContext: {
    rfiId?: string;
    pocName?: string;
    pocType?: string;
    templateCategory?: string;
  } | null;
  openMessageComposer: (context: UIState['messageComposerContext']) => void;
  closeMessageComposer: () => void;

  // Offline status
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;

  // Active tab (for bottom nav on mobile)
  activeTab: 'war-room' | 'projects' | 'quotes' | 'vendors';
  setActiveTab: (tab: UIState['activeTab']) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // War Room filters
  warRoomFilters: {
    projectId: null,
    status: null,
    sortBy: 'urgency',
  },
  setWarRoomFilters: (filters) =>
    set((state) => ({
      warRoomFilters: { ...state.warRoomFilters, ...filters },
    })),

  // Quick Entry modal
  quickEntryOpen: false,
  quickEntryType: null,
  openQuickEntry: (type) => set({ quickEntryOpen: true, quickEntryType: type }),
  closeQuickEntry: () => set({ quickEntryOpen: false, quickEntryType: null }),

  // Quote detail drawer
  quoteDrawerOpen: false,
  quoteDrawerId: null,
  openQuoteDrawer: (quoteId) => set({ quoteDrawerOpen: true, quoteDrawerId: quoteId }),
  closeQuoteDrawer: () => set({ quoteDrawerOpen: false, quoteDrawerId: null }),

  // Selected project context
  selectedProjectId: null,
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),

  // Message composer
  messageComposerOpen: false,
  messageComposerContext: null,
  openMessageComposer: (context) =>
    set({ messageComposerOpen: true, messageComposerContext: context }),
  closeMessageComposer: () =>
    set({ messageComposerOpen: false, messageComposerContext: null }),

  // Offline status
  isOnline: navigator.onLine,
  setIsOnline: (online) => set({ isOnline: online }),

  // Active tab
  activeTab: 'war-room',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
