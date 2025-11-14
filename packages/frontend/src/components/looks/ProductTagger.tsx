import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';

import Input from '../ui/Input';
import Skeleton from '../ui/Skeleton';
import { endpoints } from '../../lib/api';

interface Product {
  _id: string;
  title: string;
  price: number;
  images: string[];
  sku?: string;
  inventory: number;
  sizes: string[];
}

interface TaggedProduct {
  productId: string;
  variantId?: string;
  sku: string;
  title: string;
  price: number;
  image: string;
  positionX?: number;
  positionY?: number;
}

interface ProductTaggerProps {
  imageUrl: string;
  taggedProducts: TaggedProduct[];
  onProductAdd: (product: TaggedProduct) => void;
  onProductRemove: (index: number) => void;
}

const ProductTagger = ({ imageUrl, taggedProducts, onProductAdd, onProductRemove }: ProductTaggerProps): JSX.Element => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: searchResults, isLoading: isSearching } = useQuery<{ items: Product[] }>({
    queryKey: ['host-product-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return { items: [] };
      const response = await endpoints.creatorProducts.search(searchQuery);
      return response.data;
    },
    enabled: showSearch && searchQuery.length > 0
  });

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>): void => {
    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setClickPosition({ x, y });
    setShowSearch(true);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const handleProductSelect = (product: Product, size?: string): void => {
    const variantId = size;
    const sku = size ? `${product.sku || product._id}-${size}` : product.sku || product._id;

    onProductAdd({
      productId: product._id,
      variantId,
      sku,
      title: product.title + (size ? ` (${size})` : ''),
      price: product.price,
      image: product.images?.[0] || 'https://via.placeholder.com/400x600?text=No+Image',
      positionX: clickPosition?.x,
      positionY: clickPosition?.y
    });

    setShowSearch(false);
    setSearchQuery('');
    setClickPosition(null);
  };

  return (
    <div className="relative">
      <div className="relative aspect-square overflow-hidden rounded-lg border-2 border-border dark:border-border">
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Look"
          className="h-full w-full cursor-crosshair object-cover"
          onClick={handleImageClick}
        />
        {taggedProducts.map((product, index) => (
          <div
            key={index}
            className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-teal-500 bg-white shadow-lg"
            style={{
              left: `${product.positionX || 50}%`,
              top: `${product.positionY || 50}%`
            }}
          >
            <div className="relative h-full w-full">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-teal-500" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {showSearch && (
        <div className="absolute left-0 top-0 z-10 w-full rounded-lg border border-border bg-white shadow-xl dark:border-border dark:bg-primary">
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Zoek product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-5 w-5 text-muted" />
              </button>
            </div>

            {isSearching ? (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : searchResults && searchResults.items.length > 0 ? (
              <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
                {searchResults.items.map((product) => (
                  <div key={product._id} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => handleProductSelect(product)}
                      className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition hover:bg-accent dark:border-border dark:hover:bg-primary/90"
                    >
                      <img
                        src={product.images?.[0] || ''}
                        alt={product.title}
                        className="h-12 w-12 rounded object-cover"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-black dark:text-secondary">{product.title}</p>
                        <p className="text-sm text-muted dark:text-muted">
                          €{product.price.toFixed(2)} • {product.inventory} op voorraad
                        </p>
                      </div>
                    </button>
                    {product.sizes && product.sizes.length > 0 && (
                      <div className="ml-16 mt-1 flex flex-wrap gap-1">
                        {product.sizes.map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => handleProductSelect(product, size)}
                            className="rounded border border-border px-2 py-1 text-xs transition hover:bg-accent dark:border-border dark:hover:bg-primary/90"
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : searchQuery && (
              <p className="mt-4 text-center text-sm text-muted dark:text-muted">Geen producten gevonden</p>
            )}
          </div>
        </div>
      )}

      {taggedProducts.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {taggedProducts.map((product, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-lg border border-border bg-accent px-3 py-2 dark:border-border dark:bg-primary"
            >
              <img src={product.image} alt={product.title} className="h-8 w-8 rounded object-cover" />
              <span className="text-sm font-medium text-black dark:text-secondary">{product.title}</span>
              <button
                type="button"
                onClick={() => onProductRemove(index)}
                className="text-muted hover:text-red-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductTagger;

