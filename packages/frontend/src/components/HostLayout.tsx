import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  BarChart3,
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

const HostLayout = (): JSX.Element => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { path: '/creator', icon: Home, label: 'Dashboard' },
    { path: '/creator/looks', icon: Package, label: 'Looks' },
    { path: '/creator/inventory', icon: Warehouse, label: 'Voorraad' },
    { path: '/creator/orders', icon: ShoppingBag, label: 'Bestellingen' },
    { path: '/creator/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/creator/profile', icon: Store, label: 'Winkelprofiel' },
    { path: '/creator/settings', icon: Settings, label: 'Instellingen' }
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-gray-200 bg-white transition-transform duration-200 dark:border-gray-800 dark:bg-gray-900 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-gray-200 px-6 dark:border-gray-800">
            <Link to="/creator" className="flex items-center gap-2 text-lg font-semibold">
              <Store className="h-6 w-6 text-teal-600 dark:text-teal-500" />
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
                        ? 'bg-teal-600 text-white dark:bg-teal-500'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`
                  }
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="border-t border-gray-200 p-4 dark:border-gray-800">
            <div className="flex items-center gap-3 px-3">
              <div className="h-8 w-8 rounded-full bg-teal-600 dark:bg-teal-500 flex items-center justify-center text-white text-sm font-semibold">
                {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name || user?.email || 'User'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-6 w-6" />
            </button>
            <span className="hidden items-center gap-2 rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 md:flex">
              <Store className="h-3 w-3" />
              Host Mode
            </span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <RoleSwitcher />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50 p-6 dark:bg-gray-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default HostLayout;

