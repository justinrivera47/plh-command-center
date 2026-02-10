import { useAuth } from '../../hooks/useAuth';
import { useUIStore } from '../../stores/uiStore';
import { Link } from 'react-router-dom';

export function Header() {
  const { signOut } = useAuth();
  const openCommandPalette = useUIStore((state) => state.openCommandPalette);

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
          {/* Search button */}
          <button
            onClick={openCommandPalette}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-white border border-gray-300 rounded">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>

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
