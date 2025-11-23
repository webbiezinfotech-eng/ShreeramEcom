// admin-panel/src/pages/order.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>("all"); // "all", "today", "tomorrow", "this_week", "this_month"
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
  const [openDelete, setOpenDelete] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ListOrder | null>(null);
  const [orderItemsView, setOrderItemsView] = useState<any[]>([]);

  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [custLoading, setCustLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState<any[]>([]);
  const [createSelectedCategoryId, setCreateSelectedCategoryId] = useState<number | null>(null);
  const [createSelectedProductId, setCreateSelectedProductId] = useState<number>(0);
  const [createProductQuantity, setCreateProductQuantity] = useState<number>(1);
  const [createItems, setCreateItems] = useState<Array<{
    product_id: number;
    category_id: number;
    product_name: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>>([]);
  const [editSelectedCategoryId, setEditSelectedCategoryId] = useState<number | null>(null);
  const [editSelectedProductId, setEditSelectedProductId] = useState<number>(0);
  const [editProductQuantity, setEditProductQuantity] = useState<number>(1);
  const [editItems, setEditItems] = useState<Array<{
    id?: number;
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
    // Helper function to get order date (prefer order_date, fallback to created_at)
    const getOrderDate = (o: ListOrder): Date | null => {
      // Try order_date first, then created_at
      const dateStr = (o as any).order_date || o.created_at;
      if (!dateStr) return null;
      
      // Handle both date-only format (YYYY-MM-DD) and datetime format
      let d: Date;
      if (typeof dateStr === 'string') {
        // If it's just a date string without time, add time to avoid timezone issues
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          d = new Date(dateStr + 'T00:00:00');
        } else {
          d = new Date(dateStr);
        }
      } else {
        d = new Date(dateStr);
      }
      
      return isNaN(d.getTime()) ? null : d;
    };

    // Filter by day (Today, Tomorrow, This Week, This Month)
    let byDay = orders;
    if (selectedDayFilter !== "all") {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      if (selectedDayFilter === "today") {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        byDay = orders.filter((o) => {
          const orderDate = getOrderDate(o);
          if (!orderDate) return false;
          orderDate.setHours(0, 0, 0, 0);
          return orderDate >= now && orderDate < tomorrow;
        });
      } else if (selectedDayFilter === "tomorrow") {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(dayAfter.getDate() + 1);
        byDay = orders.filter((o) => {
          const orderDate = getOrderDate(o);
          if (!orderDate) return false;
          orderDate.setHours(0, 0, 0, 0);
          return orderDate >= tomorrow && orderDate < dayAfter;
        });
      } else if (selectedDayFilter === "this_week") {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        byDay = orders.filter((o) => {
          const orderDate = getOrderDate(o);
          if (!orderDate) return false;
          orderDate.setHours(0, 0, 0, 0);
          return orderDate >= weekStart && orderDate < weekEnd;
        });
      } else if (selectedDayFilter === "this_month") {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        byDay = orders.filter((o) => {
          const orderDate = getOrderDate(o);
          if (!orderDate) return false;
          orderDate.setHours(0, 0, 0, 0);
          return orderDate >= monthStart && orderDate < monthEnd;
        });
      }
    }

    // Filter by status
    const byStatus =
      selectedStatus === "all"
        ? byDay
        : byDay.filter(
            (o) => (o.status || "").toLowerCase() === selectedStatus.toLowerCase()
          );

    // Filter by search term (customer name, firm name, address, order ID)
    const q = (searchTerm || "").toLowerCase();
    if (!q) return byStatus;
    return byStatus.filter((o) => {
      const idStr = `ORD-${String(o.id).padStart(3, "0")}`.toLowerCase();
      const customerName = (o.customer_name || "").toLowerCase();
      const firmName = ((o as any).customer_firm || "").toLowerCase();
      const address = (o.address || "").toLowerCase();
      return (
        customerName.includes(q) ||
        firmName.includes(q) ||
        address.includes(q) ||
        idStr.includes(q)
      );
    });
  }, [orders, selectedStatus, selectedDayFilter, searchTerm]);

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
    setCreateItems([]);
    setCreateSelectedCategoryId(null);
    setCreateSelectedProductId(0);
    setCreateProductQuantity(1);
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
  const createFilteredProducts = useMemo(() => {
    if (!createSelectedCategoryId) return products;
    return products.filter(p => p.category_id === createSelectedCategoryId);
  }, [products, createSelectedCategoryId]);

  const editFilteredProducts = useMemo(() => {
    if (!editSelectedCategoryId) return products;
    return products.filter(p => p.category_id === editSelectedCategoryId);
  }, [products, editSelectedCategoryId]);

  const handleCreateAddProduct = () => {
    if (!createSelectedProductId || createProductQuantity <= 0) {
      showAlert('warning', 'Please select a product and enter quantity');
      return;
    }
    
    const product = createFilteredProducts.find(p => p.id === createSelectedProductId);
    if (!product) {
      showAlert('error', 'Product not found');
      return;
    }
    
    if (createProductQuantity > product.stock) {
      showAlert('warning', `Only ${product.stock} items available in stock`);
      return;
    }
    
    const subtotal = product.price * createProductQuantity;
    setCreateItems(prev => [...prev, {
      product_id: product.id,
      category_id: product.category_id || 0,
      product_name: product.name,
      quantity: createProductQuantity,
      price: product.price,
      subtotal,
    }]);
    
    // Reset inputs
    setCreateSelectedProductId(0);
    setCreateProductQuantity(1);
    setCreateSelectedCategoryId(null);
  };

  const handleCreateRemoveProduct = (index: number) => {
    setCreateItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateUpdateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) return;
    const item = createItems[index];
    const product = products.find(p => p.id === item.product_id);
    if (product && quantity > product.stock) {
      showAlert('warning', `Only ${product.stock} items available in stock`);
      return;
    }
    setCreateItems(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        quantity,
        subtotal: copy[index].price * quantity,
      };
      return copy;
    });
  };

  useEffect(() => {
    const total = createItems.reduce((sum, item) => sum + item.subtotal, 0);
    setCreateForm(prev => ({ ...prev, total_amount: total }));
  }, [createItems]);

  const handleEditAddProduct = () => {
    if (!editSelectedProductId || editProductQuantity <= 0) {
      showAlert('warning', 'Please select a product and enter quantity');
      return;
    }

    const product = editFilteredProducts.find(p => p.id === editSelectedProductId);
    if (!product) {
      showAlert('error', 'Product not found');
      return;
    }

    if (editProductQuantity > product.stock) {
      showAlert('warning', `Only ${product.stock} items available in stock`);
      return;
    }

    const subtotal = product.price * editProductQuantity;
    setEditItems(prev => [...prev, {
      product_id: product.id,
      category_id: product.category_id || 0,
      product_name: product.name,
      quantity: editProductQuantity,
      price: product.price,
      subtotal,
    }]);

    setEditSelectedProductId(0);
    setEditProductQuantity(1);
    setEditSelectedCategoryId(null);
  };

  const handleEditRemoveProduct = (index: number) => {
    setEditItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditUpdateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) return;
    const item = editItems[index];
    const product = products.find(p => p.id === item.product_id);
    if (product && quantity > product.stock) {
      showAlert('warning', `Only ${product.stock} items available in stock`);
      return;
    }
    setEditItems(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        quantity,
        subtotal: copy[index].price * quantity,
      };
      return copy;
    });
  };

  useEffect(() => {
    const total = editItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    setEditForm(prev => ({ ...prev, total_amount: total > 0 ? total : prev.total_amount }));
  }, [editItems]);

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
    setEditItems([]);
    setEditSelectedCategoryId(null);
    setEditSelectedProductId(0);
    setEditProductQuantity(1);
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
    // ensure customers, categories, products loaded
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
    if (categories.length === 0) {
      try {
        const cats = await categoriesAPI.getAll();
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
    if (products.length === 0) {
      try {
        const prods = await productsAPI.getAll(1, 1000);
        const list: any[] = prods?.items || prods?.data || (Array.isArray(prods) ? prods : []);
        setProducts(list.map((p: any) => ({
          id: Number(p.id || 0),
          name: String(p.name || ""),
          price: Number(p.mrp || p.wholesale_rate || p.price || 0),
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
    // Fetch order items for edit BEFORE opening modal
    try {
      const orderData: any = await ordersAPI.getById(order.id);
      console.log("Order data for edit:", orderData); // Debug
      
      let itemsToSet: any[] = [];
      // API returns {ok: true, item: {...}, items: [...]}
      if (orderData?.items && Array.isArray(orderData.items)) {
        itemsToSet = orderData.items;
      } else if (orderData?.data?.items && Array.isArray(orderData.data.items)) {
        itemsToSet = orderData.data.items;
      } else if (Array.isArray(orderData)) {
        itemsToSet = orderData;
      }
      
      if (itemsToSet.length > 0) {
        const formattedItems = itemsToSet.map((item: any) => {
          const price = Number(item.price || 0);
          const quantity = Number(item.quantity || 0);
          return {
            id: item.id != null ? Number(item.id) : undefined,
            product_id: Number(item.product_id || 0),
            category_id: item.category_id != null ? Number(item.category_id) : 0,
            product_name: item.product_name || item.name || `Product #${item.product_id}`,
            quantity: quantity,
            price: price,
            subtotal: price * quantity, // Always calculate from price * quantity
          };
        });
        setEditItems(formattedItems);
        setOrderItemsView(itemsToSet);
      } else {
        console.warn("No items found in order data:", orderData);
        setEditItems([]);
        setOrderItemsView([]);
      }
    } catch (e: any) {
      console.error("Failed to load order items", e);
      showAlert('warning', 'Failed to load order items. You can still edit order details.');
      setEditItems([]);
      setOrderItemsView([]);
    }
    
    setOpenEdit(true);
  };

  const handleDeleteOrder = (order: ListOrder) => {
    setSelectedOrder(order);
    setOpenDelete(true);
  };

  const confirmDeleteOrder = async () => {
    if (!selectedOrder) return;
    
    try {
      await ordersAPI.cancel(selectedOrder.id);
      setOpenDelete(false);
      setSelectedOrder(null);
      fetchOrders();
      showAlert('success', '✅ Order cancelled successfully!');
    } catch (e: any) {
      showAlert('error', e?.message || "❌ Failed to cancel order");
    }
  };

  const handleUpdateOrder = async () => {
    if (!selectedOrder) {
      showAlert('error', 'No order selected');
      return;
    }

    try {
      // Calculate total amount from items if items exist, otherwise use form value or existing order amount
      let calculatedTotal = selectedOrder.total_amount;
      if (editItems.length > 0) {
        calculatedTotal = editItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
      } else if (editForm.total_amount > 0) {
        calculatedTotal = editForm.total_amount;
      }

      const payload: any = {
        status: editForm.status,
        payment: editForm.payment,
        address: editForm.address || null,
        order_date: editForm.order_date || null,
        delivery_date: editForm.delivery_date || null,
        total_amount: calculatedTotal,
      };

      // Only include items if there are items to update
      // If editItems is empty but order had items, we keep existing items (don't send items field)
      // Only send items array if user actually modified items
      if (editItems.length > 0) {
        payload.items = editItems.map(item => ({
          id: item.id,
          product_id: item.product_id,
          category_id: item.category_id || null,
          quantity: Number(item.quantity || 1),
          price: Number(item.price || 0),
          subtotal: Number(item.subtotal || (item.price * item.quantity)),
        }));
      }
      // Note: If editItems is empty, we don't send items field, so backend keeps existing items

      console.log('Updating order with payload:', payload); // Debug
      const response = await ordersAPI.update(selectedOrder.id, payload);
      console.log('Update response:', response); // Debug
      
      setOpenEdit(false);
      setSelectedOrder(null);
      setEditItems([]);
      setOrderItemsView([]);
      fetchOrders();
      showAlert('success', '✅ Order updated successfully!');
    } catch (e: any) {
      console.error('Order update error:', e);
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
          <div className="flex flex-wrap gap-4">
            {/* Day Filter - Priority First */}
            <select
              value={selectedDayFilter}
              onChange={(e) => setSelectedDayFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50 font-medium"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
            </select>
            
            {/* Status Filter */}
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
              <option value="cancelled">Cancelled</option>
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
                      <Link
                        to={`/admin/orders/customer/${o.customer_id}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium cursor-pointer"
                        title={`View all orders for ${o.customer_name || 'this customer'}`}
                      >
                        {o.customer_name || "-"}
                      </Link>
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
                          disabled={o.status?.toLowerCase() === 'cancelled'}
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
          <div className="bg-white w-full max-w-4xl rounded-xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold">Edit Order #{selectedOrder.id}</h3>
                {editForm.order_date && (
                  <p className="text-sm text-gray-500 mt-1">
                    Order Date: <span className="font-medium">{editForm.order_date}</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => setOpenEdit(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✖
              </button>
            </div>

            <div className="space-y-6">
              {/* Order Details Section */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Order Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <textarea
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              {/* Current Order Items Section */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Current Order Items ({editItems.length})
                </h4>
                {editItems.length > 0 ? (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">#</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Product Name</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Rate (₹)</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Quantity</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Subtotal (₹)</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {editItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-gray-600">{idx + 1}</td>
                              <td className="px-4 py-3">
                                <div>
                                  <p className="font-medium text-gray-800">{item.product_name || `Product #${item.product_id}`}</p>
                                  {item.category_id && (
                                    <p className="text-xs text-gray-500">Category ID: {item.category_id}</p>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                <span className="font-medium">₹{Number(item.price || 0).toFixed(2)}</span>
                                <span className="text-xs text-gray-500 ml-1">/unit</span>
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleEditUpdateQuantity(idx, Number(e.target.value))}
                                  className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                <span className="font-semibold text-green-600">₹{Number((item.price || 0) * (item.quantity || 0)).toFixed(2)}</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleEditRemoveProduct(idx)}
                                  className="text-red-600 hover:text-red-700 text-lg font-bold"
                                  title="Remove Item"
                                >
                                  ×
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-blue-50 border-t-2 border-blue-200">
                          <tr>
                            <td colSpan={4} className="px-4 py-3 text-right font-semibold text-gray-700">
                              Calculated Total:
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-lg font-bold text-blue-600">
                                ₹{editItems.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0).toFixed(2)}
                              </span>
                            </td>
                            <td className="px-4 py-3"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-gray-600 text-sm">No products in this order. Add products below.</p>
                  </div>
                )}
              </div>

              {/* Add New Products Section */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Add New Products to Order</h4>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-12 md:col-span-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                      <select
                        value={editSelectedCategoryId || ""}
                        onChange={(e) => setEditSelectedCategoryId(e.target.value ? Number(e.target.value) : null)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
                      <select
                        value={editSelectedProductId || ""}
                        onChange={(e) => setEditSelectedProductId(Number(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">-- Select Product --</option>
                        {editFilteredProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} - ₹{p.price} (MRP: ₹{p.mrp || 0}, Stock: {p.stock})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-12 md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={editProductQuantity}
                        onChange={(e) => setEditProductQuantity(Number(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Qty"
                      />
                    </div>
                    <div className="col-span-12 md:col-span-1">
                      <button
                        type="button"
                        onClick={handleEditAddProduct}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Select category, product, and quantity to add items to this order</p>
                </div>
              </div>

              {/* Order Status & Payment Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Amount (₹)</label>
                  <input
                    type="number"
                    value={editForm.total_amount}
                    onChange={(e) => setEditForm({ ...editForm, total_amount: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                    min="0"
                    step="0.01"
                    readOnly
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-calculated: ₹{editItems.reduce((sum, item) => sum + (item.subtotal || 0), 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpenEdit(false)}
                className="px-6 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleUpdateOrder();
                }}
                className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              {/* Order Details Section */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Order Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
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

              {/* Add Products Section */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Add Products to Order</h4>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-12 md:col-span-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                      <select
                        value={createSelectedCategoryId || ""}
                        onChange={(e) => setCreateSelectedCategoryId(e.target.value ? Number(e.target.value) : null)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
                      <select
                        value={createSelectedProductId || ""}
                        onChange={(e) => setCreateSelectedProductId(Number(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">-- Select Product --</option>
                        {createFilteredProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} - ₹{p.price} (MRP: ₹{p.mrp || 0}, Stock: {p.stock})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-12 md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={createProductQuantity}
                        onChange={(e) => setCreateProductQuantity(Number(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Qty"
                      />
                    </div>
                    <div className="col-span-12 md:col-span-1">
                      <button
                        type="button"
                        onClick={handleCreateAddProduct}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Select category, product, and quantity to add items to this order</p>
                </div>
              </div>

              {/* Order Items List - Table Format */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Order Items ({createItems.length})
                  {createItems.length === 0 && (
                    <span className="text-xs text-gray-500 ml-2 font-normal">(Add products above)</span>
                  )}
                </h4>
                {createItems.length > 0 ? (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">#</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Product Name</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Rate (₹)</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Quantity</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Subtotal (₹)</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {createItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-gray-600">{idx + 1}</td>
                              <td className="px-4 py-3">
                                <div>
                                  <p className="font-medium text-gray-800">{item.product_name || `Product #${item.product_id}`}</p>
                                  {item.category_id && (
                                    <p className="text-xs text-gray-500">Category ID: {item.category_id}</p>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                <span className="font-medium">₹{Number(item.price || 0).toFixed(2)}</span>
                                <span className="text-xs text-gray-500 ml-1">/unit</span>
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleCreateUpdateQuantity(idx, Number(e.target.value))}
                                  className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                <span className="font-semibold text-green-600">₹{Number(item.subtotal || 0).toFixed(2)}</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleCreateRemoveProduct(idx)}
                                  className="text-red-600 hover:text-red-700 text-lg font-bold"
                                  title="Remove Item"
                                >
                                  ×
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-blue-50 border-t-2 border-blue-200">
                          <tr>
                            <td colSpan={4} className="px-4 py-3 text-right font-semibold text-gray-700">
                              Calculated Total:
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-lg font-bold text-blue-600">
                                ₹{createItems.reduce((sum, item) => sum + (item.subtotal || 0), 0).toFixed(2)}
                              </span>
                            </td>
                            <td className="px-4 py-3"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-gray-600 text-sm">No products added yet. Select category, product, and quantity above to add items.</p>
                  </div>
                )}
              </div>

              {/* Total Amount (Auto-calculated) */}
              {createItems.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-700">Total Amount:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      ₹{createForm.total_amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Additional Order Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  if (createItems.length === 0) {
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
                      items: createItems.map(item => ({
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
                    setCreateItems([]);
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

      {/* Delete/Cancel Order Confirmation Modal */}
      {openDelete && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Cancel Order</h3>
              <button
                onClick={() => {
                  setOpenDelete(false);
                  setSelectedOrder(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✖
              </button>
            </div>
            <div className="mb-6">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-center text-gray-700 mb-2">
                Are you sure you want to cancel order <span className="font-semibold">#{selectedOrder.id}</span>?
              </p>
              <p className="text-center text-sm text-gray-500">
                This will change the order status to "Cancelled". This action can be reverted later.
              </p>
              {selectedOrder.status?.toLowerCase() === 'cancelled' && (
                <p className="text-center text-sm text-red-600 mt-2 font-medium">
                  This order is already cancelled.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setOpenDelete(false);
                  setSelectedOrder(null);
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700"
              >
                No, Keep Order
              </button>
              <button
                onClick={confirmDeleteOrder}
                disabled={selectedOrder.status?.toLowerCase() === 'cancelled'}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Yes, Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
