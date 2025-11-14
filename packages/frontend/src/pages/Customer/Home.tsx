import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../context/AuthContext';
import { endpoints } from '../../lib/api';
import LikeButton from '../../components/LikeButton';

const HomePage = (): JSX.Element => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category') || 'all';
  const [searchQuery, setSearchQuery] = useState('');
  const isCreator = user?.role === 'host' || user?.role === 'creator';

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [category]);

  const { data: looksData, isLoading } = useQuery({
    queryKey: ['public-looks', category],
    queryFn: async () => {
      const response = await endpoints.public.looks({ category: category !== 'all' ? category : undefined });
      return response.data.looks || [];
    }
  });

  const looks = looksData || [];

  const handleSearch = (e: React.FormEvent): void => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <>
      {/* Hero Section with Prominent Search */}
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-[#F0F9FF] to-[#E0F2FE] py-16 dark:from-gray-950 dark:via-gray-900 dark:to-primary-900/10">
        <div className="mx-auto max-w-7xl px-4">
          {/* Big Search Bar */}
          <form onSubmit={handleSearch} className="max-w-3xl mx-auto">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('header.search')}
                className="w-full rounded-full border-2 border-[#E2E8F0] bg-white px-6 py-4 pl-14 text-lg shadow-sm transition focus:border-[#0EA5E9] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:ring-offset-2 dark:border-gray-700 dark:bg-gray-900"
              />
              <Search className="absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-[#64748B]" />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-[#0EA5E9] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#0284C7]"
              >
                Zoeken
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Looks Grid */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-3xl font-extrabold text-[#1E293B]">{t('home.discoverLooks')}</h2>
          <Link
            to="/shop"
            className="text-sm font-medium text-[#0EA5E9] hover:text-[#0284C7]"
          >
            {t('home.viewAll')}
          </Link>
        </div>
        
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] w-full bg-[#F8FAFC] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : looks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#64748B]">Geen looks gevonden voor deze categorie.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {looks.map((look: any) => (
              <Link
                key={look._id}
                to={`/looks/${look._id}`}
                className="group relative overflow-hidden rounded-2xl bg-[#F8FAFC] dark:bg-gray-800 shadow-sm"
              >
                <div className="aspect-[3/4] w-full">
                  <img
                    src={look.images?.[0] || 'https://via.placeholder.com/600x800'}
                    alt={look.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <p className="font-semibold">{look.title}</p>
                  <p className="text-sm opacity-90">{look.products?.length || 0} items</p>
                </div>
                <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <LikeButton type="Look" id={look._id} size="md" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Floating Action Button for Creators */}
      {isCreator && (
        <Link
          to="/creator/looks/create"
          className="fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#0EA5E9] text-white shadow-lg transition hover:bg-[#0284C7] hover:shadow-xl"
          aria-label={t('home.createLook')}
        >
          <Plus className="h-6 w-6" />
        </Link>
      )}
    </>
  );
};

export default HomePage;
