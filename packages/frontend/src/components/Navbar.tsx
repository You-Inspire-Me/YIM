import { useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Menu, ShoppingBag, Search, Heart, X } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import Logo from './Logo';
import RoleSwitcher from './RoleSwitcher';
import ThemeToggle from './ThemeToggle';

const Navbar = (): JSX.Element => {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // Don't show navbar on creator routes
  if (location.pathname.startsWith('/creator')) {
    return <></>;
  }

  const handleLogout = async (): Promise<void> => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      toast.error('Kon niet uitloggen.');
    }
  };

  const navLinks = (
    <div className="flex flex-col gap-4 text-lg md:flex-row md:items-center md:gap-6 md:text-sm">
      <NavLink
        to="/"
        className={({ isActive }) =>
          `font-medium transition-colors hover:text-primary ${
            isActive
              ? 'text-primary border-l-4 border-primary bg-accent pl-2 -ml-2'
              : 'text-black dark:text-secondary'
          }`
        }
        onClick={() => setIsOpen(false)}
      >
        Discover
      </NavLink>
      <NavLink
        to="/new"
        className={({ isActive }) =>
          `font-medium transition-colors hover:text-primary ${
            isActive
              ? 'text-primary border-l-4 border-primary bg-accent pl-2 -ml-2'
              : 'text-black dark:text-secondary'
          }`
        }
        onClick={() => setIsOpen(false)}
      >
        New
      </NavLink>
    </div>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/80 backdrop-blur dark:border-border dark:bg-primary/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        {/* Left: Logo */}
        <Logo />

        {/* Center: Navigation */}
        <nav className="hidden md:block">{navLinks}</nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          
          {/* Search */}
          <button
            type="button"
            className="hidden items-center justify-center rounded-full p-2 transition hover:bg-accent dark:hover:bg-primary/90 md:flex"
            aria-label="Search"
          >
            <Search className="h-5 w-5 text-muted" />
          </button>

          {/* Wishlist */}
          <button
            type="button"
            className="hidden items-center justify-center rounded-full p-2 transition hover:bg-accent dark:hover:bg-primary/90 md:flex"
            aria-label="Wishlist"
          >
            <Heart className="h-5 w-5 text-muted" />
          </button>

          {/* Shopping Bag */}
          <Link
            to="/cart"
            className="relative hidden items-center justify-center rounded-full p-2 transition hover:bg-accent hover:text-primary dark:hover:bg-primary/90 md:flex"
            aria-label="Shopping bag"
          >
            <ShoppingBag className="h-5 w-5 text-muted" />
            {items.length > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-xs text-secondary">
                {items.length}
              </span>
            )}
          </Link>

          {/* User Menu */}
          {user ? (
            <div className="hidden items-center gap-3 md:flex">
              {user.role === 'host' || user.role === 'creator' ? (
                <RoleSwitcher />
              ) : (
                <>
                  <span className="text-sm font-medium text-black">Hallo, {user.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      void handleLogout();
                    }}
                    className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-accent dark:border-border dark:hover:bg-primary/90"
                  >
                    Uitloggen
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-3 md:flex">
              <Link
                to="/auth/login"
                className="text-sm font-medium text-muted transition-colors hover:text-primary"
              >
                Log in
              </Link>
              <Link
                to="/auth/register"
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-secondary hover:bg-primary"
              >
                Registreren
              </Link>
            </div>
          )}

          {/* Mobile menu button */}
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border md:hidden"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-label="Toggle navigation"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="border-t border-border bg-white px-4 py-6 dark:border-border dark:bg-primary md:hidden">
          {navLinks}
          <div className="mt-4 flex flex-col gap-3">
            <Link
              to="/cart"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-accent dark:hover:bg-primary/90"
              onClick={() => setIsOpen(false)}
            >
              <ShoppingBag className="h-4 w-4" />
              Winkelwagen {items.length > 0 && `(${items.length})`}
            </Link>
            {user ? (
              <>
                {(user.role === 'host' || user.role === 'creator') && (
                  <div className="px-2">
                    <RoleSwitcher />
                  </div>
                )}
                {user.role !== 'host' && user.role !== 'creator' && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      void handleLogout();
                    }}
                    className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-accent dark:border-border dark:hover:bg-primary/90"
                  >
                    Uitloggen
                  </button>
                )}
              </>
            ) : (
              <>
                <Link
                  to="/auth/login"
                  className="rounded-full border border-border px-4 py-2 text-sm font-medium text-center transition hover:bg-accent dark:border-border dark:hover:bg-primary/90"
                  onClick={() => setIsOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  to="/auth/register"
                  className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-secondary text-center hover:bg-primary"
                  onClick={() => setIsOpen(false)}
                >
                  Registreren
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
