import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Share2, ShoppingCart, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

import { endpoints } from '../../lib/api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import LikeButton from '../../components/LikeButton';
import VariantSelector from '../../components/VariantSelector';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';

// Related Looks Component
const RelatedLooksSection = ({
  currentLookId,
  category,
  tags
}: {
  currentLookId: string;
  category?: string;
  tags?: string[];
}): JSX.Element => {
  const { data: relatedLooks } = useQuery({
    queryKey: ['related-looks', currentLookId, category],
    queryFn: async () => {
      const response = await endpoints.public.looks({
        category: category !== 'all' ? category : undefined
      });
      // Filter out current look and limit to 4
      return (response.data.looks || [])
        .filter((look: any) => look._id !== currentLookId)
        .slice(0, 4);
    }
  });

  if (!relatedLooks || relatedLooks.length === 0) {
    return <></>;
  }

  return (
    <div className="mt-16">
      <h2 className="mb-6 text-2xl font-bold text-[#1E293B] dark:text-white">
        Vergelijkbare looks
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {relatedLooks.map((look: any) => (
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
    </div>
  );
};

interface LookProduct {
  productId: string;
  variantId?: string;
  sku: string;
  title: string;
  price: number;
  image: string;
  positionX?: number;
  positionY?: number;
  product?: {
    _id: string;
    title: string;
    brand?: string;
    images: string[];
    price: number;
    originalPrice?: number;
    discount?: number;
    sizes?: string[];
    colors?: string[];
    inventory: number;
    sku: string;
  };
}

interface Look {
  _id: string;
  title: string;
  description: string;
  images: string[];
  products: LookProduct[];
  tags: string[];
  category?: 'dames' | 'heren' | 'kinderen' | 'all';
  host: {
    _id: string;
    name: string;
    avatarUrl?: string;
  };
  createdAt: string;
}

const LookDetail = (): JSX.Element => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem } = useCart();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<LookProduct | null>(null);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  const { data, isLoading, error } = useQuery<{ look: Look }>({
    queryKey: ['public-look', id],
    queryFn: async () => {
      const response = await endpoints.public.look(id!);
      return response.data;
    },
    enabled: !!id
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  // Update page title
  useEffect(() => {
    if (data?.look) {
      document.title = `Get the look – ${data.look.host.name} | YIM`;
    }
  }, [data?.look]);

  const handleShare = async (): Promise<void> => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link gekopieerd naar klembord');
    } catch {
      toast.error('Kon link niet kopiëren');
    }
  };

  const handleProductClick = (product: LookProduct): void => {
    if (product.product) {
      setSelectedProduct(product);
      setIsVariantModalOpen(true);
    } else {
      // Fallback: add directly to cart
      addItem({
        productId: product.productId,
        title: product.title,
        price: product.price,
        image: product.image,
        quantity: 1
      });
      toast.success(`${product.title} toegevoegd aan winkelwagen`);
    }
  };

  const handleAddAllToCart = (): void => {
    if (!data?.look.products || data.look.products.length === 0) {
      toast.error('Geen producten in deze look');
      return;
    }

    let addedCount = 0;
    data.look.products.forEach((product) => {
      addItem({
        productId: product.productId,
        title: product.title,
        price: product.price,
        image: product.image,
        quantity: 1
      });
      addedCount++;
    });

    toast.success(`${addedCount} producten toegevoegd aan winkelwagen`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Skeleton className="aspect-[3/4] w-full max-h-[800px]" />
            </div>
            <div className="lg:col-span-1">
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data?.look) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-[#1E293B] dark:text-white">
            Look niet gevonden
          </h1>
          <Button onClick={() => navigate('/')} className="mt-4">
            Terug naar home
          </Button>
        </div>
      </div>
    );
  }

  const look = data.look;
  const mainImage = look.images[selectedImageIndex] || look.images[0] || '';
  const thumbnails = look.images.slice(0, 6); // Max 6 thumbnails

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {/* Desktop: 2-column layout, Mobile: stacked */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column: Images (65% on desktop) */}
          <div className="lg:col-span-2">
            {/* Main Image */}
            <div className="relative mb-4 overflow-hidden rounded-lg bg-[#F8FAFC]">
              <div className="relative aspect-[3/4] max-h-[800px] w-full">
                <img
                  src={mainImage}
                  alt={look.title}
                  className="h-full w-full object-cover"
                />
                
                {/* Like & Share Buttons */}
                <div className="absolute right-4 top-4 flex gap-2">
                  <LikeButton type="Look" id={look._id} size="lg" />
                  <button
                    type="button"
                    onClick={handleShare}
                    className="rounded-full bg-white/90 p-3 shadow-lg transition hover:bg-white"
                    aria-label="Deel"
                  >
                    <Share2 className="h-5 w-5 text-[#1E293B]" />
                  </button>
                </div>
              </div>
            </div>

            {/* Thumbnails Row */}
            {thumbnails.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 lg:overflow-x-visible">
                {thumbnails.map((image, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 overflow-hidden rounded-lg border-2 transition ${
                      selectedImageIndex === index
                        ? 'border-[#0EA5E9]'
                        : 'border-transparent hover:border-[#E2E8F0]'
                    }`}
                    aria-label={`Bekijk afbeelding ${index + 1}`}
                  >
                    <img
                      src={image}
                      alt={`${look.title} ${index + 1}`}
                      className="h-20 w-20 object-cover lg:h-24 lg:w-24"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Product List (35% on desktop, sticky) */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-20">
              {/* Title & Creator */}
              <div className="mb-6">
                <h1 className="mb-4 text-3xl font-extrabold text-[#1E293B] dark:text-white lg:text-4xl">
                  Get the look
                </h1>
                
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 overflow-hidden rounded-full bg-[#F8FAFC]">
                      {look.host.avatarUrl ? (
                        <img
                          src={look.host.avatarUrl}
                          alt={look.host.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[#0EA5E9] text-white text-sm font-semibold">
                          {look.host.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-[#1E293B] dark:text-white">
                        {look.host.name}
                      </p>
                      <p className="text-xs text-[#64748B]">Creator</p>
                    </div>
                  </div>
                  {user && user._id !== look.host._id && (
                    <Button
                      variant={isFollowing ? 'secondary' : 'primary'}
                      onClick={() => setIsFollowing(!isFollowing)}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <UserPlus className="h-4 w-4" />
                      {isFollowing ? 'Gevolgd' : 'Volg'}
                    </Button>
                  )}
                </div>

                {/* Description */}
                {look.description && (
                  <p className="text-sm text-[#64748B] dark:text-gray-400">
                    {look.description}
                  </p>
                )}
              </div>

              {/* Product List */}
              {look.products && look.products.length > 0 && (
                <div className="mb-6">
                  <h2 className="mb-4 text-lg font-bold text-[#1E293B] dark:text-white">
                    Shop de look ({look.products.length})
                  </h2>
                  
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {look.products.map((product, index) => {
                      const fullProduct = product.product;
                      const discount =
                        fullProduct?.originalPrice && fullProduct.originalPrice > product.price
                          ? Math.round(
                              ((fullProduct.originalPrice - product.price) /
                                fullProduct.originalPrice) *
                                100
                            )
                          : 0;
                      const hasDiscount = discount > 0;

                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleProductClick(product)}
                          className="group flex w-full gap-3 rounded-lg border border-[#E2E8F0] bg-white p-3 text-left transition hover:border-[#0EA5E9] hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
                        >
                          {/* Product Thumbnail */}
                          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-[#F8FAFC]">
                            <img
                              src={product.image || fullProduct?.images?.[0] || ''}
                              alt={product.title}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>

                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            {fullProduct?.brand && (
                              <p className="mb-1 text-xs font-semibold uppercase text-[#64748B]">
                                {fullProduct.brand}
                              </p>
                            )}
                            <p className="mb-1 line-clamp-2 text-sm font-medium text-[#1E293B] dark:text-white">
                              {product.title}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#0EA5E9]">
                                € {product.price.toFixed(2)}
                              </span>
                              {fullProduct?.originalPrice &&
                                fullProduct.originalPrice > product.price && (
                                  <>
                                    <span className="text-xs text-[#64748B] line-through">
                                      € {fullProduct.originalPrice.toFixed(2)}
                                    </span>
                                    {hasDiscount && (
                                      <span className="rounded-full bg-[#E0F2FE] px-2 py-0.5 text-xs font-semibold text-[#0EA5E9]">
                                        -{discount}%
                                      </span>
                                    )}
                                  </>
                                )}
                            </div>
                            {fullProduct?.originalPrice &&
                              fullProduct.originalPrice > product.price && (
                                <p className="mt-1 text-xs text-[#64748B]">
                                  Meest getoonde prijs
                                </p>
                              )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Add All Button */}
                  <Button
                    onClick={handleAddAllToCart}
                    className="mt-6 w-full"
                    size="lg"
                  >
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Voeg alle producten toe aan winkelwagen
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Related Looks Section */}
        <RelatedLooksSection
          currentLookId={look._id}
          category={look.category}
          tags={look.tags}
        />
      </div>

      {/* Variant Selector Modal */}
      {selectedProduct && selectedProduct.product && (
        <VariantSelector
          product={selectedProduct.product}
          isOpen={isVariantModalOpen}
          onClose={() => {
            setIsVariantModalOpen(false);
            setSelectedProduct(null);
          }}
          onAddToCart={() => {
            setIsVariantModalOpen(false);
            setSelectedProduct(null);
          }}
        />
      )}
    </div>
  );
};

export default LookDetail;
