import React, { createContext, useCallback, useContext, useState, useMemo, useEffect, ReactNode } from 'react';
import { StoreProduct } from '@workspace/api-client-react';

export type CartItem = {
  product: StoreProduct;
  quantity: number;
};

interface CartContextType {
  items: CartItem[];
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (product: StoreProduct, quantity?: number) => void;
  updateQuantity: (priceId: string, quantity: number) => void;
  removeFromCart: (priceId: string) => void;
  clearCart: () => void;
  reconcileCatalog: (products: StoreProduct[]) => void;
  subtotal: number;
  shippingTotal: number;
  total: number;
  hasPhysicalItems: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'aimd_gallery_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  const addToCart = (product: StoreProduct, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.product.priceId === product.priceId);
      if (existing) {
        return prev.map((item) =>
          item.product.priceId === product.priceId
            ? { ...item, product, quantity: Math.min(10, item.quantity + quantity) }
            : item
        );
      }
      return [...prev, { product, quantity: Math.min(10, Math.max(1, quantity)) }];
    });
    openCart();
  };

  const updateQuantity = (priceId: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(priceId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.product.priceId === priceId ? { ...item, quantity: Math.min(10, quantity) } : item
      )
    );
  };

  const removeFromCart = (priceId: string) => {
    setItems((prev) => prev.filter((item) => item.product.priceId !== priceId));
  };

  const clearCart = () => {
    setItems([]);
  };

  const reconcileCatalog = useCallback((products: StoreProduct[]) => {
    const productsByPrice = new Map(products.map((product) => [product.priceId, product]));
    setItems((current) => current.flatMap((item) => {
      const currentProduct = productsByPrice.get(item.product.priceId);
      return currentProduct
        ? [{ ...item, product: currentProduct, quantity: Math.min(10, item.quantity) }]
        : [];
    }));
  }, []);

  const hasPhysicalItems = useMemo(() => {
    return items.some((item) => item.product.fulfillmentType === 'physical');
  }, [items]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.product.unitAmount * item.quantity, 0);
  }, [items]);

  // $7.50 under $75, free at $75
  const shippingTotal = useMemo(() => {
    if (!hasPhysicalItems) return 0;
    if (subtotal >= 7500) return 0;
    return 750;
  }, [subtotal, hasPhysicalItems]);

  const total = subtotal + shippingTotal;

  return (
    <CartContext.Provider
      value={{
        items,
        isCartOpen,
        openCart,
        closeCart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        reconcileCatalog,
        subtotal,
        shippingTotal,
        total,
        hasPhysicalItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
