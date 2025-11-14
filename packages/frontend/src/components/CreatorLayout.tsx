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
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC] dark:bg-gray-950">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-[#E2E8F0] bg-white transition-transform duration-200 dark:border-gray-800 dark:bg-gray-900 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-[#E2E8F0] px-6 dark:border-gray-800">
            <Link to="/creator" className="flex items-center gap-2 text-lg font-semibold text-[#1E293B]">
              <Store className="h-6 w-6 text-[#0EA5E9]" />
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
                        ? 'border-l-4 border-[#0EA5E9] bg-[#F0F9FF] text-[#0EA5E9]'
                        : 'text-[#64748B] hover:bg-[#F8FAFC] dark:text-gray-300 dark:hover:bg-gray-800'
                    }`
                  }
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="border-t border-[#E2E8F0] p-4 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-[#0EA5E9] flex items-center justify-center text-white text-xs font-semibold">
                {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-[#1E293B] dark:text-white">{user?.name || 'User'}</p>
                <p className="text-xs text-[#64748B] dark:text-gray-400">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden lg:pl-64">
        {/* Desktop Header - Right Top */}
        <header className="hidden h-16 items-center justify-between border-b border-[#E2E8F0] bg-white px-6 dark:border-gray-800 dark:bg-gray-900 lg:flex">
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <RoleSwitcher />
          </div>
        </header>

        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b border-[#E2E8F0] bg-white px-4 dark:border-gray-800 dark:bg-gray-900 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="text-[#1E293B] dark:text-white"
            aria-label="Open sidebar"
          >
            <Menu className="h-6 w-6" />
          </button>
          <Link to="/creator" className="text-lg font-semibold text-[#1E293B] dark:text-white">
            Creator Studio
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <RoleSwitcher />
          </div>
        </header>

        {/* Page Content with consistent padding */}
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC] dark:bg-gray-950 px-6 py-6">
          <Outlet />
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default CreatorLayout;
