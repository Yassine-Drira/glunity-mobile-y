import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CartItem {
  id: string; // product _id
  name: string;
  price: number;
  quantity: number;
  image?: string;
  sellerId?: string;
  unit?: string;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  addToCart: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

const CART_STORAGE_KEY = '@glunity_cart_v1';
const DEFAULT_DELIVERY_FEE = 7;

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // Load saved cart on startup
  useEffect(() => {
    async function loadCart() {
      try {
        const saved = await AsyncStorage.getItem(CART_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setItems(parsed);
          }
        }
      } catch (e) {
        console.error('Failed to load cart from AsyncStorage:', e);
      }
    }
    loadCart();
  }, []);

  // Save cart changes
  const saveCart = async (nextItems: CartItem[]) => {
    setItems(nextItems);
    try {
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextItems));
    } catch (e) {
      console.error('Failed to save cart to AsyncStorage:', e);
    }
  };

  const addToCart = useCallback(
    (product: Omit<CartItem, 'quantity'>, qty: number = 1) => {
      setItems((prev) => {
        const existingIndex = prev.findIndex((i) => i.id === product.id);
        let next: CartItem[];
        if (existingIndex > -1) {
          next = [...prev];
          next[existingIndex] = {
            ...next[existingIndex],
            quantity: next[existingIndex].quantity + qty,
          };
        } else {
          next = [...prev, { ...product, quantity: qty }];
        }
        AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    []
  );

  const removeFromCart = useCallback((productId: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== productId);
      AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prev) => {
      const next = prev.map((i) => (i.id === productId ? { ...i, quantity } : i));
      AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setItems([]);
    AsyncStorage.removeItem(CART_STORAGE_KEY).catch(() => {});
  }, []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const deliveryFee = items.length > 0 ? DEFAULT_DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        deliveryFee,
        total,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
