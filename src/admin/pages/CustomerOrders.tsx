// admin-panel/src/pages/CustomerOrders.tsx
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ordersAPI, customersAPI, type Order as ApiOrder } from "../services/api";
import Alert from "../components/Alert";

type ListOrder = ApiOrder & {
  address?: string;
  payment?: string;
  order_date?: string;
  delivery_date?: string;
  items?: number;
  customer_name?: string;
  customer_firm?: string;
};

const INR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const statusClass = (raw?: string) => {
  const s = (raw || "").toLowerCase();
  if (s === "pending") return "bg-yellow-100 text-yellow-800";
  if (s === "confirmed") return "bg-blue-100 text-blue-800";
  if (s === "processing") return "bg-purple-100 text-purple-800";
  if (s === "shipped") return "bg-indigo-100 text-indigo-800";
  if (s === "delivered") return "bg-green-100 text-green-800";
  if (s === "cancelled" || s === "canceled" || s === "cancel" || s === "x") return "bg-red-100 text-red-800";
  if (s === "proceed") return "bg-sky-100 text-sky-800";
  return "bg-gray-100 text-gray-800";
};

const statusLabel = (raw?: string) => {
  const s = (raw || "").toLowerCase();
  if (!s) return "-";
  if (s === "x") return "Cancelled";
  return s[0].toUpperCase() + s.slice(1);
};

const paymentClass = (raw?: string) => {
  const s = (raw || "").toLowerCase();
  if (s === "paid") return "bg-green-100 text-green-800";
  if (s === "pending") return "bg-yellow-100 text-yellow-800";
  if (s === "failed") return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-800";
};

const CustomerOrders: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ListOrder[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [alert, setAlert] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    isVisible: boolean;
  }>({
    type: 'success',
    message: '',
    isVisible: false
  });

  const showAlert = (type: 'success' | 'error' | 'warning' | 'info', message: string): void => {
    setAlert({ type, message, isVisible: true });
  };

  const hideAlert = () => {
    setAlert(prev => ({ ...prev, isVisible: false }));
  };

  useEffect(() => {
    if (!customerId) {
      navigate("/admin/orders");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch customer details
        const customerData: any = await customersAPI.getById(Number(customerId));
        setCustomer(customerData);

        // Fetch all orders for this customer
        const raw = await ordersAPI.getAll(1, 1000, {});
        const allOrders: any[] = raw?.items || raw?.data || (Array.isArray(raw) ? raw : []);
        const customerOrders = allOrders.filter((o: any) => Number(o.customer_id) === Number(customerId));
        
        const normalized: ListOrder[] = customerOrders.map((o: any) => ({
          ...o,
          id: Number(o.id || 0),
          customer_id: Number(o.customer_id || 0),
          total_amount: Number(o.total_amount || 0),
          status: o.status || null,
          items_count: Number(o.items_count || o.items || 0),
          items: Number(o.items_count || o.items || 0),
        }));
        
        setOrders(normalized);
      } catch (e: any) {
        setError(e?.message || "Failed to load customer orders");
        showAlert('error', 'Failed to load customer orders');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [customerId, navigate]);

  const stats = useMemo(() => {
    const c = (key: string) =>
      orders.filter((o) => {
        const status = (o.status || "").toString().toLowerCase().trim();
        return status === key.toLowerCase().trim();
      }).length;
    return {
      total: orders.length,
      pending: c("pending"),
      processing: c("processing"),
      shipped: c("shipped"),
      delivered: c("delivered"),
      cancelled: c("cancelled"),
      totalAmount: orders.reduce((sum, o) => sum + o.total_amount, 0),
    };
  }, [orders]);

  return (
    <div className="w-full px-4">
      <Alert
        type={alert.type}
        message={alert.message}
        isVisible={alert.isVisible}
        onClose={hideAlert}
        duration={4000}
      />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link
            to="/admin/orders"
            className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Orders
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Customer Order History
        </h1>
        {customer && (
          <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Customer Name</p>
                <p className="text-lg font-semibold text-gray-800">{customer.name || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Firm</p>
                <p className="text-lg font-semibold text-gray-800">{customer.firm || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-lg font-semibold text-gray-800">{customer.email || "-"}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-8">
        {[
          { label: "Total Orders", val: stats.total, color: "text-blue-600" },
          { label: "Pending", val: stats.pending, color: "text-yellow-600" },
          { label: "Processing", val: stats.processing, color: "text-purple-600" },
          { label: "Shipped", val: stats.shipped, color: "text-indigo-600" },
          { label: "Delivered", val: stats.delivered, color: "text-green-600" },
          { label: "Cancelled", val: stats.cancelled, color: "text-red-600" },
          { label: "Total Amount", val: INR(stats.totalAmount), color: "text-green-600" },
        ].map((c, i) => (
          <div key={i} className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
            <div className="text-center">
              <p className={`text-2xl font-bold ${c.color}`}>{c.val}</p>
              <p className="text-sm text-gray-600">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500">Loading…</div>
        ) : error ? (
          <div className="p-10 text-center text-red-600">Error: {error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3 w-16">#</th>
                  <th className="px-4 py-3 w-32">Order ID</th>
                  <th className="px-4 py-3 w-64">Address</th>
                  <th className="px-4 py-3 w-32">Order Date</th>
                  <th className="px-4 py-3 w-32">Delivery Date</th>
                  <th className="px-4 py-3 w-20">Items</th>
                  <th className="px-4 py-3 w-32">Amount</th>
                  <th className="px-4 py-3 w-28">Status</th>
                  <th className="px-4 py-3 w-28">Payment</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o, index) => (
                  <tr key={o.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 font-medium">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-gray-800 font-semibold">
                      #{o.id}
                    </td>
                    <td className="px-4 py-3 text-gray-600 truncate">
                      {o.address || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {(o as any).order_date || o.created_at?.slice(0, 10) || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {(o as any).delivery_date || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-semibold">
                      {(o as any).items_count ?? (o as any).items ?? 0}
                    </td>
                    <td className="px-4 py-3 font-semibold text-green-600">
                      {INR(o.total_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass(
                          o.status
                        )}`}
                      >
                        {statusLabel(o.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${paymentClass(
                          (o as any).payment
                        )}`}
                      >
                        {((o as any).payment || "-")
                          .toString()
                          .replace(/^\w/, (c: string) => c.toUpperCase())}
                      </span>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-10 text-center text-gray-500">
                      No orders found for this customer
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerOrders;

