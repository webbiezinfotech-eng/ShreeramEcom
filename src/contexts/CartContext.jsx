import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCartItems, addToCart, updateCartItem, clearCart, getSessionId } from '../services/api';

// API Base URL for image construction (should match api.js)
// PRODUCTION SERVER
// const API_BASE_URL = "https://shreeram.webbiezinfotech.in";
// LOCAL DEVELOPMENT - Use Mac IP for phone testing
const API_BASE_URL = "http://192.168.1.6:8000";
// For Mac browser testing, you can also use: "http://localhost:8000"

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
  const [showCartNotification, setShowCartNotification] = useState(false);

  // Initialize session ID and customer ID from localStorage
  useEffect(() => {
    const session = getSessionId();
    setSessionId(session);
    
    // Sync customer ID from localStorage
    const storedCustomerId = localStorage.getItem('customer_id');
    if (storedCustomerId) {
      setCustomerId(storedCustomerId);
    }
    
    // Notification will be restored when cart items are loaded
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
            // Calculate subtotal: quantity (packs) × items_per_pack × price_per_item
            items_per_pack: parseInt(item.items_per_pack || 1),
            subtotal: parseFloat(item.wholesale_rate || item.price || 0) * parseInt(item.quantity || 1) * parseInt(item.items_per_pack || 1)
          };
        });
        setCartItems(mappedItems);
        
        // Always show notification if cart has items (unless user manually closed it)
        // This ensures notification persists across navigation
        if (mappedItems.length > 0) {
          const savedNotificationState = localStorage.getItem('show_cart_notification');
          // If notification was never manually closed, or if it was shown before, show it
          if (savedNotificationState !== 'false') {
            setShowCartNotification(true);
            localStorage.setItem('show_cart_notification', 'true');
          }
        }
        
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
        
        // Show cart notification (will persist until order placed or cart cleared)
        setShowCartNotification(true);
        localStorage.setItem('show_cart_notification', 'true');
        
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
        // If quantity is 0, remove the item from cart
        if (quantity === 0) {
          return prevItems.filter(item => item.id !== itemId && item.cart_id !== itemId);
        }
        
        // Otherwise, update the quantity
        return prevItems.map(item => {
          if (item.id === itemId || item.cart_id === itemId) {
            return {
              ...item,
              quantity: quantity,
              subtotal: parseFloat(item.price || 0) * quantity * parseInt(item.items_per_pack || 1)
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
        // Reload cart items to ensure sync and update notification
        await loadCartItems();
        // Show/update cart notification when quantity changes
        if (quantity > 0) {
          setShowCartNotification(true);
          localStorage.setItem('show_cart_notification', 'true');
        }
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
    const result = await updateItemQuantity(itemId, 0);
    // If cart becomes empty after removal, hide notification
    setTimeout(() => {
      if (cartItems.length <= 1) {
        // This will be handled by the useEffect that watches cartItems.length
      }
    }, 100);
    return result;
  };

  // Clear entire cart
  const clearCartItems = async () => {
    try {
      const response = await clearCart(customerId, sessionId);
      if (response.ok) {
        setCartItems([]);
        // Hide notification when cart is cleared (order placed)
        setShowCartNotification(false);
        localStorage.removeItem('show_cart_notification');
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

  // Get cart total (quantity × items_per_pack × price)
  const getCartTotal = () => {
    return cartItems.reduce((total, item) => {
      const itemsPerPack = parseInt(item.items_per_pack || 1);
      return total + (item.price * item.quantity * itemsPerPack);
    }, 0);
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
      setShowCartNotification(false); // Hide notification on logout
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

  // Persist notification state to localStorage
  useEffect(() => {
    if (showCartNotification && cartItems.length > 0) {
      localStorage.setItem('show_cart_notification', 'true');
    } else if (!showCartNotification && cartItems.length > 0) {
      // User manually closed it - mark as 'false' but don't remove
      // So it can be restored if needed
      localStorage.setItem('show_cart_notification', 'false');
    }
  }, [showCartNotification, cartItems.length]);

  // Hide notification only when cart is completely empty (order placed or cart cleared)
  // Show notification if cart has items and it was previously shown
  useEffect(() => {
    if (cartItems.length === 0) {
      // Cart is empty - hide notification permanently
      setShowCartNotification(false);
      localStorage.removeItem('show_cart_notification');
    } else {
      // Cart has items - always show notification unless user manually closed it
      const savedNotificationState = localStorage.getItem('show_cart_notification');
      if (savedNotificationState === 'true') {
        // Notification was shown before - keep it visible
        if (!showCartNotification) {
          setShowCartNotification(true);
        }
      } else if (savedNotificationState === null || savedNotificationState === '') {
        // No saved state - show notification (first time adding items)
        setShowCartNotification(true);
        localStorage.setItem('show_cart_notification', 'true');
      }
      // If savedNotificationState === 'false', user manually closed it - don't show
    }
  }, [cartItems.length]);

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
    getCartTotal,
    showCartNotification,
    setShowCartNotification
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}; 