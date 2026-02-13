import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'sonner';
import { CommandPalette } from './components/command-palette';

import { useUIStore } from './stores/uiStore';
import { useAuth } from './hooks/useAuth';

// Layout - not lazy loaded as it's the shell
import { AppShell } from './components/layout/AppShell';
import { ServiceStatusBanner } from './components/shared/ServiceStatusBanner';
import { ChunkErrorBoundary } from './components/shared/ChunkErrorBoundary';

// Auth - lazy loaded
const LoginPage = lazy(() => import('./components/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const SignUpPage = lazy(() => import('./components/auth/SignUpPage').then(m => ({ default: m.SignUpPage })));
const ResetPasswordPage = lazy(() => import('./components/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));

// Onboarding - lazy loaded
const OnboardingWizard = lazy(() => import('./components/onboarding/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })));

// Main views - lazy loaded
const WarRoom = lazy(() => import('./components/war-room/WarRoom').then(m => ({ default: m.WarRoom })));
const ProjectList = lazy(() => import('./components/projects/ProjectList').then(m => ({ default: m.ProjectList })));
const ProjectDetail = lazy(() => import('./components/projects/ProjectDetail').then(m => ({ default: m.ProjectDetail })));
const QuoteTracker = lazy(() => import('./components/quotes/QuoteTracker').then(m => ({ default: m.QuoteTracker })));
const VendorList = lazy(() => import('./components/vendors/VendorList').then(m => ({ default: m.VendorList })));
const VendorDetail = lazy(() => import('./components/vendors/VendorDetail').then(m => ({ default: m.VendorDetail })));
const CallLogList = lazy(() => import('./components/call-logs/CallLogList').then(m => ({ default: m.CallLogList })));
const BossView = lazy(() => import('./components/boss-view/BossView').then(m => ({ default: m.BossView })));
const BudgetDashboard = lazy(() => import('./components/budget-dashboard/BudgetDashboard').then(m => ({ default: m.BudgetDashboard })));
const SettingsPage = lazy(() => import('./components/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
    </div>
  );
}

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
          <ServiceStatusBanner />
          <CommandPalette />
          <ChunkErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

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
                <Route path="call-log" element={<CallLogList />} />
                <Route path="boss-view" element={<BossView />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </ChunkErrorBoundary>
        </BrowserRouter>
      </OnlineStatusProvider>
    </QueryClientProvider>
  );
}

export default App;
