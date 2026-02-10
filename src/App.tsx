import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { CommandPalette } from './components/command-palette';

import { useUIStore } from './stores/uiStore';
import { useAuth } from './hooks/useAuth';

// Layout
import { AppShell } from './components/layout/AppShell';

// Auth
import { LoginPage } from './components/auth/LoginPage';
import { SignUpPage } from './components/auth/SignUpPage';

// Onboarding
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';

// Main views
import { WarRoom } from './components/war-room/WarRoom';
import { ProjectList } from './components/projects/ProjectList';
import { ProjectDetail } from './components/projects/ProjectDetail';
import { QuoteTracker } from './components/quotes/QuoteTracker';
import { VendorList } from './components/vendors/VendorList';
import { VendorDetail } from './components/vendors/VendorDetail';
import { BossView } from './components/boss-view/BossView';
import { BudgetDashboard } from './components/budget-dashboard/BudgetDashboard';
import { SettingsPage } from './components/settings/SettingsPage';

// Configure TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Onboarding check wrapper
function OnboardingCheck({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (profile && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

// Online/offline detection
function OnlineStatusProvider({ children }: { children: React.ReactNode }) {
  const setIsOnline = useUIStore((state) => state.setIsOnline);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOnline]);

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <OnlineStatusProvider>
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={4000}
        />
        <BrowserRouter>
          <CommandPalette />
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />

            {/* Onboarding */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <OnboardingWizard />
                </ProtectedRoute>
              }
            />

            {/* Protected app routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <OnboardingCheck>
                    <AppShell />
                  </OnboardingCheck>
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/war-room" replace />} />
              <Route path="war-room" element={<WarRoom />} />
              <Route path="projects" element={<ProjectList />} />
              <Route path="projects/:projectId" element={<ProjectDetail />} />
              <Route path="quotes" element={<QuoteTracker />} />
              <Route path="budget" element={<BudgetDashboard />} />
              <Route path="vendors" element={<VendorList />} />
              <Route path="vendors/:vendorId" element={<VendorDetail />} />
              <Route path="boss-view" element={<BossView />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </OnlineStatusProvider>
    </QueryClientProvider>
  );
}

export default App;
