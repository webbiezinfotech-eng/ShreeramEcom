import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getWishlistItems, addToWishlist, removeFromWishlist, checkWishlistStatus } from '../services/api';
import { getLoggedInCustomerId, getSessionId } from '../services/api';

const WishlistContext = createContext();

export function WishlistProvider({ children }) {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadWishlistItems = useCallback(async () => {
    setLoading(true);
    try {
      const customerId = getLoggedInCustomerId();
      const sessionId = getSessionId();
      
      // Only load if user is logged in
      if (!customerId && !sessionId) {
        setWishlistItems([]);
        setLoading(false);
        return;
      }
      
      const result = await getWishlistItems(customerId, sessionId);
      if (result.ok && Array.isArray(result.items)) {
        setWishlistItems(result.items);
      } else {
        // If error, log it but still set empty array
        if (result.error) {
          console.error('Wishlist fetch error:', result.error);
        }
        setWishlistItems([]);
      }
    } catch (error) {
      // Log error for debugging
      console.error('Wishlist context error:', error);
      setWishlistItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWishlistItems();
    
    // Reload when customer logs in/out
    const handleStorageChange = () => {
      loadWishlistItems();
    };
    
    const handleLogout = () => {
      setWishlistItems([]);
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('customerLogin', handleStorageChange);
    window.addEventListener('customerLogout', handleLogout);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('customerLogin', handleStorageChange);
      window.removeEventListener('customerLogout', handleLogout);
    };
  }, [loadWishlistItems]);

  const addItem = async (productId) => {
    try {
      const customerId = getLoggedInCustomerId();
      
      // Check if user is logged in
      if (!customerId) {
        return { success: false, error: 'Please login first', requiresLogin: true };
      }
      
      const sessionId = getSessionId();
      
      const result = await addToWishlist(productId, customerId, sessionId);
      if (result.ok) {
        await loadWishlistItems();
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const removeItem = async (wishlistId = null, productId = null) => {
    try {
      const customerId = getLoggedInCustomerId();
      const sessionId = getSessionId();
      
      const result = await removeFromWishlist(wishlistId, productId, customerId, sessionId);
      if (result.ok) {
        await loadWishlistItems();
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const isInWishlist = useCallback((productId) => {
    return wishlistItems.some(item => item.product_id === productId);
  }, [wishlistItems]);

  const getWishlistCount = useCallback(() => {
    return wishlistItems.length;
  }, [wishlistItems]);

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        loading,
        addItem,
        removeItem,
        isInWishlist,
        getWishlistCount,
        reloadWishlist: loadWishlistItems
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within WishlistProvider');
  }
  return context;
}

