import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminsAPI } from "../services/api";
import Alert from "../components/Alert";
import { getLoggedInAdmin } from "../components/header/UserDropdown";

const AdminSettings: React.FC = () => {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

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

  useEffect(() => {
    const adminData = getLoggedInAdmin();
    if (!adminData) {
      navigate("/admin/signin");
      return;
    }
    setAdmin(adminData);
    setForm({
      name: adminData.name || "",
      email: adminData.email || "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  }, [navigate]);

  const showAlert = (type: 'success' | 'error' | 'warning' | 'info', message: string): void => {
    setAlert({ type, message, isVisible: true });
  };

  const hideAlert = () => {
    setAlert(prev => ({ ...prev, isVisible: false }));
  };

  const handleUpdateProfile = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      showAlert('error', 'Name and Email are required!');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      showAlert('error', 'Please enter a valid email address!');
      return;
    }

    setLoading(true);
    try {
      const updateData: any = {
        name: form.name.trim(),
        email: form.email.trim(),
      };

      await adminsAPI.update(admin.id, updateData);
      
      // Update localStorage
      const updatedAdmin = { ...admin, ...updateData };
      localStorage.setItem('admin', JSON.stringify(updatedAdmin));
      setAdmin(updatedAdmin);
      
      showAlert('success', '✅ Profile updated successfully!');
    } catch (error: any) {
      showAlert('error', error?.message || '❌ Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!form.currentPassword.trim()) {
      showAlert('error', 'Current password is required!');
      return;
    }

    if (!form.newPassword.trim() || form.newPassword.length < 6) {
      showAlert('error', 'New password must be at least 6 characters!');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      showAlert('error', 'New password and confirm password do not match!');
      return;
    }

    setLoading(true);
    try {
      // First verify current password by trying to login
      try {
        await adminsAPI.login(admin.email, form.currentPassword);
      } catch (e) {
        showAlert('error', 'Current password is incorrect!');
        setLoading(false);
        return;
      }

      // Update password
      await adminsAPI.update(admin.id, { password: form.newPassword });
      
      // Clear password fields
      setForm({
        ...form,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      
      showAlert('success', '✅ Password changed successfully!');
    } catch (error: any) {
      showAlert('error', error?.message || '❌ Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  if (!admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

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
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Admin Settings</h1>
        <p className="text-gray-600">Manage your admin profile and password</p>
      </div>

      <div className="space-y-6">
        {/* Profile Information Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Profile Information</h2>
          
          <div className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>

            <div className="pt-4">
              <button
                onClick={handleUpdateProfile}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {loading ? "Updating..." : "Update Profile"}
              </button>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Change Password</h2>
          
          <div className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password *
              </label>
              <input
                type="password"
                value={form.currentPassword}
                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter current password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password *
              </label>
              <input
                type="password"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter new password (min 6 characters)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password *
              </label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Confirm new password"
              />
            </div>

            <div className="pt-4">
              <button
                onClick={handleChangePassword}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {loading ? "Changing Password..." : "Change Password"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;

