import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';

import Skeleton from '../components/ui/Skeleton';
import { endpoints } from '../lib/api';

interface Look {
  _id: string;
  title: string;
  description: string;
  images: string[];
  creatorId: {
    _id: string;
    name: string;
    avatar?: string;
  };
  products: Array<{
    productId: string;
    variantId?: string;
    positionX?: number;
    positionY?: number;
  }>;
  tags: string[];
  category: 'dames' | 'heren' | 'kinderen' | 'all';
  published: boolean;
  likes?: string[]; // Array of user IDs who liked
  likesCount?: number; // Count of likes
  createdAt: string;
}

const LooksPage = (): JSX.Element => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<{ looks: Look[] }>({
    queryKey: ['public-looks'],
    queryFn: async () => {
      const response = await endpoints.looks.list();
      return response.data;
    }
  });

  const looks = data?.looks || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold text-black dark:text-secondary">Looks</h1>
        <p className="mt-2 text-muted dark:text-muted">
          Ontdek de nieuwste styled outfits van onze creators
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-96 w-full rounded-xl" />
          ))}
        </div>
      ) : looks.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {looks.map((look) => (
            <div
              key={look._id}
              className="group relative cursor-pointer overflow-hidden rounded-xl bg-white shadow-sm transition-shadow hover:shadow-lg dark:bg-primary"
              onClick={() => navigate(`/looks/${look._id}`)}
            >
              {/* Main Image */}
              {look.images && look.images.length > 0 && (
                <div className="relative aspect-[3/4] overflow-hidden">
                  <img
                    src={look.images[0]}
                    alt={look.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Hotspots overlay */}
                  {look.products && look.products.length > 0 && (
                    <div className="absolute inset-0">
                      {look.products.map((product, idx) => (
                        <div
                          key={idx}
                          className="absolute h-4 w-4 rounded-full border-2 border-white bg-white/80 shadow-lg transition-all hover:scale-125"
                          style={{
                            left: `${product.positionX || 50}%`,
                            top: `${product.positionY || 50}%`,
                            transform: 'translate(-50%, -50%)'
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {/* Likes badge */}
                  {(look.likesCount || 0) > 0 && (
                    <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-primary/50 px-2 py-1 text-sm text-secondary backdrop-blur-sm">
                      <Heart className="h-4 w-4 fill-current" />
                      <span>{look.likesCount}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-black dark:text-secondary">
                  {look.title}
                </h3>
                <p className="mt-1 text-sm text-muted dark:text-muted line-clamp-2">
                  {look.description}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  {look.creatorId.avatar ? (
                    <img
                      src={look.creatorId.avatar}
                      alt={look.creatorId.name}
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-accent dark:bg-gray-700" />
                  )}
                  <span className="text-sm text-muted dark:text-muted">
                    {look.creatorId.name}
                  </span>
                </div>
                {look.tags && look.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {look.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="rounded-full bg-accent px-2 py-0.5 text-xs text-muted dark:bg-primary dark:text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-white p-12 text-center dark:border-border dark:bg-primary">
          <p className="text-muted dark:text-muted">Geen looks gevonden.</p>
        </div>
      )}
    </div>
  );
};

export default LooksPage;
