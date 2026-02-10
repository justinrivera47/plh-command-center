import { Outlet } from 'react-router-dom';
import { BottomTabBar } from './BottomTabBar';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { QuickEntryFAB } from '../quick-entry/QuickEntryFAB';
import { QuickEntryModal } from '../quick-entry/QuickEntryModal';
import { OfflineBanner } from '../shared/OfflineBanner';

export function AppShell() {
  return (
    <div className="min-h-screen bg-surface-secondary">
      <OfflineBanner />

      {/* Desktop layout with sidebar */}
      <div className="flex">
        <Sidebar />

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Header - shown on all sizes, but simpler on desktop since sidebar has nav */}
          <Header />

          {/* Main content */}
          <main className="flex-1 pb-20 lg:pb-4">
            <div className="max-w-6xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* FAB - positioned above tab bar on mobile */}
      <QuickEntryFAB />

      {/* Bottom tab bar - mobile only */}
      <BottomTabBar />

      {/* Quick Entry Modal */}
      <QuickEntryModal />
    </div>
  );
}
