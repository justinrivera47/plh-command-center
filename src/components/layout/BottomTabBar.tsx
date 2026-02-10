import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/war-room', label: 'War Room', icon: '🎯' },
  { to: '/projects', label: 'Projects', icon: '📁' },
  { to: '/quotes', label: 'Quotes', icon: '💰' },
  { to: '/budget', label: 'Budget', icon: '📊' },
  { to: '/vendors', label: 'Vendors', icon: '🏢' },
];

export function BottomTabBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border pb-safe md:hidden z-40">
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center px-3 py-2 text-xs ${
                isActive
                  ? 'text-primary-600'
                  : 'text-text-secondary hover:text-text-primary'
              }`
            }
          >
            <span className="text-xl mb-1">{tab.icon}</span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
