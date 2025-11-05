import { useCallback, useEffect, useState } from "react";
import { ordersAPI } from "../services/api";

export interface OrderItem {
  id: number;
  product_id: number;
  product_name?: string;
  quantity: number;
  price: number;
  total: number;
}
export interface Order {
  id: number;
  customer_id: number;
  customer_name?: string;
  total_amount: number;
  currency?: string;
  status?: string;
  created_at?: string;   // backend may use created_at
  order_date?: string;   // or order_date
  delivery_date?: string;
  items?: OrderItem[];
}

/* helpers */
const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const pickArray = (res: any): any[] => {
  if (Array.isArray(res)) return res;
  // most common API shapes
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.results)) return res.results;
  // sometimes nested under a specific key
  for (const v of Object.values(res || {})) if (Array.isArray(v)) return v;
  return [];
};
const normalize = (o: any): Order => ({
  ...o,
  id: num(o.id),
  customer_id: num(o.customer_id),
  total_amount: num(o.total_amount),
});

export const useOrders = (page = 1, limit = 20) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(page);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await ordersAPI.getAll(currentPage, limit);
      const list = pickArray(res).map(normalize);
      const total = num(res?.total) || num(res?.count) || list.length;
      setOrders(list);
      setTotalPages(Math.max(1, Math.ceil(total / limit)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit]);

  const createOrder = useCallback(async (orderData: Omit<Order, "id">) => {
    const res = await ordersAPI.create(orderData as any);
    await fetchOrders();
    return res;
  }, [fetchOrders]);

  const updateOrder = useCallback(async (id: number, orderData: Partial<Order>) => {
    const res = await ordersAPI.update(id, orderData as any);
    await fetchOrders();
    return res;
  }, [fetchOrders]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  return {
    orders,
    loading,
    error,
    totalPages,
    currentPage,
    setCurrentPage,
    fetchOrders,
    createOrder,
    updateOrder,
  };
};
