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
    // Fallback als React Router niet refresht
    setTimeout(() => {
      if (window.location.pathname.startsWith('/creator')) {
        window.location.href = '/';
      }
    }, 100);
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
        className="flex items-center gap-2 rounded-full border border-border bg-white px-3 py-2 text-sm font-medium transition hover:bg-accent dark:border-border dark:bg-primary dark:hover:bg-primary/90"
        aria-label="Account menu"
      >
        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-secondary text-xs font-semibold">
          {(user.name || user.email || 'U').charAt(0).toUpperCase()}
        </div>
        <ChevronDown className={`h-4 w-4 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-white shadow-lg dark:border-border dark:bg-primary">
          <div className="p-2">
            <div className="px-3 py-2 border-b border-border dark:border-border">
              <p className="text-sm font-semibold text-black dark:text-secondary">{user.name || user.email || 'User'}</p>
              <p className="text-xs text-muted dark:text-muted">{user.email}</p>
            </div>

            {!isCreatorView && (
              <button
                type="button"
                onClick={handleSwitchToCreator}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-black transition hover:bg-accent dark:text-secondary dark:hover:bg-primary/90"
              >
                <Store className="h-4 w-4 text-primary" />
                Creator Studio
              </button>
            )}

            {isCreatorView && (
              <button
                type="button"
                onClick={handleSwitchToCustomer}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-black transition hover:bg-accent dark:text-secondary dark:hover:bg-primary/90"
              >
                <ShoppingBag className="h-4 w-4 text-primary" />
                Back to shopping
              </button>
            )}

            <div className="my-1 border-t border-border dark:border-border" />

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-accent hover:text-black dark:text-muted dark:hover:bg-primary/90"
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
