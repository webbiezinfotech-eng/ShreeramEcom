import { ReactNode } from 'react';

export interface WishlistItem {
  id: number;
  product_id: number;
  product_name: string;
  description?: string;
  price: number;
  old_price?: number | null;
  image: string;
  stock: number;
  category_name?: string;
  created_at?: string;
}

export interface WishlistContextType {
  wishlistItems: WishlistItem[];
  loading: boolean;
  addItem: (productId: number) => Promise<{ success: boolean; error?: string; requiresLogin?: boolean }>;
  removeItem: (wishlistId?: number | null, productId?: number | null) => Promise<{ success: boolean; error?: string }>;
  isInWishlist: (productId: number) => boolean;
  getWishlistCount: () => number;
  reloadWishlist: () => Promise<void>;
}

export declare function WishlistProvider({ children }: { children: ReactNode }): JSX.Element;
export declare function useWishlist(): WishlistContextType;

