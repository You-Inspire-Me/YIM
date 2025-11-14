import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  BarChart3,
  Box,
  Home,
  Menu,
  Package,
  Settings,
  ShoppingBag,
  Store,
  Warehouse,
  X
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import RoleSwitcher from './RoleSwitcher';
import ThemeToggle from './ThemeToggle';

const CreatorLayout = (): JSX.Element => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { path: '/creator', icon: Home, label: 'Dashboard' },
    { path: '/creator/products', icon: Box, label: 'Producten' },
    { path: '/creator/looks', icon: Package, label: 'Looks' },
    { path: '/creator/inventory', icon: Warehouse, label: 'Voorraad' },
    { path: '/creator/orders', icon: ShoppingBag, label: 'Bestellingen' },
    { path: '/creator/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/creator/profile', icon: Store, label: 'Profiel' },
    { path: '/creator/settings', icon: Settings, label: 'Instellingen' }
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-accent dark:bg-primary">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border bg-white transition-transform duration-200 dark:border-border dark:bg-primary lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-border px-6 dark:border-border">
            <Link to="/creator" className="flex items-center gap-2 text-lg font-semibold text-black">
              <Store className="h-6 w-6 text-primary" />
              Creator Studio
            </Link>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/creator'}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'border-l-4 border-primary bg-accent text-primary'
                        : 'text-muted hover:bg-accent dark:text-secondary dark:hover:bg-primary/90'
                    }`
                  }
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="border-t border-border p-4 dark:border-border">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-secondary text-xs font-semibold">
                {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-black dark:text-secondary">{user?.name || 'User'}</p>
                <p className="text-xs text-muted dark:text-muted">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden lg:pl-64">
        {/* Desktop Header - Right Top */}
        <header className="hidden h-16 items-center justify-between border-b border-border bg-white px-6 dark:border-border dark:bg-primary lg:flex">
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <RoleSwitcher />
          </div>
        </header>

        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-white px-4 dark:border-border dark:bg-primary lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="text-black dark:text-secondary"
            aria-label="Open sidebar"
          >
            <Menu className="h-6 w-6" />
          </button>
          <Link to="/creator" className="text-lg font-semibold text-black dark:text-secondary">
            Creator Studio
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <RoleSwitcher />
          </div>
        </header>

        {/* Page Content with consistent padding */}
        <main className="flex-1 overflow-y-auto bg-accent dark:bg-primary px-6 py-6">
          <Outlet />
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-primary/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default CreatorLayout;
