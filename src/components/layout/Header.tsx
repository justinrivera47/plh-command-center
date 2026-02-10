import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';

export function Header() {
  const { signOut } = useAuth();

  return (
    <header className="bg-white border-b border-border sticky top-0 z-30">
      <div className="px-4 h-14 flex items-center justify-between">
        {/* Title - visible on mobile, hidden on desktop (sidebar shows it) */}
        <div className="lg:hidden">
          <h1 className="text-lg font-semibold text-text-primary">
            PLH Command Center
          </h1>
        </div>

        {/* Desktop: show context info */}
        <div className="hidden lg:block">
          <h1 className="text-lg font-semibold text-text-primary">
            Command Center
          </h1>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Desktop actions */}
          <Link
            to="/boss-view"
            className="hidden md:flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            <span>📊</span>
            <span>Boss View</span>
          </Link>

          {/* Mobile sign out - desktop has it in sidebar */}
          <button
            onClick={() => signOut()}
            className="lg:hidden text-sm text-text-secondary hover:text-text-primary"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
