'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Product, UserSession } from '@/lib/types';
import { apiJson, jsonBody } from '@/lib/api';
export type { UserSession } from '@/lib/types';
export interface CartItem {
  product: Product;
  quantity: number;
  size: string;
  color: { name: string; hex: string };
}
interface AppContextType {
  cart: CartItem[];
  user: UserSession | null;
  userReady: boolean;
  addToCart: (
    product: Product,
    quantity: number,
    size: string,
    color: { name: string; hex: string },
  ) => void;
  removeFromCart: (id: string, size: string, hex: string) => void;
  updateCartQuantity: (id: string, size: string, hex: string, quantity: number) => void;
  clearCart: () => void;
  loginUser: (user: UserSession | null) => void;
  logoutUser: () => Promise<void>;
  replaceCart: (cart: CartItem[]) => void;
}
const AppContext = createContext<AppContextType | undefined>(undefined);
function persistCart(items: CartItem[]) {
  try {
    localStorage.setItem('premium_cart', JSON.stringify(items));
  } catch {
    /* Shopping remains available when storage is unavailable. */
  }
}
function validCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false;
  const i = value as Partial<CartItem>,
    p = i.product;
  return (
    !!p &&
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.price === 'number' &&
    Number.isFinite(p.price) &&
    p.price > 0 &&
    Array.isArray(p.images) &&
    p.images.length > 0 &&
    p.images.every((v) => typeof v === 'string') &&
    Array.isArray(p.sizes) &&
    Array.isArray(p.colors) &&
    typeof i.size === 'string' &&
    typeof i.color?.name === 'string' &&
    typeof i.color?.hex === 'string' &&
    typeof i.quantity === 'number' &&
    Number.isInteger(i.quantity) &&
    i.quantity > 0 &&
    i.quantity <= 99
  );
}
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [user, setUser] = useState<UserSession | null>(null);
  const [userReady, setUserReady] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      try {
        const raw = JSON.parse(localStorage.getItem('premium_cart') || '[]');
        if (active && Array.isArray(raw)) setCart(raw.filter(validCartItem));
        localStorage.removeItem('premium_user');
      } catch {
        persistCart([]);
      }
    });
    apiJson<{ user: UserSession | null }>('/api/auth/session')
      .then((data) => {
        if (active) setUser(data.user);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setUserReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  const replaceCart = useCallback((next: CartItem[]) => {
    setCart(next);
    persistCart(next);
  }, []);
  const changeCart = (fn: (prev: CartItem[]) => CartItem[]) =>
    setCart((prev) => {
      const next = fn(prev);
      persistCart(next);
      return next;
    });
  const addToCart = (
    product: Product,
    quantity: number,
    size: string,
    color: { name: string; hex: string },
  ) => {
    if (!Number.isInteger(quantity) || quantity < 1) return;
    if (
      !product.inStock ||
      !product.sizes.includes(size) ||
      !product.colors.some((c) => c.hex === color.hex)
    )
      return;
    changeCart((prev) => {
      const found = prev.some(
        (i) => i.product.id === product.id && i.size === size && i.color.hex === color.hex,
      );
      const limit = Math.min(99, product.stockQuantity);
      return found
        ? prev.map((i) =>
            i.product.id === product.id && i.size === size && i.color.hex === color.hex
              ? { ...i, product, quantity: Math.min(limit, i.quantity + quantity) }
              : i,
          )
        : [...prev, { product, quantity: Math.min(limit, quantity), size, color }];
    });
  };
  const removeFromCart = (id: string, size: string, hex: string) =>
    changeCart((prev) =>
      prev.filter((i) => !(i.product.id === id && i.size === size && i.color.hex === hex)),
    );
  const updateCartQuantity = (id: string, size: string, hex: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(id, size, hex);
      return;
    }
    changeCart((prev) =>
      prev.map((i) =>
        i.product.id === id && i.size === size && i.color.hex === hex
          ? { ...i, quantity: Math.min(99, i.product.stockQuantity, quantity) }
          : i,
      ),
    );
  };
  const clearCart = () => replaceCart([]);
  const loginUser = (next: UserSession | null) => {
    setUser(next);
    setUserReady(true);
  };
  const logoutUser = async () => {
    try {
      await apiJson('/api/auth/logout', jsonBody('POST', {}));
      setUser(null);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Đăng xuất thất bại. Vui lòng thử lại.');
    }
  };
  return (
    <AppContext.Provider
      value={{
        cart,
        user,
        userReady,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        loginUser,
        logoutUser,
        replaceCart,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('Missing AppProvider');
  return value;
}
