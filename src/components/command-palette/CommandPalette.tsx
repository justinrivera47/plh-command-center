import { useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { useUIStore } from '../../stores/uiStore';
import { useActiveProjects } from '../../hooks/useProjects';
import { useWarRoom } from '../../hooks/useWarRoom';
import { useQuotes } from '../../hooks/useQuotes';
import { useVendors } from '../../hooks/useVendors';
import type { Project, WarRoomItem, Vendor, QuoteComparison } from '../../lib/types';

export function CommandPalette() {
  const navigate = useNavigate();
  const { commandPaletteOpen, closeCommandPalette, openQuickEntry, openQuoteDrawer } = useUIStore();

  // Fetch all searchable data
  const { data: projects } = useActiveProjects();
  const { data: tasks } = useWarRoom();
  const { data: quotes } = useQuotes();
  const { data: vendors } = useVendors();

  // Handle keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        useUIStore.getState().toggleCommandPalette();
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Navigation handlers
  const handleSelectProject = useCallback((project: Project) => {
    navigate(`/projects/${project.id}`);
    closeCommandPalette();
  }, [navigate, closeCommandPalette]);

  const handleSelectTask = useCallback((task: WarRoomItem) => {
    navigate(`/projects/${task.project_id}`);
    closeCommandPalette();
  }, [navigate, closeCommandPalette]);

  const handleSelectQuote = useCallback((quote: QuoteComparison) => {
    openQuoteDrawer(quote.id);
    closeCommandPalette();
  }, [openQuoteDrawer, closeCommandPalette]);

  const handleSelectVendor = useCallback((vendor: Vendor) => {
    navigate(`/vendors/${vendor.id}`);
    closeCommandPalette();
  }, [navigate, closeCommandPalette]);

  const handleQuickAction = useCallback((action: 'quote' | 'rfi' | 'vendor' | 'project') => {
    openQuickEntry(action);
    closeCommandPalette();
  }, [openQuickEntry, closeCommandPalette]);

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
    closeCommandPalette();
  }, [navigate, closeCommandPalette]);

  // Format currency
  const formatCurrency = (amount: number | null) => {
    if (!amount) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Memoize the search results to avoid re-computing on every render
  const searchData = useMemo(() => ({
    projects: projects || [],
    tasks: tasks || [],
    quotes: quotes || [],
    vendors: vendors || [],
  }), [projects, tasks, quotes, vendors]);

  if (!commandPaletteOpen) return null;

  return (
    <Command.Dialog
      open={commandPaletteOpen}
      onOpenChange={(open) => !open && closeCommandPalette()}
      label="Global Search"
      className="fixed inset-0 z-[100]"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={closeCommandPalette}
      />

      {/* Command Dialog */}
      <div className="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200">
        <Command className="w-full">
          {/* Search Input */}
          <div className="flex items-center border-b border-gray-200 px-4">
            <svg
              className="w-5 h-5 text-gray-400 mr-3"
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
            <Command.Input
              placeholder="Search projects, tasks, vendors, quotes..."
              className="w-full py-4 text-base outline-none placeholder:text-gray-400"
              autoFocus
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-400 bg-gray-100 rounded">
              <span className="text-xs">esc</span>
            </kbd>
          </div>

          {/* Results */}
          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-gray-500">
              No results found.
            </Command.Empty>

            {/* Quick Actions */}
            <Command.Group heading="Quick Actions" className="mb-2">
              <Command.Item
                onSelect={() => handleQuickAction('rfi')}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-primary-50 data-[selected=true]:text-primary-700"
              >
                <span className="text-lg">📋</span>
                <span>New Task / RFI</span>
              </Command.Item>
              <Command.Item
                onSelect={() => handleQuickAction('quote')}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-primary-50 data-[selected=true]:text-primary-700"
              >
                <span className="text-lg">💰</span>
                <span>Log a Quote</span>
              </Command.Item>
              <Command.Item
                onSelect={() => handleQuickAction('vendor')}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-primary-50 data-[selected=true]:text-primary-700"
              >
                <span className="text-lg">📇</span>
                <span>Add Vendor</span>
              </Command.Item>
              <Command.Item
                onSelect={() => handleQuickAction('project')}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-primary-50 data-[selected=true]:text-primary-700"
              >
                <span className="text-lg">📁</span>
                <span>New Project</span>
              </Command.Item>
            </Command.Group>

            {/* Navigation */}
            <Command.Group heading="Go to" className="mb-2">
              <Command.Item
                onSelect={() => handleNavigate('/war-room')}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-primary-50 data-[selected=true]:text-primary-700"
              >
                <span className="text-lg">🎯</span>
                <span>War Room</span>
              </Command.Item>
              <Command.Item
                onSelect={() => handleNavigate('/projects')}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-primary-50 data-[selected=true]:text-primary-700"
              >
                <span className="text-lg">📂</span>
                <span>Projects</span>
              </Command.Item>
              <Command.Item
                onSelect={() => handleNavigate('/quotes')}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-primary-50 data-[selected=true]:text-primary-700"
              >
                <span className="text-lg">💵</span>
                <span>Quote Tracker</span>
              </Command.Item>
              <Command.Item
                onSelect={() => handleNavigate('/budget')}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-primary-50 data-[selected=true]:text-primary-700"
              >
                <span className="text-lg">📊</span>
                <span>Budget Dashboard</span>
              </Command.Item>
              <Command.Item
                onSelect={() => handleNavigate('/vendors')}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-primary-50 data-[selected=true]:text-primary-700"
              >
                <span className="text-lg">🏢</span>
                <span>Vendors</span>
              </Command.Item>
              <Command.Item
                onSelect={() => handleNavigate('/boss-view')}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-primary-50 data-[selected=true]:text-primary-700"
              >
                <span className="text-lg">👔</span>
                <span>Boss View</span>
              </Command.Item>
            </Command.Group>

            {/* Projects */}
            {searchData.projects.length > 0 && (
              <Command.Group heading="Projects" className="mb-2">
                {searchData.projects.map((project) => (
                  <Command.Item
                    key={project.id}
                    value={`project ${project.name} ${project.client_name || ''} ${project.address || ''}`}
                    onSelect={() => handleSelectProject(project)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-primary-50 data-[selected=true]:text-primary-700"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">📁</span>
                      <div>
                        <div className="font-medium">{project.name}</div>
                        {project.client_name && (
                          <div className="text-sm text-gray-500">{project.client_name}</div>
                        )}
                      </div>
                    </div>
                    {project.total_budget && (
                      <span className="text-sm text-gray-500">
                        {formatCurrency(project.total_budget)}
                      </span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Tasks */}
            {searchData.tasks.length > 0 && (
              <Command.Group heading="Tasks" className="mb-2">
                {searchData.tasks.slice(0, 10).map((task) => (
                  <Command.Item
                    key={task.id}
                    value={`task ${task.task} ${task.project_name || ''} ${task.poc_name || ''}`}
                    onSelect={() => handleSelectTask(task)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-primary-50 data-[selected=true]:text-primary-700"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {task.is_blocking ? '🚧' : task.priority === 'P1' ? '🔴' : task.priority === 'P2' ? '🟡' : '📋'}
                      </span>
                      <div>
                        <div className="font-medium truncate max-w-[300px]">{task.task}</div>
                        <div className="text-sm text-gray-500">{task.project_name}</div>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      task.is_blocking ? 'bg-red-100 text-red-700' :
                      task.status === 'waiting_on_client' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {task.status.replace(/_/g, ' ')}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Vendors */}
            {searchData.vendors.length > 0 && (
              <Command.Group heading="Vendors" className="mb-2">
                {searchData.vendors.slice(0, 10).map((vendor) => (
                  <Command.Item
                    key={vendor.id}
                    value={`vendor ${vendor.company_name} ${vendor.poc_name || ''}`}
                    onSelect={() => handleSelectVendor(vendor)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-primary-50 data-[selected=true]:text-primary-700"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🏢</span>
                      <div>
                        <div className="font-medium">{vendor.company_name}</div>
                        {vendor.poc_name && (
                          <div className="text-sm text-gray-500">{vendor.poc_name}</div>
                        )}
                      </div>
                    </div>
                    {vendor.phone && (
                      <span className="text-sm text-gray-500">{vendor.phone}</span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Quotes */}
            {searchData.quotes.length > 0 && (
              <Command.Group heading="Quotes" className="mb-2">
                {searchData.quotes.slice(0, 10).map((quote) => (
                  <Command.Item
                    key={quote.id}
                    value={`quote ${quote.vendor_name || ''} ${quote.trade_name || ''} ${quote.project_name || ''}`}
                    onSelect={() => handleSelectQuote(quote)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-primary-50 data-[selected=true]:text-primary-700"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">💰</span>
                      <div>
                        <div className="font-medium">
                          {quote.vendor_name || 'Unknown Vendor'} - {quote.trade_name || 'Unknown Trade'}
                        </div>
                        <div className="text-sm text-gray-500">{quote.project_name}</div>
                      </div>
                    </div>
                    {quote.quoted_price && (
                      <span className="text-sm font-medium text-gray-700">
                        {formatCurrency(quote.quoted_price)}
                      </span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-xs text-gray-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">↓</kbd>
                to navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">↵</kbd>
                to select
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">esc</kbd>
              to close
            </span>
          </div>
        </Command>
      </div>
    </Command.Dialog>
  );
}
