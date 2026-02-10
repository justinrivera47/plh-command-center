import { Outlet } from 'react-router-dom';
import { BottomTabBar } from './BottomTabBar';
import { Header } from './Header';
import { QuickEntryFAB } from '../quick-entry/QuickEntryFAB';
import { OfflineBanner } from '../shared/OfflineBanner';

export function AppShell() {
  return (
    <div className="min-h-screen bg-surface-secondary flex flex-col">
      <OfflineBanner />
      <Header />
      <main className="flex-1 pb-20 md:pb-4">
        <Outlet />
      </main>
      <QuickEntryFAB />
      <BottomTabBar />
    </div>
  );
}
