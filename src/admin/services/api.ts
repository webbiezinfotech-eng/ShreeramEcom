// admin-panel/src/services/api.ts

// ---------- ENV ----------
const API_BASE_URL: string =
(import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:8000/api";
  // (import.meta as any).env?.VITE_API_BASE_URL || "https://shreeram.webbeizinfotech.in/api";
const API_KEY: string =
  (import.meta as any).env?.VITE_API_KEY || "SHREERAMstore";

// ---------- Low-level fetch helper ----------
export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;

  const isFormData = options.body instanceof FormData;

  // Add API key to URL if not already present
  const separator = url.includes('?') ? '&' : '?';
  const finalUrl = url.includes('api_key=') ? url : `${url}${separator}api_key=${API_KEY}`;

  const res = await fetch(finalUrl, {
    ...options,
    headers: {
      // multipart ke case me Content-Type browser set karega; isliye skip
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      "X-API-Key": API_KEY,
      ...(options.headers || {}),
    },
  });

  const ct = res.headers.get("content-type") || "";
  const body = ct.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    throw new Error(typeof body === "string" ? body : JSON.stringify(body));
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
  getAll: (page = 1, limit = 20, search = "") => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search ? { q: search } : {}),
    });
    return apiCall(`endpoints/products.php?${params.toString()}`);
  },
  getById: (id: number) => apiCall(`endpoints/products.php?id=${id}`),

  // ✅ Allow FormData OR JSON
  create: (data: any) =>
    apiCall("endpoints/products.php", {
      method: "POST",
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),

  update: (id: number, data: any) =>
    apiCall(`endpoints/products.php?id=${id}`, {
      method: "PUT",
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),

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
  getAll: () => apiCall("endpoints/categories.php"),
  getById: (id: number) => apiCall(`endpoints/categories.php?id=${id}`),
  create: (data: any) =>
    apiCall("endpoints/categories.php", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: any) =>
    apiCall(`endpoints/categories.php?id=${id}`, { method: "PUT", body: JSON.stringify(data) }),
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
