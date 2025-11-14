import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Menu, ShoppingBag, Heart, X, User, Package, Ruler, HelpCircle, LogOut, Store, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import Logo from './Logo';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';
import TopBanner from './TopBanner';

const Header = (): JSX.Element => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { items } = useCart();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const navigate = useNavigate();
  const accountMenuRef = useRef<HTMLDivElement>(null);
  
  const currentCategory = searchParams.get('category') || 'all';

  // Don't show header on creator routes
  if (location.pathname.startsWith('/creator')) {
    return <></>;
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async (): Promise<void> => {
    try {
      await logout();
      navigate('/');
      setIsAccountMenuOpen(false);
    } catch (error) {
      toast.error('Kon niet uitloggen.');
    }
  };

  return (
    <>
      <TopBanner />
      <header className="sticky top-0 z-40 border-b border-border bg-white/80 backdrop-blur dark:border-border dark:bg-primary/80">
        <div className="mx-auto max-w-7xl px-4">
          {/* Main Navigation - Dames | Heren | Kinderen */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-8">
              <Logo />
              <nav className="hidden items-center gap-6 md:flex">
                <button
                  type="button"
                  onClick={() => {
                    if (location.pathname === '/') {
                      setSearchParams({ category: 'dames' });
                    } else {
                      navigate('/?category=dames');
                    }
                  }}
                  className={`text-lg font-extrabold transition-all duration-200 ${
                    currentCategory === 'dames'
                      ? 'text-primary border-b-2 border-primary pb-1'
                      : 'text-black hover:text-primary'
                  }`}
                >
                  {t('nav.dames')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (location.pathname === '/') {
                      setSearchParams({ category: 'heren' });
                    } else {
                      navigate('/?category=heren');
                    }
                  }}
                  className={`text-lg font-extrabold transition-all duration-200 ${
                    currentCategory === 'heren'
                      ? 'text-primary border-b-2 border-primary pb-1'
                      : 'text-black hover:text-primary'
                  }`}
                >
                  {t('nav.heren')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (location.pathname === '/') {
                      setSearchParams({ category: 'kinderen' });
                    } else {
                      navigate('/?category=kinderen');
                    }
                  }}
                  className={`text-lg font-extrabold transition-all duration-200 ${
                    currentCategory === 'kinderen'
                      ? 'text-primary border-b-2 border-primary pb-1'
                      : 'text-black hover:text-primary'
                  }`}
                >
                  {t('nav.kinderen')}
                </button>
              </nav>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <ThemeToggle />

              {/* Wishlist */}
              <Link
                to="/account/wishlist"
                className="relative hidden items-center justify-center rounded-full p-2 transition hover:bg-accent hover:text-primary dark:hover:bg-primary/90 md:flex"
                aria-label={t('header.wishlist')}
              >
                <Heart className="h-5 w-5 text-muted" />
              </Link>

              {/* Shopping Bag - far right, smaller */}
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

              {/* Account Menu */}
              {user ? (
                <div className="relative hidden md:block" ref={accountMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                    className="flex items-center gap-2 rounded-full border border-border bg-white px-3 py-2 text-sm font-medium transition hover:bg-accent dark:border-border dark:bg-primary dark:hover:bg-primary/90"
                    aria-label="Account menu"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-secondary text-xs font-semibold">
                      {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted transition-transform ${isAccountMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isAccountMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-white shadow-lg dark:border-border dark:bg-primary">
                      <div className="p-2">
                        <div className="px-3 py-2 border-b border-border dark:border-border">
                          <p className="text-sm font-semibold text-black dark:text-secondary">{user.name || user.email || 'User'}</p>
                          <p className="text-xs text-muted dark:text-muted">{user.email}</p>
                        </div>

                        <Link
                          to="/account/profile"
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-black transition hover:bg-accent dark:text-secondary dark:hover:bg-primary/90"
                          onClick={() => setIsAccountMenuOpen(false)}
                        >
                          <User className="h-4 w-4 text-primary" />
                          {t('header.account')}
                        </Link>

                        <Link
                          to="/account/orders"
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-black transition hover:bg-accent dark:text-secondary dark:hover:bg-primary/90"
                          onClick={() => setIsAccountMenuOpen(false)}
                        >
                          <Package className="h-4 w-4 text-primary" />
                          {t('header.orders')}
                        </Link>

                        <Link
                          to="/account/sizes"
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-black transition hover:bg-accent dark:text-secondary dark:hover:bg-primary/90"
                          onClick={() => setIsAccountMenuOpen(false)}
                        >
                          <Ruler className="h-4 w-4 text-primary" />
                          {t('header.sizes')}
                        </Link>

                        <Link
                          to="/help"
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-black transition hover:bg-accent dark:text-secondary dark:hover:bg-primary/90"
                          onClick={() => setIsAccountMenuOpen(false)}
                        >
                          <HelpCircle className="h-4 w-4 text-primary" />
                          {t('header.help')}
                        </Link>

                        {(user.role === 'host' || user.role === 'creator') && (
                          <>
                            <div className="my-1 border-t border-border dark:border-border" />
                            <Link
                              to="/creator"
                              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-black transition hover:bg-accent dark:text-secondary dark:hover:bg-primary/90"
                              onClick={() => setIsAccountMenuOpen(false)}
                            >
                              <Store className="h-4 w-4 text-primary" />
                              {t('header.creatorStudio')}
                            </Link>
                          </>
                        )}

                        <div className="my-1 border-t border-border dark:border-border" />

                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-accent hover:text-black dark:text-muted dark:hover:bg-primary/90"
                        >
                          <LogOut className="h-4 w-4" />
                          {t('header.logout')}
                        </button>
                      </div>
                    </div>
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
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="border-t border-border bg-white px-4 py-6 dark:border-border dark:bg-primary md:hidden">
            <nav className="flex flex-col gap-4">
              <NavLink
                to="/dames"
                className="text-lg font-extrabold text-black"
                onClick={() => setIsOpen(false)}
              >
                {t('nav.dames')}
              </NavLink>
              <NavLink
                to="/heren"
                className="text-lg font-extrabold text-black"
                onClick={() => setIsOpen(false)}
              >
                {t('nav.heren')}
              </NavLink>
              <NavLink
                to="/kinderen"
                className="text-lg font-extrabold text-black"
                onClick={() => setIsOpen(false)}
              >
                {t('nav.kinderen')}
              </NavLink>
            </nav>
          </div>
        )}
      </header>
    </>
  );
};

export default Header;
