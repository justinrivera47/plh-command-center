import { useAuth } from '../../hooks/useAuth';

export function Header() {
  const { signOut } = useAuth();

  return (
    <header className="bg-white border-b border-border sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">
            PLH Command Center
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button className="hidden md:block text-sm text-primary-600 hover:text-primary-700">
            Export for Boss
          </button>
          <button
            onClick={() => signOut()}
            className="text-sm text-text-secondary hover:text-text-primary"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
