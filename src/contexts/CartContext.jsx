import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCartItems, addToCart, updateCartItem, clearCart, getSessionId } from '../services/api';

// API Base URL for image construction (should match api.js)
const API_BASE_URL = "https://shreeram.webbiezinfotech.in";
// const API_BASE_URL = "http://localhost:8000"; // LOCAL DEVELOPMENT

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

  // Initialize session ID and customer ID from localStorage
  useEffect(() => {
    const session = getSessionId();
    setSessionId(session);
    
    // Sync customer ID from localStorage
    const storedCustomerId = localStorage.getItem('customer_id');
    if (storedCustomerId) {
      setCustomerId(storedCustomerId);
    }
  }, []);

  // Load cart items
  const loadCartItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getCartItems(customerId, sessionId);
      if (response.ok) {
        // Map cart items to ensure proper structure
        const mappedItems = (response.items || []).map(item => {
          // Construct full image URL if image path exists
          const imagePath = item.image || item.image_url || '';
          let imageUrl = '';
          if (imagePath) {
            // If already a full URL, use it; otherwise construct
            if (imagePath.startsWith('http')) {
              imageUrl = imagePath;
            } else {
              // Image path from DB is like "api/uploads/filename.jpg"
              // Construct full URL: "https://shreeram.webbiezinfotech.in/api/uploads/filename.jpg"
              let cleanPath = imagePath.trim();
              if (cleanPath.startsWith('/')) {
                cleanPath = cleanPath.slice(1);
              }
              // Path already includes 'api/' so just prepend base URL
              imageUrl = `${API_BASE_URL}/${cleanPath}`;
            }
          }
          
          return {
            id: item.id || item.cart_id,
            cart_id: item.cart_id || item.id,
            product_id: item.product_id,
            quantity: parseInt(item.quantity || 1),
            price: parseFloat(item.wholesale_rate || item.price || 0),
            name: item.name || 'Product',
            sku: item.sku || '',
            category_name: item.category_name || 'General',
            stock: parseInt(item.stock || 0),
            status: item.status || 'active',
            image: imageUrl,
            // Calculate subtotal if not provided
            subtotal: parseFloat(item.wholesale_rate || item.price || 0) * parseInt(item.quantity || 1)
          };
        });
        setCartItems(mappedItems);
        
        // Update session ID if returned
        if (response.session_id) {
          localStorage.setItem('session_id', response.session_id);
          setSessionId(response.session_id);
        }
      }
    } catch (error) {
      console.error('Error loading cart items:', error.message || error);
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  }, [customerId, sessionId]);

  // Listen for storage changes (e.g., when user logs in/out in another tab)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'customer_id') {
        const newCustomerId = e.newValue;
        setCustomerId(newCustomerId);
        // Reload cart when customer ID changes
        if (newCustomerId) {
          loadCartItems();
        } else {
          setCartItems([]);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadCartItems]);

  // Watch for customer_id changes in localStorage (same tab) and custom events
  useEffect(() => {
    const checkCustomerId = () => {
      const storedCustomerId = localStorage.getItem('customer_id');
      if (storedCustomerId !== customerId) {
        setCustomerId(storedCustomerId);
      }
    };
    
    // Listen for custom login event
    const handleCustomerLogin = (e) => {
      if (e.detail && e.detail.id) {
        setCustomerId(e.detail.id.toString());
      }
    };
    
    window.addEventListener('customerLogin', handleCustomerLogin);
    
    // Check periodically (e.g., after login)
    const interval = setInterval(checkCustomerId, 1000);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('customerLogin', handleCustomerLogin);
    };
  }, [customerId]);


  // Add item to cart
  const addItemToCart = async (productId, quantity = 1) => {
    try {
      // Ensure we have a session ID before adding to cart
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        currentSessionId = getSessionId();
        setSessionId(currentSessionId);
      }
      
      // Ensure we have customer ID if logged in
      let currentCustomerId = customerId;
      if (!currentCustomerId) {
        const storedCustomerId = localStorage.getItem('customer_id');
        if (storedCustomerId) {
          currentCustomerId = storedCustomerId;
          setCustomerId(storedCustomerId);
        }
      }
      
      const response = await addToCart(productId, quantity, currentCustomerId, currentSessionId);
      if (response.ok) {
        // Update session ID if returned from API
        if (response.session_id) {
          localStorage.setItem('session_id', response.session_id);
          setSessionId(response.session_id);
        }
        await loadCartItems(); // Reload cart items
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Failed to add to cart' };
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      return { success: false, error: error.message || 'Failed to add to cart' };
    }
  };

  // Update cart item quantity
  const updateItemQuantity = async (itemId, quantity) => {
    try {
      // Optimistically update UI first
      setCartItems(prevItems => {
        return prevItems.map(item => {
          if (item.id === itemId || item.cart_id === itemId) {
            return {
              ...item,
              quantity: quantity,
              subtotal: parseFloat(item.price || 0) * quantity
            };
          }
          return item;
        });
      });

      // Ensure we have session ID
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        currentSessionId = getSessionId();
        setSessionId(currentSessionId);
      }
      
      // Ensure we have customer ID if logged in
      let currentCustomerId = customerId;
      if (!currentCustomerId) {
        const storedCustomerId = localStorage.getItem('customer_id');
        if (storedCustomerId) {
          currentCustomerId = storedCustomerId;
          setCustomerId(storedCustomerId);
        }
      }
      
      const response = await updateCartItem(itemId, quantity, currentCustomerId, currentSessionId);
      if (response.ok) {
        // Only reload if we need to sync with server (e.g., stock validation)
        // For now, optimistic update is enough
        return { success: true };
      } else {
        // If update failed, reload to sync with server
        await loadCartItems();
        return { success: false, error: response.error || 'Failed to update quantity' };
      }
    } catch (error) {
      console.error('Error updating cart item:', error);
      // On error, reload to ensure sync
      await loadCartItems();
      return { success: false, error: error.message || 'Failed to update quantity' };
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

  // Get cart count (number of unique items, not total quantity)
  const getCartCount = () => {
    return cartItems.length;
  };

  // Get cart total
  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // Load cart items when component mounts or customer changes
  useEffect(() => {
    if (sessionId) {
      loadCartItems();
    }
  }, [customerId, sessionId]);

  // Clear cart on logout
  useEffect(() => {
    const handleLogout = () => {
      setCartItems([]);
      setCustomerId(null);
      // Generate new session ID for guest user
      const newSessionId = 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      setSessionId(newSessionId);
      localStorage.setItem('session_id', newSessionId);
    };
    
    window.addEventListener('customerLogout', handleLogout);
    return () => {
      window.removeEventListener('customerLogout', handleLogout);
    };
  }, []);

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