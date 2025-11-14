import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, Store, ShoppingBag, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../context/AuthContext';

const RoleSwitcher = (): JSX.Element | null => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Only show for creators (host role is legacy, also support it)
  if (user?.role !== 'host' && user?.role !== 'creator') {
    return null;
  }

  const isCreatorView = location.pathname.startsWith('/creator') || location.pathname.startsWith('/creator');

  const handleLogout = async (): Promise<void> => {
    try {
      await logout();
      navigate('/');
      setIsOpen(false);
    } catch (error) {
      toast.error('Kon niet uitloggen.');
    }
  };

  const handleSwitchToCustomer = (): void => {
    navigate('/');
    setIsOpen(false);
  };

  const handleSwitchToCreator = (): void => {
    navigate('/creator');
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-medium transition hover:bg-[#F8FAFC] dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
        aria-label="Account menu"
      >
        <div className="h-8 w-8 rounded-full bg-[#0EA5E9] flex items-center justify-center text-white text-xs font-semibold">
          {(user.name || user.email || 'U').charAt(0).toUpperCase()}
        </div>
        <ChevronDown className={`h-4 w-4 text-[#64748B] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-lg border border-[#E2E8F0] bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <div className="p-2">
            <div className="px-3 py-2 border-b border-[#E2E8F0] dark:border-gray-700">
              <p className="text-sm font-semibold text-[#1E293B] dark:text-white">{user.name || user.email || 'User'}</p>
              <p className="text-xs text-[#64748B] dark:text-gray-400">{user.email}</p>
            </div>

            {!isCreatorView && (
              <button
                type="button"
                onClick={handleSwitchToCreator}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#1E293B] transition hover:bg-[#F8FAFC] dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <Store className="h-4 w-4 text-[#0EA5E9]" />
                Creator Studio
              </button>
            )}

            {isCreatorView && (
              <button
                type="button"
                onClick={handleSwitchToCustomer}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#1E293B] transition hover:bg-[#F8FAFC] dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <ShoppingBag className="h-4 w-4 text-[#0EA5E9]" />
                Back to shopping
              </button>
            )}

            <div className="my-1 border-t border-[#E2E8F0] dark:border-gray-700" />

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#64748B] transition hover:bg-[#F8FAFC] hover:text-[#1E293B] dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleSwitcher;
