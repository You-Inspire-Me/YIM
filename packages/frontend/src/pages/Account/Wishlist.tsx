import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Heart, X } from 'lucide-react';
import toast from 'react-hot-toast';

import { endpoints } from '../../lib/api';

const WishlistPage = (): JSX.Element => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Scroll to top on mount and refetch
  useEffect(() => {
    window.scrollTo(0, 0);
    void queryClient.invalidateQueries({ queryKey: ['user-wishlist'] });
  }, []);

  const { data: wishlistData, isLoading } = useQuery({
    queryKey: ['user-wishlist'],
    queryFn: async () => {
      const response = await endpoints.user.wishlist.get();
      return response.data.items || [];
    }
  });

  const wishlist = wishlistData || [];

  const removeMutation = useMutation({
    mutationFn: async ({ type, id }: { type: 'Look' | 'Product' | 'Creator'; id: string }) => {
      return endpoints.user.wishlist.toggle({ type, id });
    },
    onSuccess: () => {
      toast.success('Verwijderd uit verlanglijst');
      void queryClient.invalidateQueries({ queryKey: ['user-wishlist'] });
    }
  });

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <h1 className="text-3xl font-extrabold text-black mb-8">{t('account.wishlist')}</h1>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] w-full bg-accent rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="text-3xl font-extrabold text-black mb-8">{t('account.wishlist')}</h1>
      
      {!wishlist || wishlist.length === 0 ? (
        <div className="text-center py-16">
          <Heart className="h-20 w-20 text-border mx-auto mb-6" />
          <h2 className="text-2xl font-extrabold text-black mb-3">Je hebt nog niets geliked</h2>
          <p className="text-muted mb-8 max-w-md mx-auto">
            Ga inspiratie opdoen! Like looks, producten en creators die je leuk vindt.
          </p>
          <Link
            to="/"
            className="inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-secondary transition hover:bg-primary"
          >
            Ontdek looks
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {wishlist.map((item: any) => {
            const isLook = item.type === 'Look';
            const isProduct = item.type === 'Product';
            const isCreator = item.type === 'Creator';
            
            return (
              <div
                key={`${item.type}-${item._id}`}
                className="group relative overflow-hidden rounded-2xl bg-white border border-border shadow-sm transition hover:shadow-lg"
              >
                <Link
                  to={
                    isLook
                      ? `/looks/${item._id}`
                      : isProduct
                      ? `/products/${item._id}`
                      : `/creators/${item._id}`
                  }
                  className="block"
                >
                  <div className={`w-full ${isLook ? 'aspect-[3/4]' : isProduct ? 'aspect-[4/5]' : 'aspect-square'}`}>
                    <img
                      src={item.image || item.images?.[0] || 'https://via.placeholder.com/600x800'}
                      alt={item.title || item.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-black truncate">{item.title || item.name}</p>
                    <p className="text-sm text-muted mt-1">
                      {isLook && 'Look'}
                      {isProduct && `€ ${item.price?.toFixed(2) || '0.00'}`}
                      {isCreator && 'Creator'}
                    </p>
                  </div>
                </Link>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeMutation.mutate({ type: item.type, id: item._id });
                  }}
                  className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition"
                  aria-label="Remove from wishlist"
                >
                  <X className="h-5 w-5 text-muted" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WishlistPage;
