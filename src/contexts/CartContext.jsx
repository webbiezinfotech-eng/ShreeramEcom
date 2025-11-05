import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCartItems, addToCart, updateCartItem, clearCart, getSessionId } from '../services/api';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  // Initialize session ID
  useEffect(() => {
    const session = getSessionId();
    setSessionId(session);
  }, []);

  // Load cart items
  const loadCartItems = async () => {
    try {
      setLoading(true);
      const response = await getCartItems(customerId, sessionId);
      if (response.ok) {
        setCartItems(response.items || []);
      }
    } catch (error) {
      console.error('Error loading cart items:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add item to cart
  const addItemToCart = async (productId, quantity = 1) => {
    try {
      const response = await addToCart(productId, quantity, customerId, sessionId);
      if (response.ok) {
        await loadCartItems(); // Reload cart items
        return { success: true };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      return { success: false, error: error.message };
    }
  };

  // Update cart item quantity
  const updateItemQuantity = async (itemId, quantity) => {
    try {
      const response = await updateCartItem(itemId, quantity, customerId, sessionId);
      if (response.ok) {
        await loadCartItems(); // Reload cart items
        return { success: true };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      console.error('Error updating cart item:', error);
      return { success: false, error: error.message };
    }
  };

  // Remove item from cart
  const removeItemFromCart = async (itemId) => {
    return await updateItemQuantity(itemId, 0);
  };

  // Clear entire cart
  const clearCartItems = async () => {
    try {
      const response = await clearCart(customerId, sessionId);
      if (response.ok) {
        setCartItems([]);
        return { success: true };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
      return { success: false, error: error.message };
    }
  };

  // Get cart count
  const getCartCount = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  // Get cart total
  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // Load cart items when component mounts or customer changes
  useEffect(() => {
    loadCartItems();
  }, [customerId, sessionId]);

  const value = {
    cartItems,
    loading,
    customerId,
    setCustomerId,
    sessionId,
    loadCartItems,
    addItemToCart,
    updateItemQuantity,
    removeItemFromCart,
    clearCartItems,
    getCartCount,
    getCartTotal
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}; 