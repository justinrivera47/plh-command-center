import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

const navItems = [
  { to: '/war-room', label: 'War Room', icon: '🎯' },
  { to: '/projects', label: 'Projects', icon: '📁' },
  { to: '/quotes', label: 'Quotes', icon: '💰' },
  { to: '/budget', label: 'Budget', icon: '📊' },
  { to: '/vendors', label: 'Vendors', icon: '🏢' },
];

const bottomItems = [
  { to: '/boss-view', label: 'Boss View', icon: '📊' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { signOut } = useAuth();

  return (
    <aside
      className={`hidden lg:flex flex-col bg-white border-r border-border h-screen sticky top-0 transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-border">
        {!collapsed && (
          <span className="font-semibold text-text-primary">PLH Command</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 hover:bg-gray-100 rounded text-text-secondary"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary'
                  }`
                }
              >
                <span className="text-lg">{item.icon}</span>
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom nav */}
      <div className="border-t border-border py-4">
        <ul className="space-y-1 px-2">
          {bottomItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary'
                  }`
                }
              >
                <span className="text-lg">{item.icon}</span>
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </NavLink>
            </li>
          ))}
          <li>
            <button
              onClick={() => signOut()}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-text-secondary hover:bg-gray-50 hover:text-text-primary transition-colors"
            >
              <span className="text-lg">🚪</span>
              {!collapsed && <span className="text-sm font-medium">Sign Out</span>}
            </button>
          </li>
        </ul>
      </div>
    </aside>
  );
}
