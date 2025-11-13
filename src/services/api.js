// export const API_BASE = "https://shreeram.webbiezinfotech.in/api";
export const API_BASE = "http://localhost:8000/api";

// ✅ Get products
export async function getProducts(limit = null, page = 1, search = '') {
  try {
    let url = `${API_BASE}/endpoints/products.php?api_key=SHREERAMstore&page=${page}`;
    if (limit) url += `&limit=${limit}`;
    if (search) url += `&q=${encodeURIComponent(search)}`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch products");
    const data = await res.json();
    
    // Handle API response format: {ok: true, items: [...], total, page, limit}
    if (data.ok && Array.isArray(data.items)) {
      // Map API response to component format
      return data.items.map(item => ({
        id: item.id,
        title: item.name,
        name: item.name,
        description: item.description || '',
        price: parseFloat(item.wholesale_rate || item.mrp || 0),
        oldPrice: item.mrp && item.wholesale_rate ? parseFloat(item.mrp) : null,
        image: item.image || '',
        category: item.category_name || '',
        category_id: item.category_id,
        sku: item.sku || '',
        stock: item.stock || 0,
        status: item.status || 'active',
        rating: 4.5 // Default rating
      }));
    }
    return [];
  } catch (err) {
    console.error("API Error:", err);
    return [];
  }
}

// ✅ Get products by category
export async function getProductsByCategory(categoryId, limit = null) {
  try {
    let url = `${API_BASE}/endpoints/products.php?api_key=SHREERAMstore`;
    if (limit) url += `&limit=${limit}`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch products");
    const data = await res.json();
    
    if (data.ok && Array.isArray(data.items)) {
      let products = data.items.map(item => ({
        id: item.id,
        title: item.name,
        name: item.name,
        description: item.description || '',
        price: parseFloat(item.wholesale_rate || item.mrp || 0),
        oldPrice: item.mrp && item.wholesale_rate ? parseFloat(item.mrp) : null,
        image: item.image || '',
        category: item.category_name || '',
        category_id: item.category_id,
        sku: item.sku || '',
        stock: item.stock || 0,
        status: item.status || 'active',
        rating: 4.5
      }));
      
      // Filter by category if categoryId provided
      if (categoryId) {
        products = products.filter(p => p.category_id === parseInt(categoryId) || p.category === categoryId);
      }
      
      return products;
    }
    return [];
  } catch (err) {
    console.error("API Error:", err);
    return [];
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
          image: item.image || '',
          category_name: item.category_name || '',
          category_id: item.category_id,
          sku: item.sku || '',
          stock: item.stock || 0,
          status: item.status || 'active',
          rating: 4.5
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
    
    const res = await fetch(`${API_BASE}/endpoints/cart.php`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error("Failed to add to cart");
    return await res.json();
  } catch (err) {
    console.error("API Error (add to cart):", err);
    return { ok: false, error: err.message };
  }
}

export async function updateCartItem(itemId, quantity, customerId = null, sessionId = null) {
  try {
    const formData = new FormData();
    formData.append('item_id', itemId);
    formData.append('quantity', quantity);
    if (customerId) formData.append('customer_id', customerId);
    if (sessionId) formData.append('session_id', sessionId);
    formData.append('api_key', 'SHREERAMstore');
    
    const res = await fetch(`${API_BASE}/endpoints/cart.php`, {
      method: 'PUT',
      body: formData
    });
    if (!res.ok) throw new Error("Failed to update cart item");
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