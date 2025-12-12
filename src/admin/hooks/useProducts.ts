// src/hooks/useProducts.ts
import { useCallback, useEffect, useState } from "react";
import { productsAPI } from "../services/api";

export interface Product {
  id: number;
  name: string;
  sku?: string;
  price: number;
  stock: number;
  status?: string;
  description?: string;
  category_id?: number;
  category_name?: string;   // 👈 ADD
  images?: Array<{ id: number; filename: string }>;
  mrp?: number;             // 👈 NEW
  wholesale_rate?: number;  // 👈 NEW
  brand?: string;           // 👈 NEW
  weight?: string;          // 👈 NEW
  dimensions?: string;      // 👈 NEW
}

/* helpers */
const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const pickArray = (res: any): any[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.results)) return res.results;
  for (const v of Object.values(res || {})) if (Array.isArray(v)) return v;
  return [];
};
const normalize = (p: any): Product => ({
  ...p,
  id: num(p.id),
  price: num(p.price),
  stock: num(p.stock),
  category_id: p.category_id != null ? num(p.category_id) : undefined,
  category_name: p.category_name ?? p.category ?? "",
  mrp: p.mrp != null ? num(p.mrp) : undefined,
  wholesale_rate: p.wholesale_rate != null ? num(p.wholesale_rate) : undefined,
  brand: p.brand ?? "",
  weight: p.weight ?? "",
  dimensions: p.dimensions ?? "",
});

export const useProducts = (page = 1, limit = 20, search = "", categoryId?: number | null) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(page);

  // 🔹 GET All Products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Ensure categoryId is properly typed
      const validCategoryId = (categoryId !== null && categoryId !== undefined && categoryId > 0) ? categoryId : null;
      const res: any = await productsAPI.getAll(currentPage, limit, search, validCategoryId);
      const list = pickArray(res).map(normalize);
      const total = num(res?.total) || num(res?.count) || list.length;
      setProducts(list);
      setTotalItems(total);
      setTotalPages(Math.max(1, Math.ceil(total / limit)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, search, categoryId]);

  // 🔹 CREATE Product (accepts FormData or JSON)
  const createProduct = useCallback(async (data: FormData | Omit<Product, "id">) => {
    setLoading(true);
    try {
      if (data instanceof FormData) {
        return await productsAPI.create(data); // FormData case
      }
      return await productsAPI.create(data); // JSON case
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔹 UPDATE Product
  const updateProduct = useCallback(async (id: number, productData: Partial<Product>) => {
    const res = await productsAPI.update(id, productData as any);
    await fetchProducts();
    return res;
  }, [fetchProducts]);

  // 🔹 DELETE Product
  const deleteProduct = useCallback(async (id: number) => {
    const res = await productsAPI.delete(id);
    await fetchProducts();
    return res;
  }, [fetchProducts]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  return {
    products,
    loading,
    error,
    totalPages,
    totalItems,
    currentPage,
    setCurrentPage,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
  };
};
