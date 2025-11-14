import { useState } from 'react';
import { X, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';

import { useCart } from '../context/CartContext';
import Button from './ui/Button';

interface Variant {
  size?: string;
  color?: string;
  price: number;
  inventory: number;
  sku: string;
}

interface Product {
  _id: string;
  title: string;
  brand?: string;
  images: string[];
  price: number;
  originalPrice?: number;
  sizes?: string[];
  colors?: string[];
  inventory: number;
}

interface VariantSelectorProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: () => void;
}

const VariantSelector = ({
  product,
  isOpen,
  onClose,
  onAddToCart
}: VariantSelectorProps): JSX.Element | null => {
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');

  if (!isOpen) return null;

  const handleAddToCart = (): void => {
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      toast.error('Selecteer een maat');
      return;
    }

    const variantId = selectedSize || selectedColor || undefined;
    const title = product.title + (selectedSize ? ` (${selectedSize})` : '') + (selectedColor ? ` - ${selectedColor}` : '');

    addItem({
      productId: product._id,
      variantId,
      title,
      price: product.price,
      image: product.images[0] || '',
      quantity: 1
    });

    onAddToCart?.();
    onClose();
  };

  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-xl dark:bg-gray-900">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-[#64748B] transition hover:bg-[#F8FAFC] hover:text-[#1E293B]"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="grid gap-6 p-6 md:grid-cols-2">
          <div className="aspect-square overflow-hidden rounded-xl">
            <img
              src={product.images[0] || 'https://via.placeholder.com/600x600'}
              alt={product.title}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="space-y-4">
            {product.brand && (
              <p className="text-sm font-semibold uppercase text-[#64748B]">
                {product.brand}
              </p>
            )}
            <h3 className="text-xl font-bold text-[#1E293B] dark:text-white">
              {product.title}
            </h3>

            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-[#0EA5E9]">
                € {product.price.toFixed(2)}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <>
                  <span className="text-lg text-[#64748B] line-through">
                    € {product.originalPrice.toFixed(2)}
                  </span>
                  <span className="rounded-full bg-[#E0F2FE] px-2 py-1 text-xs font-semibold text-[#0EA5E9]">
                    -{discount}%
                  </span>
                </>
              )}
            </div>

            {product.sizes && product.sizes.length > 0 && (
              <div>
                <label className="mb-2 block text-sm font-medium text-[#1E293B] dark:text-white">
                  Maat
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition ${
                        selectedSize === size
                          ? 'border-[#0EA5E9] bg-[#0EA5E9] text-white'
                          : 'border-[#E2E8F0] text-[#1E293B] hover:border-[#0EA5E9] dark:border-gray-700 dark:text-white'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.colors && product.colors.length > 0 && (
              <div>
                <label className="mb-2 block text-sm font-medium text-[#1E293B] dark:text-white">
                  Kleur
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition ${
                        selectedColor === color
                          ? 'border-[#0EA5E9] bg-[#0EA5E9] text-white'
                          : 'border-[#E2E8F0] text-[#1E293B] hover:border-[#0EA5E9] dark:border-gray-700 dark:text-white'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={handleAddToCart}
              className="w-full"
              disabled={product.inventory === 0}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              {product.inventory === 0 ? 'Niet op voorraad' : 'Voeg toe aan winkelwagen'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VariantSelector;

