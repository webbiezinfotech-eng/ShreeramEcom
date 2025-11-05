import React from 'react';

export interface CartItem {
  id: number;
  product_id: number;
  quantity: number;
  price: number;
  name: string;
  image?: string;
}

export interface CartContextType {
  cartItems: CartItem[];
  loading: boolean;
  customerId: number | null;
  sessionId: string | null;
  addToCart: (productId: number, quantity: number) => Promise<void>;
  updateCartItem: (itemId: number, quantity: number) => Promise<void>;
  removeFromCart: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getCartItems: () => Promise<void>;
  setCustomerId: (id: number | null) => void;
}

export declare const CartProvider: React.FC<{ children: React.ReactNode }>;
export declare const useCart: () => CartContextType;
