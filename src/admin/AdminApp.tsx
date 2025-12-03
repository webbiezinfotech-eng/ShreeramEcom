import { Routes, Route, Navigate } from "react-router-dom";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/dashboards";
import AddProduct from "./pages/Product/AddProduct";
import ProductList from "./pages/Product/ProductList";
import Orders from "./pages/order";
import CustomerOrders from "./pages/CustomerOrders";
import Customers from "./pages/customer";
import Categories from "./pages/categories";
import AdminSettings from "./pages/AdminSettings";

export default function AdminApp() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Protected Dashboard Routes */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<ProductList />} />
          <Route path="products/add" element={<AddProduct />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/customer/:customerId" element={<CustomerOrders />} />
          <Route path="customers" element={<Customers />} />
          <Route path="categories" element={<Categories />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="inventory" element={<ProductList />} />
          <Route path="suppliers" element={<Customers />} />
          <Route path="reports" element={<Dashboard />} />
        </Route>

        {/* Auth Routes - Public */}
        <Route path="signin" element={<SignIn />} />
        <Route path="signup" element={<SignUp />} />
        
        {/* Redirect /admin to signin (default) */}
        <Route path="/" element={<Navigate to="/admin/signin" replace />} />
      </Routes>
    </>
  );
}
