// PRODUCTION SERVER
export const API_BASE = "https://shreeram.webbiezinfotech.in/api";
// LOCAL DEVELOPMENT - Use Mac IP for phone testing
// export const API_BASE = "http://192.168.1.6:8000/api";
// For Mac browser testing, you can also use: "http://localhost:8000/api"

// ✅ Get products
export async function getProducts(limit = 20, page = 1, search = '') {
  try {
    let url = `${API_BASE}/endpoints/products.php?api_key=SHREERAMstore&page=${page}&limit=${limit}`;
    if (search) url += `&q=${encodeURIComponent(search)}`;
    
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    if (!res.ok) throw new Error("Failed to fetch products");
    const data = await res.json();
    
    // Handle API response format: {ok: true, items: [...], total, page, limit}
    if (data.ok && Array.isArray(data.items)) {
      // Map API response to component format
      const products = data.items.map(item => {
        // Construct full image URL if image path exists
        let imageUrl = '';
        if (item.image) {
          // If already a full URL, use it; otherwise construct from API_BASE
          imageUrl = item.image.startsWith('http') 
            ? item.image 
            : `${API_BASE.replace('/api', '')}/${item.image}`;
        }
        
        return {
          id: item.id,
          title: item.name,
          name: item.name,
          description: item.description || '',
          price: parseFloat(item.wholesale_rate || item.mrp || 0),
          oldPrice: item.mrp && item.wholesale_rate ? parseFloat(item.mrp) : null,
          image: imageUrl,
          category: item.category_name || '',
          category_id: item.category_id,
          sku: item.sku || '',
          stock: item.stock || 0,
          status: item.status || 'active',
          rating: 4.5, // Default rating
          items_per_pack: parseInt(item.items_per_pack || 1)
        };
      });
      
      return {
        products: products,
        total: data.total || products.length,
        page: data.page || page,
        limit: data.limit || limit,
        totalPages: data.total ? Math.ceil(data.total / (data.limit || limit)) : 1
      };
    }
    return { products: [], total: 0, page: 1, limit: limit, totalPages: 1 };
  } catch (err) {
    console.error("API Error:", err);
    return { products: [], total: 0, page: 1, limit: limit, totalPages: 1 };
  }
}

// ✅ Get products by category with pagination support
export async function getProductsByCategory(categoryId, limit = 20, page = 1) {
  try {
    let url = `${API_BASE}/endpoints/products.php?api_key=SHREERAMstore&page=${page}&limit=${limit}`;
    // Add category_id parameter to filter on backend
    if (categoryId) {
      url += `&category_id=${categoryId}`;
    }
    
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    if (!res.ok) throw new Error("Failed to fetch products");
    const data = await res.json();
    
    if (data.ok && Array.isArray(data.items)) {
      let products = data.items.map(item => {
        // Construct full image URL if image path exists
        let imageUrl = '';
        if (item.image) {
          imageUrl = item.image.startsWith('http') 
            ? item.image 
            : `${API_BASE.replace('/api', '')}/${item.image}`;
        }
        
        return {
          id: item.id,
          title: item.name,
          name: item.name,
          description: item.description || '',
          price: parseFloat(item.wholesale_rate || item.mrp || 0),
          oldPrice: item.mrp && item.wholesale_rate ? parseFloat(item.mrp) : null,
          image: imageUrl,
          category: item.category_name || '',
          category_id: item.category_id,
          sku: item.sku || '',
          stock: item.stock || 0,
          status: item.status || 'active',
          rating: 4.5,
          items_per_pack: parseInt(item.items_per_pack || 1)
        };
      });
      
      // Return products with pagination info
      return {
        products: products,
        total: data.total || products.length,
        page: data.page || page,
        limit: data.limit || limit,
        totalPages: data.total ? Math.ceil(data.total / (data.limit || limit)) : 1
      };
    }
    return { products: [], total: 0, page: 1, limit: limit, totalPages: 1 };
  } catch (err) {
    console.error("API Error:", err);
    return { products: [], total: 0, page: 1, limit: limit, totalPages: 1 };
  }
}

// ✅ Get single product
export async function getProductById(id) {
  try {
    const res = await fetch(`${API_BASE}/endpoints/products.php?id=${id}&api_key=SHREERAMstore`);
    if (!res.ok) throw new Error("Failed to fetch product");
    const data = await res.json();
    
    // Handle API response format: {ok: true, item: {...}}
    if (data.ok && data.item) {
      const item = data.item;
      return {
        ok: true,
        item: {
          id: item.id,
          name: item.name,
          title: item.name,
          description: item.description || '',
          price: parseFloat(item.wholesale_rate || item.mrp || 0),
          oldPrice: item.mrp && item.wholesale_rate ? parseFloat(item.mrp) : null,
          image: item.image 
            ? (item.image.startsWith('http') ? item.image : `${API_BASE.replace('/api', '')}/${item.image}`)
            : '',
          category_name: item.category_name || '',
          category_id: item.category_id,
          sku: item.sku || '',
          stock: item.stock || 0,
          status: item.status || 'active',
          rating: 4.5,
          items_per_pack: parseInt(item.items_per_pack || 1)
        }
      };
    }
    return { ok: false, item: null };
  } catch (err) {
    console.error("API Error:", err);
    return { ok: false, item: null };
  }
}

export async function getCategories() {
  try {
    const res = await fetch(`${API_BASE}/endpoints/categories.php?api_key=SHREERAMstore`);
    if (!res.ok) throw new Error("Failed to fetch categories");
    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.error("API Error (categories):", err);
    return [];
  }
}

// ✅ Cart API functions
export async function getCartItems(customerId = null, sessionId = null) {
  try {
    const params = new URLSearchParams();
    if (customerId) params.append('customer_id', customerId);
    if (sessionId) params.append('session_id', sessionId);
    params.append('api_key', 'SHREERAMstore');
    
    const res = await fetch(`${API_BASE}/endpoints/cart.php?${params}`);
    if (!res.ok) throw new Error("Failed to fetch cart items");
    return await res.json();
  } catch (err) {
    console.error("API Error (cart):", err);
    return { ok: false, items: [] };
  }
}

export async function addToCart(productId, quantity = 1, customerId = null, sessionId = null) {
  try {
    const formData = new FormData();
    formData.append('product_id', productId);
    formData.append('quantity', quantity);
    if (customerId) formData.append('customer_id', customerId);
    if (sessionId) formData.append('session_id', sessionId);
    formData.append('api_key', 'SHREERAMstore');
    
    // Also add API key to URL as query parameter for authentication
    const url = `${API_BASE}/endpoints/cart.php?api_key=SHREERAMstore`;
    
    const res = await fetch(url, {
      method: 'POST',
      body: formData
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Failed to add to cart' }));
      throw new Error(errorData.error || "Failed to add to cart");
    }
    
    return await res.json();
  } catch (err) {
    console.error("API Error (add to cart):", err);
    return { ok: false, error: err.message };
  }
}

export async function updateCartItem(itemId, quantity, customerId = null, sessionId = null) {
  try {
    // Use JSON body instead of FormData for PUT requests (PHP handles JSON better with PUT)
    const bodyData = {
      item_id: parseInt(itemId),
      quantity: parseInt(quantity)
    };
    
    if (customerId) bodyData.customer_id = customerId;
    if (sessionId) bodyData.session_id = sessionId;
    
    // Also add session_id and customer_id to URL as query params (fallback for PHP)
    const params = new URLSearchParams();
    params.append('api_key', 'SHREERAMstore');
    if (customerId) params.append('customer_id', customerId);
    if (sessionId) params.append('session_id', sessionId);
    
    const url = `${API_BASE}/endpoints/cart.php?${params}`;
    
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyData)
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Failed to update cart item' }));
      throw new Error(errorData.error || "Failed to update cart item");
    }
    
    return await res.json();
  } catch (err) {
    console.error("API Error (update cart):", err);
    return { ok: false, error: err.message };
  }
}

export async function clearCart(customerId = null, sessionId = null) {
  try {
    const params = new URLSearchParams();
    if (customerId) params.append('customer_id', customerId);
    if (sessionId) params.append('session_id', sessionId);
    params.append('api_key', 'SHREERAMstore');
    
    const res = await fetch(`${API_BASE}/endpoints/cart.php?${params}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error("Failed to clear cart");
    return await res.json();
  } catch (err) {
    console.error("API Error (clear cart):", err);
    return { ok: false, error: err.message };
  }
}

// ✅ Generate session ID for non-logged in users
export function generateSessionId() {
  return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

// ✅ Get or create session ID
export function getSessionId() {
  let sessionId = localStorage.getItem('session_id');
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem('session_id', sessionId);
  }
  return sessionId;
}

// ✅ Customer Authentication APIs
export async function loginCustomer(email, password) {
  try {
    // Use login endpoint with email and password
    const res = await fetch(`${API_BASE}/endpoints/customers.php?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&api_key=SHREERAMstore`);
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Failed to login" }));
      return { 
        ok: false, 
        error: error.error || "Failed to login",
        inactive: error.inactive || false
      };
    }
    
    const data = await res.json();
    
    if (data.ok && data.customer) {
      // Store customer info in localStorage
      localStorage.setItem('customer_id', data.customer.id);
      localStorage.setItem('customer', JSON.stringify(data.customer));
      
      return { ok: true, customer: data.customer };
    } else {
      return { 
        ok: false, 
        error: data.error || "Invalid credentials",
        inactive: data.inactive || false
      };
    }
  } catch (err) {
    console.error("API Error (login):", err);
    return { ok: false, error: err.message || "An error occurred during login" };
  }
}

export async function registerCustomer(customerData) {
  try {
    const res = await fetch(`${API_BASE}/endpoints/customers.php?api_key=SHREERAMstore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: customerData.name || customerData.fullName || '',
        firm: customerData.company || '',
        email: customerData.email,
        phone: customerData.phone || '',
        address: customerData.address || '',
        password: customerData.password || '', // Include password for hashing
        status: 'true'
      })
    });
    
    if (!res.ok) {
      const error = await res.json();
      return { ok: false, error: error.error || "Failed to register" };
    }
    
    const data = await res.json();
    
    // Auto-login after registration
    if (data.success && data.customer) {
      localStorage.setItem('customer_id', data.customer.id);
      localStorage.setItem('customer', JSON.stringify(data.customer));
      return { ok: true, customerId: data.id, customer: data.customer };
    } else if (data.success && data.id) {
      // Fallback: if customer object not returned, fetch it
      const customer = await getCustomerById(data.id);
      if (customer) {
        localStorage.setItem('customer_id', data.id);
        localStorage.setItem('customer', JSON.stringify(customer));
        return { ok: true, customerId: data.id, customer };
      }
    }
    
    return { ok: true, customerId: data.id };
  } catch (err) {
    console.error("API Error (register):", err);
    return { ok: false, error: err.message || "An error occurred during registration" };
  }
}

export async function getCustomerById(id) {
  try {
    const res = await fetch(`${API_BASE}/endpoints/customers.php?id=${id}&api_key=SHREERAMstore`);
    if (!res.ok) throw new Error("Failed to fetch customer");
    return await res.json();
  } catch (err) {
    console.error("API Error (get customer):", err);
    return null;
  }
}

export async function updateCustomer(id, customerData) {
  try {
    const res = await fetch(`${API_BASE}/endpoints/customers.php?id=${id}&api_key=SHREERAMstore`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(customerData)
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to update customer");
    }
    
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    console.error("API Error (update customer):", err);
    return { ok: false, error: err.message };
  }
}

export function getLoggedInCustomer() {
  const customerStr = localStorage.getItem('customer');
  if (customerStr) {
    try {
      return JSON.parse(customerStr);
    } catch (e) {
      return null;
    }
  }
  return null;
}

// ✅ Check if user can see product prices (must be logged in AND approved)
export function canSeePrices() {
  const customer = getLoggedInCustomer();
  if (!customer) return false;
  // Check if status is 'true' (string) or true (boolean)
  return customer.status === 'true' || customer.status === true;
}

export function getLoggedInCustomerId() {
  return localStorage.getItem('customer_id');
}

export function logoutCustomer() {
  localStorage.removeItem('customer_id');
  localStorage.removeItem('customer');
  // Clear session_id to reset cart and wishlist for guest users
  localStorage.removeItem('session_id');
  // Dispatch event to notify contexts
  window.dispatchEvent(new Event('customerLogout'));
}

// ✅ Orders API
export async function createOrder(orderData) {
  try {
    const res = await fetch(`${API_BASE}/endpoints/orders.php?api_key=SHREERAMstore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData)
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to create order");
    }
    
    return await res.json();
  } catch (err) {
    console.error("API Error (create order):", err);
    return { ok: false, error: err.message };
  }
}

export async function getOrderById(orderId) {
  try {
    const res = await fetch(`${API_BASE}/endpoints/orders.php?id=${orderId}&api_key=SHREERAMstore`);
    if (!res.ok) throw new Error("Failed to fetch order");
    const data = await res.json();
    
    if (data.ok && data.item) {
      return {
        ok: true,
        order: data.item,
        items: data.items || []
      };
    }
    
    return { ok: false, error: "Order not found" };
  } catch (err) {
    console.error("API Error (get order):", err);
    return { ok: false, error: err.message };
  }
}

export async function getCustomerOrders(customerId, page = 1, limit = 20) {
  try {
    // Get all orders and filter by customer_id on client side
    // The orders API doesn't support customer_id filter directly
    const res = await fetch(`${API_BASE}/endpoints/orders.php?page=${page}&limit=${limit * 5}&api_key=SHREERAMstore`);
    if (!res.ok) throw new Error("Failed to fetch orders");
    const data = await res.json();
    
    if (data.ok && Array.isArray(data.items)) {
      // Filter orders by customer_id
      const customerOrders = data.items.filter(order => 
        order.customer_id === parseInt(customerId) || order.customer_id === customerId
      );
      
      return {
        ok: true,
        items: customerOrders,
        total: customerOrders.length,
        page: page,
        limit: limit
      };
    }
    
    return { ok: false, items: [] };
  } catch (err) {
    console.error("API Error (get orders):", err);
    return { ok: false, items: [] };
  }
}

// ✅ Quote submission (can use contact endpoint or create new)
export async function submitQuote(quoteData) {
  try {
    // For now, we'll use customers API to create a lead/quote request
    // You might want to create a dedicated quotes endpoint
    const res = await fetch(`${API_BASE}/endpoints/customers.php?api_key=SHREERAMstore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: quoteData.name,
        firm: quoteData.company || '',
        email: quoteData.email,
        phone: quoteData.phone || '',
        address: quoteData.requirements || '', // Store requirements in address field for now
        status: 'pending' // Mark as pending quote
      })
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to submit quote");
    }
    
    const data = await res.json();
    return { ok: true, id: data.id };
  } catch (err) {
    console.error("API Error (submit quote):", err);
    return { ok: false, error: err.message };
  }
}

// ✅ Messages API functions
export async function submitMessage(messageData) {
  try {
    const res = await fetch(`${API_BASE}/endpoints/messages.php?api_key=SHREERAMstore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageData)
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to send message");
    }
    
    return await res.json();
  } catch (err) {
    console.error("API Error (submit message):", err);
    return { ok: false, error: err.message };
  }
}

// ✅ Wishlist API functions
export async function getWishlistItems(customerId = null, sessionId = null) {
  try {
    // Don't make request if no customer or session
    if (!customerId && !sessionId) {
      return { ok: true, items: [] };
    }
    
    let url = `${API_BASE}/endpoints/wishlist.php?api_key=SHREERAMstore`;
    if (customerId) url += `&customer_id=${encodeURIComponent(customerId)}`;
    if (sessionId) url += `&session_id=${encodeURIComponent(sessionId)}`;
    
    const res = await fetch(url);
    if (!res.ok) {
      // If 500 error, try to get error message
      if (res.status === 500) {
        const errorData = await res.json().catch(() => ({}));
        return { ok: false, items: [], error: errorData.error || 'Server error' };
      }
      throw new Error("Failed to fetch wishlist");
    }
    const data = await res.json();
    return data;
  } catch (err) {
    // Return error instead of silently failing
    return { ok: false, items: [], error: err.message };
  }
}

export async function addToWishlist(productId, customerId = null, sessionId = null) {
  try {
    const res = await fetch(`${API_BASE}/endpoints/wishlist.php?api_key=SHREERAMstore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: productId,
        customer_id: customerId,
        session_id: sessionId
      })
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to add to wishlist");
    }
    
    return await res.json();
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function removeFromWishlist(wishlistId = null, productId = null, customerId = null, sessionId = null) {
  try {
    let url = `${API_BASE}/endpoints/wishlist.php?api_key=SHREERAMstore`;
    if (wishlistId) url += `&id=${wishlistId}`;
    if (productId) url += `&product_id=${productId}`;
    if (customerId) url += `&customer_id=${customerId}`;
    if (sessionId) url += `&session_id=${sessionId}`;
    
    const res = await fetch(url, {
      method: 'DELETE'
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to remove from wishlist");
    }
    
    return await res.json();
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function checkWishlistStatus(productId, customerId = null, sessionId = null) {
  try {
    const wishlist = await getWishlistItems(customerId, sessionId);
    if (wishlist.ok && wishlist.items) {
      return wishlist.items.some(item => item.product_id === productId);
    }
    return false;
  } catch (err) {
    return false;
  }
}