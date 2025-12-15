// admin-panel/src/services/api.ts

// ---------- ENV ----------
// PRODUCTION SERVER
const API_BASE_URL: string = "https://shreeram.webbiezinfotech.in/api";
// LOCAL DEVELOPMENT - Use Mac IP for phone testing
// const API_BASE_URL: string = "http://192.168.1.6:8000/api";
// For Mac browser testing, you can also use: "http://localhost:8000/api"
const API_KEY: string = "SHREERAMstore";

// ---------- Low-level fetch helper ----------
export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;

  const isFormData = options.body instanceof FormData;

  // Add API key to URL if not already present
  const separator = url.includes('?') ? '&' : '?';
  const finalUrl = url.includes('api_key=') ? url : `${url}${separator}api_key=${API_KEY}`;

  let res: Response;
  try {
    res = await fetch(finalUrl, {
      ...options,
      headers: {
        // multipart ke case me Content-Type browser set karega; isliye skip
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        "X-API-Key": API_KEY,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        ...(options.headers || {}),
      },
      cache: 'no-store',
    });
  } catch (fetchError: any) {
    // Network error - server not reachable
    const error: any = new Error(
      fetchError.message || `Cannot connect to server. Please check if ${API_BASE_URL} is accessible.`
    );
    error.status = 0;
    error.isNetworkError = true;
    throw error;
  }

  const ct = res.headers.get("content-type") || "";
  const body = ct.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    // Extract error message from response
    let errorMessage = "An error occurred";
    
    if (typeof body === "object" && body !== null) {
      // If body is already parsed JSON
      if (body.error) {
        errorMessage = typeof body.error === "string" ? body.error : JSON.stringify(body.error);
      } else if (body.message) {
        errorMessage = body.message;
      } else {
        errorMessage = JSON.stringify(body);
      }
    } else if (typeof body === "string") {
      // Try to parse if it's a JSON string
      try {
        const parsed = JSON.parse(body);
        if (parsed.error) {
          errorMessage = typeof parsed.error === "string" ? parsed.error : parsed.error.message || errorMessage;
        } else if (parsed.message) {
          errorMessage = parsed.message;
        }
      } catch {
        errorMessage = body || errorMessage;
      }
    }
    
    // Create error object with status and message
    const error: any = new Error(errorMessage);
    error.status = res.status;
    error.response = body;
    throw error;
  }
  return body;
}

// ---------- helpers ----------
const toNum = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const arrOf = (raw: any): any[] => {
  if (Array.isArray(raw)) return raw;
  if (raw?.data && Array.isArray(raw.data)) return raw.data;
  if (raw?.items && Array.isArray(raw.items)) return raw.items;
  if (raw?.results && Array.isArray(raw.results)) return raw.results;
  return [];
};

// ---------- Types ----------
export type Product = {
  id: number;
  category_id: number | null;
  name: string;
  sku?: string;
  brand?: string;
  weight?: string;
  dimensions?: string;
  price: number;
  mrp?: number;
  wholesale_rate?: number;
  currency?: string;
  description?: string;
  stock: number;
  status: "active" | "inactive";
  created_at?: string;
};


export type Order = {
  id: number;
  customer_id: number;
  customer_name?: string;
  customer_email?: string;
  total_amount: number;
  currency?: string;
  status?: string;
  created_at?: string;
};

export type Category = {
  id: number;
  parent_id: number | null;
  name: string;
  slug?: string;
  image?: string | null;
  status?: 'active' | 'inactive';
};

export type RecentCustomer = {
  customer_id: number;
  name: string;
  firm: string;   // '' ho sakta hai
  amount: number;
  status: string;
  created_at: string;
};

export type TopProduct = {
  product_id: number;
  name: string;
  category: string;
  units: number;
  revenue: number;
};

export type Message = {
  id: number;
  customer_id: number | null;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: 'read' | 'unread';
  created_at: string;
  updated_at: string | null;
  customer_name?: string;
  customer_firm?: string;
  customer_email?: string;
  customer_phone?: string;
};

// ---------- API: Products ----------
export async function getProducts(limit = 1000, page = 1): Promise<Product[]> {
  const raw = await apiCall(`endpoints/products.php?limit=${limit}&page=${page}`);
  const list = arrOf(raw);
  return list.map((p: any) => ({
    ...p,
    id: toNum(p.id),
    category_id: p.category_id != null ? toNum(p.category_id) : null,
    price: toNum(p.price),
    stock: toNum(p.stock),
  })) as Product[];
}

export const productsAPI = {
  getAll: (page = 1, limit = 20, search = "", categoryId?: number | null) => {
    // Build URL with all parameters
    let url = `endpoints/products.php?page=${page}&limit=${limit}`;
    
    // Add search query if provided
    if (search && search.trim() !== '') {
      url += `&q=${encodeURIComponent(search.trim())}`;
    }
    
    // Add category_id if provided and valid - CRITICAL: Must be a valid positive number
    if (categoryId !== null && categoryId !== undefined) {
      const catIdNum = Number(categoryId);
      if (!isNaN(catIdNum) && catIdNum > 0 && Number.isInteger(catIdNum)) {
        url += `&category_id=${catIdNum}`;
      }
    }
    
    return apiCall(url);
  },
  getById: (id: number) => apiCall(`endpoints/products.php?id=${id}`),

  // ✅ Allow FormData OR JSON
  create: (data: any) =>
    apiCall("endpoints/products.php", {
      method: "POST",
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),

  update: (id: number, data: any) => {
    const isFormData = data instanceof FormData;
    // For FormData, use POST with _method override to ensure $_FILES works
    if (isFormData) {
      data.append('_method', 'PUT');
      return apiCall(`endpoints/products.php?id=${id}`, {
        method: "POST",
        body: data,
      });
    }
    return apiCall(`endpoints/products.php?id=${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  delete: (id: number) => apiCall(`endpoints/products.php?id=${id}`, { method: "DELETE" }),

  bulkImport: (products: any[]) =>
    apiCall("endpoints/products.php?action=bulk_import", {
      method: "POST",
      body: JSON.stringify({ products }),
    }),
};



// ---------- API: Orders ----------
export async function getOrders(limit = 1000, page = 1): Promise<Order[]> {
  const raw = await apiCall(`endpoints/orders.php?limit=${limit}&page=${page}`);
  const list = arrOf(raw);
  return list.map((o: any) => ({
    ...o,
    id: toNum(o.id),
    customer_id: toNum(o.customer_id),
    total_amount: toNum(o.total_amount),
  })) as Order[];
}


// ✅ Orders API (filters + CRUD)
export const ordersAPI = {
  // GET /orders.php?page=&limit=&status=&q=
  getAll: (page = 1, limit = 20, opts?: { status?: string; q?: string }) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (opts?.status && opts.status !== "all") params.set("status", opts.status);
    if (opts?.q) params.set("q", opts.q);

    return apiCall(`endpoints/orders.php?${params.toString()}`);
  },

  // GET single (with items)
  getById: (id: number) => apiCall(`endpoints/orders.php?id=${id}`),

  // POST create
  create: (data: {
    customer_id: number;
    total_amount: number;
    currency?: string;
    payment?: "paid" | "pending" | "failed";
    status?: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "proceed";
    address?: string;
    order_date?: string;
    delivery_date?: string;
    items?: Array<{
      product_id: number;
      category_id: number;
      product_name: string;
      quantity: number;
      price: number;
      subtotal: number;
    }>;
  }) => apiCall("endpoints/orders.php", { method: "POST", body: JSON.stringify(data) }),

  // PUT update
  update: (id: number, data: Partial<{
    total_amount: number;
    currency: string;
    payment: "paid" | "pending" | "failed";
    status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "proceed";
    address: string;
    order_date: string;
    delivery_date: string;
  }>) => apiCall(`endpoints/orders.php?id=${id}`, { method: "PUT", body: JSON.stringify(data) }),

  // DELETE soft-cancel
  cancel: (id: number) => apiCall(`endpoints/orders.php?id=${id}`, { method: "DELETE" }),
};

// ---------- API: Categories ----------
export const categoriesAPI = {
  getAll: (includeInactive: boolean = true) => {
    const url = includeInactive 
      ? "endpoints/categories.php?include_inactive=1"
      : "endpoints/categories.php";
    return apiCall(url);
  },
  getById: (id: number) => apiCall(`endpoints/categories.php?id=${id}`),
  create: (data: any) => {
    const isFormData = data instanceof FormData;
    return apiCall("endpoints/categories.php", {
      method: "POST",
      body: isFormData ? data : JSON.stringify(data),
    });
  },
  update: (id: number, data: any) => {
    const isFormData = data instanceof FormData;
    if (isFormData) {
      data.append('_method', 'PUT');
      return apiCall(`endpoints/categories.php?id=${id}`, {
        method: "POST",
        body: data,
      });
    }
    return apiCall(`endpoints/categories.php?id=${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  delete: (id: number) =>
    apiCall(`endpoints/categories.php?id=${id}`, { method: "DELETE" }),
};

// ---------- API: Upload ----------

export const uploadAPI = {
  upload: (file: File, productId?: number) => {
    const formData = new FormData();
    formData.append("image", file);
    if (productId != null) formData.append("product_id", String(productId));

    return apiCall("endpoints/upload.php", {
      method: "POST",
      body: formData, // don't set Content-Type manually
    });
  },
};

// ---------- API: Customers ----------

export type Customer = {
  id: number;
  name: string;
  firm?: string;
  address?: string;
  email: string;
  phone?: string;
  status: string;   // "true" | "false" ya "VIP"
  created_at?: string;
};

// // eslint-disable-next-line @typescript-eslint/no-unused-vars
// type CustomerLite = {
//   id: number;
//   name: string;
//   phone: string;
// };


export const customersAPI = {
  getAll: (page = 1, limit = 20, opts?: { q?: string; status?: string }) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (opts?.q) params.set("q", opts.q);
    if (opts?.status && opts.status !== "all") params.set("status", opts.status);

    return apiCall(`endpoints/customers.php?${params.toString()}`);
  },
  getById: (id: number) => apiCall(`endpoints/customers.php?id=${id}`),
  create: (data: any) =>
    apiCall("endpoints/customers.php", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: any) =>
    apiCall(`endpoints/customers.php?id=${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) =>
    apiCall(`endpoints/customers.php?id=${id}`, { method: "DELETE" }),
};


// ---------- API: Admins ----------
export type Admin = {
  id: number;
  name: string;
  email: string;
  created_at?: string;
};

export const adminsAPI = {
  login: (email: string, password: string) => {
    const params = new URLSearchParams({
      email,
      password,
    });
    return apiCall(`endpoints/admins.php?${params.toString()}`);
  },
  getAll: () => apiCall("endpoints/admins.php"),
  getById: (id: number) => apiCall(`endpoints/admins.php?id=${id}`),
  create: (data: { name: string; email: string; password: string }) =>
    apiCall("endpoints/admins.php", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<{ name: string; email: string; password: string }>) =>
    apiCall(`endpoints/admins.php?id=${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) => apiCall(`endpoints/admins.php?id=${id}`, { method: "DELETE" }),
};

// ---------- API: Dashboard widgets ----------
export async function getRecentCustomers(limit = 5): Promise<RecentCustomer[]> {
  const raw = await apiCall(`endpoints/dashboard_recent_customers.php?limit=${limit}`);
  const list = arrOf(raw) || arrOf((raw as any)?.data);
  return list.map((r: any) => ({
    customer_id: toNum(r.customer_id),
    name: String(r.name ?? ""),
    firm: String(r.firm ?? ""),
    amount: toNum(r.amount),
    status: String(r.status ?? ""),
    created_at: String(r.created_at ?? ""),
  })) as RecentCustomer[];
}

export async function getTopProducts(limit = 5, days = 30): Promise<TopProduct[]> {
  const raw = await apiCall(`endpoints/dashboard_top_products.php?limit=${limit}&days=${days}`);
  const list = arrOf(raw) || arrOf((raw as any)?.data);
  return list.map((t: any) => ({
    product_id: toNum(t.product_id),
    name: String(t.name ?? ""),
    category: String(t.category ?? ""),
    units: toNum(t.units),
    revenue: toNum(t.revenue),
  })) as TopProduct[];
}

export async function getMessages(limit = 10, status?: 'read' | 'unread'): Promise<Message[]> {
  let url = `endpoints/messages.php?limit=${limit}`;
  if (status) url += `&status=${status}`;
  const raw = await apiCall(url);
  const list = arrOf(raw) || arrOf((raw as any)?.data);
  return list.map((m: any) => ({
    id: toNum(m.id),
    customer_id: m.customer_id ? toNum(m.customer_id) : null,
    name: String(m.name ?? ""),
    email: String(m.email ?? ""),
    phone: String(m.phone ?? ""),
    subject: String(m.subject ?? ""),
    message: String(m.message ?? ""),
    status: (m.status === 'read' ? 'read' : 'unread') as 'read' | 'unread',
    created_at: String(m.created_at ?? ""),
    updated_at: m.updated_at ? String(m.updated_at) : null,
    customer_name: m.customer_name ? String(m.customer_name) : undefined,
    customer_firm: m.customer_firm ? String(m.customer_firm) : undefined,
    customer_email: m.customer_email ? String(m.customer_email) : undefined,
    customer_phone: m.customer_phone ? String(m.customer_phone) : undefined,
  })) as Message[];
}

export async function updateMessageStatus(id: number, status: 'read' | 'unread'): Promise<void> {
  await apiCall(`endpoints/messages.php?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

// ---------- default export (optional convenience) ----------
export default {
  apiCall,
  getProducts,
  getOrders,
  getRecentCustomers,
  getTopProducts,
  products: productsAPI,
  orders: ordersAPI,
  categories: categoriesAPI,
  upload: uploadAPI,
};
