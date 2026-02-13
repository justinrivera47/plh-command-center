import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export function ServiceStatusBanner() {
  const [isDown, setIsDown] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check connection on mount
    checkConnection();

    // Also listen for auth errors which often indicate service issues
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'TOKEN_REFRESHED') {
        // Connection restored
        setIsDown(false);
      }
    });

    // Periodic health check every 30 seconds when tab is visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkConnection();
      }
    }, 30000);

    // Listen for online/offline events
    const handleOnline = () => checkConnection();
    const handleOffline = () => setIsDown(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  async function checkConnection() {
    try {
      // Simple health check - try to reach Supabase
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const { error } = await supabase.from('trade_categories').select('id').limit(1).abortSignal(controller.signal);

      clearTimeout(timeoutId);

      if (error && (error.message.includes('fetch') || error.message.includes('network') || error.code === 'PGRST301')) {
        setIsDown(true);
      } else {
        setIsDown(false);
      }
    } catch (err) {
      // Network error or timeout
      setIsDown(true);
    }
  }

  if (!isDown || dismissed) {
    return null;
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <span className="text-amber-600 text-lg">⚠️</span>
          <div>
            <p className="text-sm font-medium text-amber-800">
              Service Disruption Detected
            </p>
            <p className="text-sm text-amber-700">
              We're experiencing connection issues. This may be due to a service outage.{' '}
              <a
                href="https://status.supabase.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-amber-900 font-medium"
              >
                Check service status →
              </a>
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-600 hover:text-amber-800 p-1"
          aria-label="Dismiss"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
