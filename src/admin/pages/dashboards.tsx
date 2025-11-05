// File: admin-panel/src/pages/Dashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  getRecentCustomers,
  RecentCustomer,
  getTopProducts,
  TopProduct,
} from "../services/api";
import { useProducts } from "../hooks/useProducts";
import { useOrders } from "../hooks/useOrders";
import { Link } from "react-router-dom";
import Alert from "../components/Alert";
import { 
  FiPackage, 
  FiUsers, 
  FiDollarSign, 
  FiBox,
  FiPlus,
  FiFileText,
  FiUser,
  FiTrendingUp
} from "react-icons/fi";

type DashboardCardProps = {
  title: string;
  count: number;
  description: string;
  bgColor?: string;
  textColor?: string;
  icon?: React.ReactNode;
  loading?: boolean;
  formatter?: (n: number) => string;
};

const INR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const DashboardCard = ({
  title,
  count,
  description,
  bgColor = "bg-white",
  textColor = "text-black",
  icon,
  loading = false,
  formatter,
}: DashboardCardProps) => (
  <div
    className={`${bgColor} ${textColor} p-4 sm:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs sm:text-sm opacity-80 mb-2">{title}</p>
        {loading ? (
          <div className="h-8 bg-white/20 rounded animate-pulse mb-2" />
        ) : (
          <p className="text-2xl sm:text-3xl font-bold">
            {formatter ? formatter(count) : count.toLocaleString()}
          </p>
        )}
        <p className="text-xs opacity-70 mt-2">{description}</p>
      </div>
      {icon && <div className="text-2xl sm:text-4xl opacity-20">{icon}</div>}
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  // master data
  const { products, loading: productsLoading } = useProducts();
  const { orders, loading: ordersLoading } = useOrders();

  // widgets
  const [recentCustomers, setRecentCustomers] = useState<RecentCustomer[]>([]);
  const [rcLoading, setRcLoading] = useState(true);
  const [rcError, setRcError] = useState<string | null>(null);
  
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
  
  // Show alert function (commented out as unused)
  // const showAlert = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
  //   setAlert({ type, message, isVisible: true });
  // };

  const hideAlert = () => {
    setAlert(prev => ({ ...prev, isVisible: false }));
  };

  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [tpLoading, setTpLoading] = useState(true);
  const [tpError, setTpError] = useState<string | null>(null);

  useEffect(() => {
    setRcLoading(true);
    getRecentCustomers(5)
      .then(setRecentCustomers)
      .catch((e) => setRcError(e?.message || "Failed"))
      .finally(() => setRcLoading(false));

    setTpLoading(true);
    // 3650 ~ "all time" for your seed
    getTopProducts(5, 3650)
      .then(setTopProducts)
      .catch((e) => setTpError(e?.message || "Failed"))
      .finally(() => setTpLoading(false));
  }, []);

  // ---------- KPI metrics (dynamic) ----------
  const { totalOrdersLast30, totalCustomersUnique, revenueThisMonth } =
    useMemo(() => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const last30Cutoff = new Date(now);
      last30Cutoff.setDate(now.getDate() - 30);

      const asDate = (o: any): Date | null => {
        const raw = o?.created_at || o?.order_date;
        if (!raw) return null;
        const d = new Date(raw);
        return isNaN(d as any) ? null : d;
        // if backend has no date, we treat as null (not filtered out below)
      };

      const ordersLast30 = orders.filter((o: any) => {
        const d = asDate(o);
        return d ? d >= last30Cutoff : true; // if date missing, include
      });

      const revenue = orders.reduce((sum: number, o: any) => {
        const d = asDate(o);
        const inThisMonth =
          d &&
          d >= monthStart &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear();
        return sum + (inThisMonth ? Number(o.total_amount || 0) : 0);
      }, 0);

      const uniq = new Set<number | string>();
      for (const o of orders) uniq.add((o as any).customer_id);

      return {
        totalOrdersLast30: ordersLast30.length,
        totalCustomersUnique: uniq.size,
        revenueThisMonth: revenue,
      };
    }, [orders]);

  const productsListed = products.length;

  // badges
  const statusClass = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "paid") return "status-badge status-badge-success";
    if (s === "pending") return "status-badge status-badge-warning";
    if (s === "cancelled" || s === "canceled") return "status-badge status-badge-danger";
    if (s === "proceed") return "status-badge status-badge-info";
    return "status-badge status-badge-gray";
  };
  const statusLabel = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "paid") return "Paid";
    if (s === "pending") return "Pending";
    return s ? s[0].toUpperCase() + s.slice(1) : "-";
  };

  return (
    <div className="w-full">
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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
          Welcome to Shreeram Stationery Admin
        </h1>
        <p className="text-gray-600">Manage your stationery business efficiently</p>
      </div>

      {/* KPI Cards (dynamic) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <DashboardCard
          title="Total Orders"
          count={totalOrdersLast30}
          description="Last 30 days"
          bgColor="bg-gradient-to-br from-blue-500 to-blue-600"
          textColor="text-white"
          loading={ordersLoading}
          icon={<FiPackage className="text-3xl" />}
        />
        <DashboardCard
          title="Total Customers"
          count={totalCustomersUnique}
          description="Active customers"
          bgColor="bg-gradient-to-br from-green-500 to-green-600"
          textColor="text-white"
          loading={ordersLoading}
          icon={<FiUsers className="text-3xl" />}
        />
        <DashboardCard
          title="Revenue"
          count={revenueThisMonth}
          description="This month"
          bgColor="bg-gradient-to-br from-orange-500 to-orange-600"
          textColor="text-white"
          loading={ordersLoading}
          formatter={INR}
          icon={<FiDollarSign className="text-3xl" />}
        />
        <DashboardCard
          title="Products Listed"
          count={productsListed}
          description="Active inventory"
          bgColor="bg-gradient-to-br from-purple-500 to-purple-600"
          textColor="text-white"
          loading={productsLoading}
          icon={<FiBox className="text-3xl" />}
        />
      </div>

      {/* Tables stacked FULL WIDTH */}
      <div className="space-y-8 mb-8">
        {/* Recent Customers */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-gray-100 w-full">
          <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-800 flex items-center">
            <span className="w-2 h-8 bg-blue-500 rounded-full mr-3"></span>
            Recent Customers
          </h2>

          {rcLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : rcError ? (
            <p className="text-sm text-red-600">Error: {rcError}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="professional-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Firm</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCustomers.slice(0, 6).map((c) => (
                    <tr key={c.customer_id}>
                      <td className="font-medium text-gray-800">{c.name}</td>
                      <td className="text-gray-600">{c.firm || "-"}</td>
                      <td className="font-semibold text-green-600">
                        {INR(Number(c.amount))}
                      </td>
                      <td>
                        <span className={statusClass(c.status)}>
                          {statusLabel(c.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {recentCustomers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-gray-500 py-6">
                        No recent customers
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Selling Products (dynamic) */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-gray-100 w-full">
          <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-800 flex items-center">
            <span className="w-2 h-8 bg-orange-500 rounded-full mr-3"></span>
            Top Selling Products
          </h2>

          {tpLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : tpError ? (
            <p className="text-sm text-red-600">Error: {tpError}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="professional-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th className="text-right">Units</th>
                    <th className="text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p) => (
                    <tr key={p.product_id}>
                      <td className="font-medium text-gray-800">{p.name}</td>
                      <td className="text-gray-600">{p.category || "-"}</td>
                      <td className="text-right">
                        {Number(p.units || 0).toLocaleString()}
                      </td>
                      <td className="text-right text-green-700 font-semibold">
                        {INR(Number(p.revenue))}
                      </td>
                    </tr>
                  ))}
                  {topProducts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-gray-500 py-6">
                        No sales yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-gray-100">
        <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-800 flex items-center">
          <span className="w-2 h-8 bg-purple-500 rounded-full mr-3"></span>
          Quick Actions
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Link
            to="/admin/products/add"
            className="block p-3 sm:p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors text-center"
          >
            <div className="text-blue-600">
              <FiPlus className="text-xl sm:text-2xl mb-2 mx-auto" />
              <p className="text-xs sm:text-sm font-medium">Add Product</p>
            </div>
          </Link>

          <Link
            to="/admin/orders?create=1"
            className="block p-3 sm:p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors text-center"
          >
            <div className="text-green-600">
              <FiFileText className="text-xl sm:text-2xl mb-2 mx-auto" />
              <p className="text-xs sm:text-sm font-medium">New Order</p>
            </div>
          </Link>

          <Link
            to="/admin/customers?create=1"
            className="block p-3 sm:p-4 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200 transition-colors text-center"
          >
            <div className="text-orange-600">
              <FiUser className="text-xl sm:text-2xl mb-2 mx-auto" />
              <p className="text-xs sm:text-sm font-medium">Add Customer</p>
            </div>
          </Link>

          <Link
            to="/admin/reports"
            className="block p-3 sm:p-4 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors text-center"
          >
            <div className="text-purple-600">
              <FiTrendingUp className="text-xl sm:text-2xl mb-2 mx-auto" />
              <p className="text-sm font-medium">View Reports</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
