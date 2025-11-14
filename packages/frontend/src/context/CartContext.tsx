import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { CheckoutItem } from '../lib/api';

export interface CartItem {
  productId: string;
  variantId?: string;
  title: string;
  price: number;
  image: string;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  total: number;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  toCheckoutPayload: () => CheckoutItem[];
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

const STORAGE_KEY = 'zalando-cart';

export const CartProvider = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') {
      return [];
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as CartItem[]) : [];
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (item: CartItem): void => {
    setItems((prev) => {
      // Check if exact same item exists (same productId and variantId)
      const exists = prev.find(
        (cartItem) =>
          cartItem.productId === item.productId &&
          cartItem.variantId === item.variantId
      );
      if (exists) {
        return prev.map((cartItem) =>
          cartItem.productId === item.productId &&
          cartItem.variantId === item.variantId
            ? { ...cartItem, quantity: cartItem.quantity + item.quantity }
            : cartItem
        );
      }
      toast.success(`${item.title} toegevoegd aan je winkelwagen.`);
      return [...prev, item];
    });
  };

  const removeItem = (productId: string, variantId?: string): void => {
    setItems((prev) =>
      prev.filter(
        (item) => !(item.productId === productId && (variantId === undefined || item.variantId === variantId))
      )
    );
  };

  const updateQuantity = (productId: string, quantity: number, variantId?: string): void => {
    const nextQuantity = Math.max(1, quantity);
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId && (variantId === undefined || item.variantId === variantId)
          ? { ...item, quantity: nextQuantity }
          : item
      )
    );
  };

  const clearCart = (): void => {
    setItems([]);
  };

  const value = useMemo<CartContextValue>(() => {
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const toCheckoutPayload = (): CheckoutItem[] =>
      items
        .filter((item): item is CartItem & { variantId: string } => !!item.variantId) // Only include items with variantId
        .map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity
        }));

    return {
      items,
      total,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      toCheckoutPayload
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextValue => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};
