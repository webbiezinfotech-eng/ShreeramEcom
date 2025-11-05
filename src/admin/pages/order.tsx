// admin-panel/src/pages/order.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ordersAPI,
  customersAPI,
  productsAPI,
  categoriesAPI,
  type Order as ApiOrder,
  type Product,
  type Category,
} from "../services/api";
import Alert from "../components/Alert";

type CustomerLite = {
  id: number;
  name: string;
  firm?: string;
};

const INR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

type ListOrder = ApiOrder & {
  address?: string;
  payment?: string;
  order_date?: string;
  delivery_date?: string;
  items?: number;
};

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

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<ListOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Alert states
  const [alert, setAlert] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    isVisible: boolean;
  }>({
    type: 'success',
    message: '',
    isVisible: false
  });

  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Show alert function
  const showAlert = (type: 'success' | 'error' | 'warning' | 'info', message: string): void => {
    setAlert({ type, message, isVisible: true });
  };

  const hideAlert = () => {
    setAlert(prev => ({ ...prev, isVisible: false }));
  };

  // Modal states
  const [openCreate, setOpenCreate] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ListOrder | null>(null);
  const [orderItemsView, setOrderItemsView] = useState<any[]>([]);

  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [custLoading, setCustLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number>(0);
  const [productQuantity, setProductQuantity] = useState<number>(1);
  const [orderItems, setOrderItems] = useState<Array<{
    product_id: number;
    category_id: number;
    product_name: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>>([]);
  
  const [createForm, setCreateForm] = useState({
    customer_id: 0,
    total_amount: 0,
    currency: "INR",
    payment: "pending" as "paid" | "pending" | "failed",
    status: "pending" as
      | "pending"
      | "confirmed"
      | "processing"
      | "shipped"
      | "delivered"
      | "cancelled"
      | "proceed",
    address: "",
    order_date: "",
    delivery_date: "",
  });

  const [editForm, setEditForm] = useState({
    customer_id: 1,
    total_amount: 0,
    currency: "INR",
    payment: "pending" as "paid" | "pending" | "failed",
    status: "pending" as
      | "pending"
      | "confirmed"
      | "processing"
      | "shipped"
      | "delivered"
      | "cancelled"
      | "proceed",
    address: "",
    order_date: "",
    delivery_date: "",
  });

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await ordersAPI.getAll(1, 200, {
        status: selectedStatus,
        q: searchTerm.trim() || undefined,
      });
      const items: any[] =
        raw?.items || raw?.data || (Array.isArray(raw) ? raw : []);
      const normalized: ListOrder[] = items.map((o: any) => ({
        ...o,
        id: Number(o.id || 0),
        customer_id: Number(o.customer_id || 0),
        total_amount: Number(o.total_amount || 0),
        status: o.status || null, // Ensure status is included
        items_count: Number(o.items_count || o.items || 0), // Store items_count from backend
        items: Number(o.items_count || o.items || 0), // Also add to items for display
      }));
      setOrders(normalized);
    } catch (e: any) {
      setError(e?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus]);

  const visibleOrders = useMemo(() => {
    const q = (searchTerm || "").toLowerCase();
    const byStatus =
      selectedStatus === "all"
        ? orders
        : orders.filter(
            (o) => (o.status || "").toLowerCase() === selectedStatus.toLowerCase()
          );
    if (!q) return byStatus;
    return byStatus.filter((o) => {
      const idStr = `ORD-${String(o.id).padStart(3, "0")}`.toLowerCase();
      return (
        (o.customer_name || "").toLowerCase().includes(q) ||
        (o.address || "").toLowerCase().includes(q) ||
        idStr.includes(q)
      );
    });
  }, [orders, selectedStatus, searchTerm]);

  const stats = useMemo(() => {
    const c = (key: string) =>
      orders.filter((o) => {
        const status = (o.status || (o as any).status || "").toString().toLowerCase().trim();
        return status === key.toLowerCase().trim();
      }).length;
    return {
      total: orders.length,
      pending: c("pending"),
      processing: c("processing"),
      shipped: c("shipped"),
      delivered: c("delivered"),
      cancelled: c("cancelled"),
    };
  }, [orders]);

  const openCreateModal = async () => {
    setOpenCreate(true);
    setOrderItems([]);
    setSelectedCategoryId(null);
    setSelectedProductId(0);
    setProductQuantity(1);
    setSelectedCustomerHistory([]);
    setCreateForm({
      customer_id: 0,
      total_amount: 0,
      currency: "INR",
      payment: "pending",
      status: "pending",
      address: "",
      order_date: "",
      delivery_date: "",
    });
    
    // Load customers
    if (customers.length === 0 && !custLoading) {
      setCustLoading(true);
      try {
        const raw = await customersAPI.getAll(1, 1000);
        const list: any[] =
          raw?.items || raw?.data || (Array.isArray(raw) ? raw : []);
        const parsed: CustomerLite[] = list.map((c: any) => ({
          id: Number(c.id || c.customer_id || 0),
          name: String(c.name || c.customer_name || ""),
          firm: String(c.firm || ""),
        }));
        setCustomers(parsed);
      } catch (e: any) {
        console.error("Failed to load customers", e);
      } finally {
        setCustLoading(false);
      }
    }
    
    // Load categories
    if (categories.length === 0) {
      try {
        const cats = await categoriesAPI.getAll();
        // API returns {items: [...]}
        const list: any[] = Array.isArray(cats) ? cats : (cats?.items || cats?.data || []);
        setCategories(list.map((c: any) => ({
          id: Number(c.id || 0),
          name: String(c.name || ""),
          parent_id: c.parent_id != null ? Number(c.parent_id) : null,
        })));
      } catch (e: any) {
        console.error("Failed to load categories", e);
        showAlert('error', 'Failed to load categories');
      }
    }
    
    // Load products
    if (products.length === 0) {
      try {
        const prods = await productsAPI.getAll(1, 1000);
        const list: any[] = prods?.items || prods?.data || (Array.isArray(prods) ? prods : []);
        setProducts(list.map((p: any) => ({
          id: Number(p.id || 0),
          name: String(p.name || ""),
          price: Number(p.mrp || p.wholesale_rate || p.price || 0), // Use mrp or wholesale_rate from DB
          mrp: Number(p.mrp || 0),
          wholesale_rate: Number(p.wholesale_rate || 0),
          category_id: p.category_id != null ? Number(p.category_id) : null,
          stock: Number(p.stock || 0),
          status: (p.status || "active") as "active" | "inactive",
        })));
      } catch (e: any) {
        console.error("Failed to load products", e);
      }
    }
  };

  // Handle customer selection - fetch order history
  const handleCustomerSelect = async (customerId: number) => {
    setCreateForm({ ...createForm, customer_id: customerId });
    if (customerId > 0) {
      try {
        const raw = await ordersAPI.getAll(1, 100, {});
        const allOrders: any[] = raw?.items || raw?.data || (Array.isArray(raw) ? raw : []);
        const customerOrders = allOrders.filter((o: any) => Number(o.customer_id) === customerId);
        setSelectedCustomerHistory(customerOrders);
      } catch (e: any) {
        console.error("Failed to load customer history", e);
      }
    } else {
      setSelectedCustomerHistory([]);
    }
  };

  // Filter products by category
  const filteredProducts = useMemo(() => {
    if (!selectedCategoryId) return products;
    return products.filter(p => p.category_id === selectedCategoryId);
  }, [products, selectedCategoryId]);

  // Add product to order
  const handleAddProduct = () => {
    if (!selectedProductId || productQuantity <= 0) {
      showAlert('warning', 'Please select a product and enter quantity');
      return;
    }
    
    const product = filteredProducts.find(p => p.id === selectedProductId);
    if (!product) {
      showAlert('error', 'Product not found');
      return;
    }
    
    if (productQuantity > product.stock) {
      showAlert('warning', `Only ${product.stock} items available in stock`);
      return;
    }
    
    const subtotal = product.price * productQuantity;
    setOrderItems([...orderItems, {
      product_id: product.id,
      category_id: product.category_id || 0,
      product_name: product.name,
      quantity: productQuantity,
      price: product.price,
      subtotal,
    }]);
    
    // Reset inputs
    setSelectedProductId(0);
    setProductQuantity(1);
    setSelectedCategoryId(null);
    
    // Update total
    updateTotal();
  };

  // Remove product from order
  const handleRemoveProduct = (index: number) => {
    const newItems = orderItems.filter((_, i) => i !== index);
    setOrderItems(newItems);
    updateTotal();
  };

  // Update quantity of a product
  const handleUpdateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) return;
    const item = orderItems[index];
    const product = products.find(p => p.id === item.product_id);
    if (product && quantity > product.stock) {
      showAlert('warning', `Only ${product.stock} items available in stock`);
      return;
    }
    const newItems = [...orderItems];
    newItems[index].quantity = quantity;
    newItems[index].subtotal = newItems[index].price * quantity;
    setOrderItems(newItems);
    updateTotal();
  };

  // Auto-calculate total
  const updateTotal = () => {
    const total = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    setCreateForm({ ...createForm, total_amount: total });
  };

  // Auto-update total when items change
  useEffect(() => {
    updateTotal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderItems]);

  const getCustomerFirm = (customerId: number) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.firm || "-";
  };

  const handleViewOrder = async (order: ListOrder) => {
    setSelectedOrder(order);
    setOrderItemsView([]); // Reset first
    setOpenView(true);
    // Fetch order items
    try {
      const orderData: any = await ordersAPI.getById(order.id);
      console.log("Order data for view:", orderData); // Debug
      // API returns {ok: true, item: {...}, items: [...]}
      if (orderData?.items && Array.isArray(orderData.items) && orderData.items.length > 0) {
        setOrderItemsView(orderData.items);
      } else if (orderData?.data?.items && Array.isArray(orderData.data.items)) {
        setOrderItemsView(orderData.data.items);
      } else if (Array.isArray(orderData)) {
        setOrderItemsView(orderData);
      } else {
        console.warn("No items found in order data:", orderData);
        setOrderItemsView([]);
      }
    } catch (e: any) {
      console.error("Failed to load order items", e);
      showAlert('error', 'Failed to load order items: ' + (e?.message || 'Unknown error'));
      setOrderItemsView([]);
    }
  };

  const handleEditOrder = async (order: ListOrder) => {
    setSelectedOrder(order);
    setOrderItemsView([]); // Reset first
    setEditForm({
      customer_id: order.customer_id,
      total_amount: order.total_amount,
      currency: order.currency || "INR",
      payment: (order as any).payment || "pending",
      status: (order.status as any) || "pending",
      address: order.address || "",
      order_date: (order as any).order_date || order.created_at?.slice(0, 10) || "",
      delivery_date: (order as any).delivery_date || "",
    });
    setOpenEdit(true);
    // Fetch order items for edit
    try {
      const orderData: any = await ordersAPI.getById(order.id);
      console.log("Order data for edit:", orderData); // Debug
      // API returns {ok: true, item: {...}, items: [...]}
      if (orderData?.items && Array.isArray(orderData.items) && orderData.items.length > 0) {
        setOrderItemsView(orderData.items);
      } else if (orderData?.data?.items && Array.isArray(orderData.data.items)) {
        setOrderItemsView(orderData.data.items);
      } else if (Array.isArray(orderData)) {
        setOrderItemsView(orderData);
      } else {
        console.warn("No items found in order data:", orderData);
        setOrderItemsView([]);
      }
    } catch (e: any) {
      console.error("Failed to load order items", e);
      showAlert('error', 'Failed to load order items: ' + (e?.message || 'Unknown error'));
      setOrderItemsView([]);
    }
  };

  const handleDeleteOrder = async (order: ListOrder) => {
    if (window.confirm(`Are you sure you want to delete order #${order.id}?`)) {
      try {
        await ordersAPI.cancel(order.id);
        fetchOrders();
        showAlert('success', '✅ Order deleted successfully!');
      } catch (e: any) {
        showAlert('error', e?.message || "❌ Failed to delete order");
      }
    }
  };

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return;
    
    try {
      await ordersAPI.update(selectedOrder.id, editForm);
      setOpenEdit(false);
      setSelectedOrder(null);
      fetchOrders();
      showAlert('success', '✅ Order updated successfully!');
    } catch (e: any) {
      showAlert('error', e?.message || "❌ Failed to update order");
    }
  };

  return (
    <div className="w-full px-4">
      {/* Alert Component */}
      <Alert
        type={alert.type}
        message={alert.message}
        isVisible={alert.isVisible}
        onClose={hideAlert}
        duration={4000}
      />
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Order Management</h1>
        <p className="text-gray-600">Manage all customer orders</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: "Total Orders", val: stats.total, color: "text-blue-600" },
          { label: "Pending", val: stats.pending, color: "text-yellow-600" },
          { label: "Processing", val: stats.processing, color: "text-purple-600" },
          { label: "Shipped", val: stats.shipped, color: "text-indigo-600" },
          { label: "Delivered", val: stats.delivered, color: "text-green-600" },
          { label: "Cancelled", val: stats.cancelled, color: "text-red-600" },
        ].map((c, i) => (
          <div key={i} className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
            <div className="text-center">
              <p className={`text-2xl font-bold ${c.color}`}>{c.val}</p>
              <p className="text-sm text-gray-600">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters/Search */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-4">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancel">Cancelled</option>
              <option value="proceed">Proceed</option>
            </select>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
          </div>
        </div>
      </div>

      {/* Table - Fixed width, no horizontal scroll on page */}
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
                  <th className="px-4 py-3 w-48">Customer</th>
                  <th className="px-4 py-3 w-48">Firm</th>
                  <th className="px-4 py-3 w-64">Address</th>
                  <th className="px-4 py-3 w-32">Order Date</th>
                  <th className="px-4 py-3 w-32">Delivery Date</th>
                  <th className="px-4 py-3 w-20">Items</th>
                  <th className="px-4 py-3 w-32">Amount</th>
                  <th className="px-4 py-3 w-28">Status</th>
                  <th className="px-4 py-3 w-28">Payment</th>
                  <th className="px-4 py-3 w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((o, index) => (
                  <tr key={o.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 font-medium">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-gray-800 truncate">
                      {o.customer_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 truncate">
                      {(o as any).customer_firm || "-"}
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
                    <td className="px-4 py-3 text-gray-600 font-semibold">{(o as any).items_count ?? (o as any).items ?? 0}</td>
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
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleViewOrder(o)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View Details"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEditOrder(o)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Edit Order"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(o)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Cancel Order"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visibleOrders.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-6 py-10 text-center text-gray-500">
                      No orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex gap-4">
        <button
          onClick={openCreateModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Create New Order
        </button>
        <button
          onClick={() => {
            // Export functionality
            const csv = [
              ["#", "Customer", "Firm", "Address", "Order Date", "Delivery Date", "Items", "Amount", "Status", "Payment"],
              ...visibleOrders.map((o, index) => [
                index + 1,
                o.customer_name || "-",
                getCustomerFirm(o.customer_id),
                o.address || "-",
                (o as any).order_date || o.created_at?.slice(0, 10) || "-",
                (o as any).delivery_date || "-",
                (o as any).items || 0,
                o.total_amount,
                o.status || "-",
                (o as any).payment || "-"
              ])
            ];
            const csvContent = csv.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
            const blob = new Blob([csvContent], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "orders.csv";
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Export Orders
        </button>
        <button
          className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Send Updates
        </button>
      </div>

      {/* View Order Modal */}
      {openView && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Order Details</h3>
              <button
                onClick={() => setOpenView(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✖
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order ID</label>
                  <p className="text-gray-900 font-medium">#{selectedOrder.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                  <p className="text-gray-900">{selectedOrder.customer_name || "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Firm</label>
                  <p className="text-gray-900">{getCustomerFirm(selectedOrder.customer_id)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <p className="text-gray-900 font-semibold text-green-600">{INR(selectedOrder.total_amount)}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <p className="text-gray-900">{selectedOrder.address || "-"}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order Date</label>
                  <p className="text-gray-900">{(selectedOrder as any).order_date || selectedOrder.created_at?.slice(0, 10) || "-"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date</label>
                  <p className="text-gray-900">{(selectedOrder as any).delivery_date || "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusClass(selectedOrder.status)}`}>
                    {statusLabel(selectedOrder.status)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment</label>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${paymentClass((selectedOrder as any).payment)}`}>
                    {((selectedOrder as any).payment || "-")
                      .toString()
                      .replace(/^\w/, (c: string) => c.toUpperCase())}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Order Items ({orderItemsView.length})</label>
                {orderItemsView.length > 0 ? (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-2">
                    {orderItemsView.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center bg-white p-3 rounded border">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">
                            {item.product_name || item.name || `Product #${item.product_id}`}
                          </p>
                          <div className="flex gap-3 mt-1 flex-wrap">
                            {item.category_name && (
                              <p className="text-xs text-blue-600 font-medium">Category: {item.category_name}</p>
                            )}
                            {item.category_id && (
                              <p className="text-xs text-gray-500">Cat ID: {item.category_id}</p>
                            )}
                            {item.product_id && (
                              <p className="text-xs text-gray-500">Product ID: {item.product_id}</p>
                            )}
                            {item.sku && (
                              <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-600">Qty: <strong className="text-gray-800">{item.quantity || 0}</strong></span>
                          <span className="text-gray-600">Price: <strong className="text-gray-800">₹{item.price || 0}</strong>/unit</span>
                          <span className="font-semibold text-green-600 text-base">₹{item.subtotal || (item.price * item.quantity) || 0}</span>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-300 mt-2">
                      <span className="font-semibold text-gray-700">Total:</span>
                      <span className="text-lg font-bold text-blue-600">
                        ₹{orderItemsView.reduce((sum: number, item: any) => sum + (item.subtotal || (item.price * item.quantity) || 0), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No items found for this order</p>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setOpenView(false)}
                className="px-6 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {openEdit && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Edit Order #{selectedOrder.id}</h3>
              <button
                onClick={() => setOpenEdit(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✖
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
                <select
                  value={editForm.customer_id}
                  onChange={(e) => setEditForm({ ...editForm, customer_id: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.firm ? `(${c.firm})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Total Amount (₹)</label>
                <input
                  type="number"
                  value={editForm.total_amount}
                  onChange={(e) => setEditForm({ ...editForm, total_amount: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <textarea
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Order Date</label>
                  <input
                    type="date"
                    value={editForm.order_date}
                    onChange={(e) => setEditForm({ ...editForm, order_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Date</label>
                  <input
                    type="date"
                    value={editForm.delivery_date}
                    onChange={(e) => setEditForm({ ...editForm, delivery_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Order Items ({orderItemsView.length})</label>
                {orderItemsView.length > 0 ? (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-2 max-h-60 overflow-y-auto">
                    {orderItemsView.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center bg-white p-3 rounded border">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">
                            {item.product_name || item.name || `Product #${item.product_id}`}
                          </p>
                          <div className="flex gap-3 mt-1 flex-wrap">
                            {item.category_name && (
                              <p className="text-xs text-blue-600 font-medium">Category: {item.category_name}</p>
                            )}
                            {item.category_id && (
                              <p className="text-xs text-gray-500">Cat ID: {item.category_id}</p>
                            )}
                            {item.product_id && (
                              <p className="text-xs text-gray-500">Product ID: {item.product_id}</p>
                            )}
                            {item.sku && (
                              <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-600">Qty: <strong className="text-gray-800">{item.quantity || 0}</strong></span>
                          <span className="text-gray-600">Price: <strong className="text-gray-800">₹{item.price || 0}</strong>/unit</span>
                          <span className="font-semibold text-green-600 text-base">₹{item.subtotal || (item.price * item.quantity) || 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No items found for this order</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="proceed">Proceed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment</label>
                  <select
                    value={editForm.payment}
                    onChange={(e) => setEditForm({ ...editForm, payment: e.target.value as any })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setOpenEdit(false)}
                className="px-6 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateOrder}
                className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Update Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {openCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto py-8">
          <div className="bg-white w-full max-w-4xl rounded-xl shadow-xl p-6 my-8 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Create New Order</h3>
              <button
                onClick={() => setOpenCreate(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✖
              </button>
            </div>

            <div className="space-y-6">
              {/* Customer Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Customer *</label>
                <select
                  value={createForm.customer_id || ""}
                  onChange={(e) => handleCustomerSelect(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={custLoading}
                >
                  {custLoading ? (
                    <option>Loading customers...</option>
                  ) : (
                    <>
                      <option value="">-- Select Customer --</option>
                      {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.firm ? `(${c.firm})` : ""}
                      </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              {/* Customer Purchase History */}
              {createForm.customer_id > 0 && selectedCustomerHistory.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Customer Purchase History</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedCustomerHistory.slice(0, 10).map((order: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-xs bg-white p-2 rounded border">
              <div>
                          <span className="font-medium">Order #{order.id}</span>
                          <span className="text-gray-500 ml-2">{order.order_date || order.created_at?.slice(0, 10) || "-"}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded text-xs ${statusClass(order.status)}`}>
                            {statusLabel(order.status)}
                          </span>
                          <span className="font-semibold text-green-600">{INR(order.total_amount || 0)}</span>
                        </div>
                      </div>
                    ))}
                    {selectedCustomerHistory.length === 0 && (
                      <p className="text-xs text-gray-500">No previous orders found</p>
                    )}
                  </div>
                </div>
              )}

              {/* Product Selection Section */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Add Products</h4>
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-12 md:col-span-4">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                    <select
                      value={selectedCategoryId || ""}
                      onChange={(e) => setSelectedCategoryId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Categories</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-12 md:col-span-5">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
                    <select
                      value={selectedProductId || ""}
                      onChange={(e) => setSelectedProductId(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">-- Select Product --</option>
                      {filteredProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} - ₹{p.price} (MRP: ₹{p.mrp || 0}, Stock: {p.stock})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-12 md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                <input
                  type="number"
                      min="1"
                      value={productQuantity}
                      onChange={(e) => setProductQuantity(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-12 md:col-span-1">
                    <button
                      onClick={handleAddProduct}
                      className="w-full bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Order Items List */}
              {orderItems.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Order Items</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {orderItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">{item.product_name}</p>
                          <p className="text-xs text-gray-500">₹{item.price} per unit</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-600">Qty:</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateQuantity(idx, Number(e.target.value))}
                              className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                          </div>
                          <span className="text-sm font-semibold text-green-600 w-20 text-right">
                            ₹{item.subtotal}
                          </span>
                          <button
                            onClick={() => handleRemoveProduct(idx)}
                            className="text-red-600 hover:text-red-700 text-lg font-bold"
                            title="Remove"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total Amount (Auto-calculated) */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-700">Total Amount:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    ₹{createForm.total_amount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address</label>
                <textarea
                  value={createForm.address || ""}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, address: e.target.value })
                  }
                  onFocus={(e) => {
                    // Prevent browser extensions from interfering
                    e.stopPropagation();
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Enter delivery address"
                  autoComplete="street-address"
                  data-lpignore="true"
                />
              </div>

              {/* Dates and Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Order Date</label>
                  <input
                    type="date"
                    value={createForm.order_date}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, order_date: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Date</label>
                  <input
                    type="date"
                    value={createForm.delivery_date}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, delivery_date: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={createForm.status}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, status: e.target.value as any })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="proceed">Proceed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment</label>
                  <select
                    value={createForm.payment}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, payment: e.target.value as any })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t pt-4">
              <button
                onClick={() => setOpenCreate(false)}
                className="px-6 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!createForm.customer_id || createForm.customer_id === 0) {
                    showAlert('warning', 'Please select a customer');
                    return;
                  }
                  if (orderItems.length === 0) {
                    showAlert('warning', 'Please add at least one product to the order');
                    return;
                  }
                  try {
                    // Send order with items
                    // Only send: product_id (FK), category_id (FK), quantity, price (at time of order)
                    // Product name will be fetched from products table via FK
                    const payload = {
                      ...createForm,
                      order_date: createForm.order_date || null,
                      delivery_date: createForm.delivery_date || null,
                      items: orderItems.map(item => ({
                        product_id: item.product_id,
                        category_id: item.category_id || null,
                        quantity: Number(item.quantity || 1),
                        price: Number(item.price || 0),
                        subtotal: Number(item.subtotal || (item.price * item.quantity)),
                      })),
                    };
                    console.log("Sending order with items:", payload); // Debug
                    
                    const response: any = await ordersAPI.create(payload as any);
                    console.log("Order creation response:", response); // Debug
                    
                    if (response?.items_saved !== undefined) {
                      showAlert('success', `✅ Order created successfully! ${response.items_saved} items saved.`);
                    } else {
                      showAlert('success', '✅ Order created successfully!');
                    }
                    
                    setOpenCreate(false);
                    fetchOrders();
                    setCreateForm({
                      customer_id: 0,
                      total_amount: 0,
                      currency: "INR",
                      payment: "pending",
                      status: "pending",
                      address: "",
                      order_date: "",
                      delivery_date: "",
                    });
                    setOrderItems([]);
                  } catch (e: any) {
                    console.error("Order creation error:", e); // Debug
                    showAlert('error', e?.message || "❌ Failed to create order");
                  }
                }}
                className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Create Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
