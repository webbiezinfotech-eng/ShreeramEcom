import React, { useState, useEffect } from "react";
import { FaUser, FaEnvelope, FaPhone, FaBuilding, FaMapMarkerAlt, FaEdit, FaSave, FaTimes, FaLock, FaBell, FaCreditCard, FaHistory, FaHeart, FaSignOutAlt, FaShoppingCart, FaTrash } from "react-icons/fa";
import { getLoggedInCustomer, getLoggedInCustomerId, updateCustomer, getCustomerOrders, logoutCustomer, loginCustomer } from "../services/api";
import { useNavigate } from "react-router-dom";
import { useWishlist } from "../contexts/WishlistContext";
import { useCart } from "../contexts/CartContext";
import Toast from "./Toast";

function Profile() {
  const navigate = useNavigate();
  const { wishlistItems, removeItem: removeFromWishlist, loading: wishlistLoading } = useWishlist();
  const { addItemToCart } = useCart();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ isOpen: false, message: "", type: "success" });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Listen for switch to wishlist tab event
  useEffect(() => {
    const handleSwitchToWishlist = () => {
      setActiveTab("wishlist");
    };
    window.addEventListener('switchToWishlistTab', handleSwitchToWishlist);
    return () => {
      window.removeEventListener('switchToWishlistTab', handleSwitchToWishlist);
    };
  }, []);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [originalFormData, setOriginalFormData] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Load customer data on mount
  useEffect(() => {
    async function loadCustomerData() {
      const customerId = getLoggedInCustomerId();
      if (!customerId) {
        navigate("/login");
        return;
      }

      setLoading(true);
      try {
        const customer = getLoggedInCustomer();
        if (customer) {
          // Parse name into first and last name
          const nameParts = (customer.name || "").split(" ");
          const firstName = nameParts[0] || "";
          const lastName = nameParts.slice(1).join(" ") || "";
          
          // Parse address if it exists
          const addressParts = (customer.address || "").split(",").map(s => s.trim());
          
          setFormData({
            firstName: firstName,
            lastName: lastName,
            email: customer.email || "",
            phone: customer.phone || "",
            company: customer.firm || "",
            address: addressParts[0] || "",
            city: addressParts[1] || "",
            state: addressParts[2] || "",
            pincode: addressParts[3] || "",
          });
          setOriginalFormData({
            firstName: firstName,
            lastName: lastName,
            email: customer.email || "",
            phone: customer.phone || "",
            company: customer.firm || "",
            address: addressParts[0] || "",
            city: addressParts[1] || "",
            state: addressParts[2] || "",
            pincode: addressParts[3] || "",
          });
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    }
    
    loadCustomerData();
  }, [navigate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const customerId = getLoggedInCustomerId();
      if (!customerId) {
        setToast({ isOpen: true, message: "Please login first", type: "error" });
        return;
      }

      const fullAddress = `${formData.address}, ${formData.city}, ${formData.state} ${formData.pincode}`;
      
      const result = await updateCustomer(customerId, {
        name: `${formData.firstName} ${formData.lastName}`,
        firm: formData.company,
        email: formData.email,
        phone: formData.phone,
        address: fullAddress,
        status: 'true'
      });

      if (result.ok) {
        // Update localStorage
        const updatedCustomer = {
          ...getLoggedInCustomer(),
          name: `${formData.firstName} ${formData.lastName}`,
          firm: formData.company,
          email: formData.email,
          phone: formData.phone,
          address: fullAddress
        };
        localStorage.setItem('customer', JSON.stringify(updatedCustomer));
        setOriginalFormData({ ...formData });
        setIsEditing(false);
        setToast({ isOpen: true, message: "Profile updated successfully!", type: "success" });
      } else {
        setToast({ isOpen: true, message: "Failed to update profile: " + result.error, type: "error" });
      }
    } catch (error) {
      setToast({ isOpen: true, message: "An error occurred. Please try again.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (originalFormData) {
      setFormData({ ...originalFormData });
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logoutCustomer();
    setShowLogoutConfirm(false);
    navigate("/");
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: FaUser },
    { id: "orders", label: "Orders", icon: FaHistory },
    { id: "wishlist", label: "Wishlist", icon: FaHeart },
    { id: "settings", label: "Settings", icon: FaBell },
  ];

  const [recentOrders, setRecentOrders] = useState([]);

  // Load orders when orders tab is active
  useEffect(() => {
    async function loadOrders() {
      if (activeTab === "orders") {
        const customerId = getLoggedInCustomerId();
        if (customerId) {
          try {
            const result = await getCustomerOrders(customerId);
            if (result.ok && Array.isArray(result.items)) {
              setRecentOrders(result.items.map(order => ({
                id: `ORD${order.id}`,
                orderId: order.id,
                date: order.order_date || order.created_at,
                total: `₹${parseFloat(order.total_amount || 0).toFixed(2)}`,
                status: order.status || "Pending"
              })));
            }
          } catch (error) {
          }
        }
      }
    }
    loadOrders();
  }, [activeTab]);

  // Handle add to cart from wishlist
  const handleAddToCartFromWishlist = async (productId) => {
    const result = await addItemToCart(productId, 1);
    if (result.success) {
      setToast({ isOpen: true, message: "Product added to cart!", type: "success" });
    } else {
      setToast({ isOpen: true, message: "Failed to add to cart: " + result.error, type: "error" });
    }
  };

  // Handle remove from wishlist
  const handleRemoveFromWishlist = async (wishlistId, productId) => {
    const result = await removeFromWishlist(wishlistId, productId);
    if (result.success) {
      setToast({ isOpen: true, message: "Removed from wishlist", type: "success" });
    } else {
      setToast({ isOpen: true, message: "Failed to remove: " + result.error, type: "error" });
    }
  };

  // Handle password update
  const handlePasswordUpdate = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordData;
    
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setToast({ isOpen: true, message: "All password fields are required", type: "error" });
      return;
    }
    
    if (newPassword.length < 6) {
      setToast({ isOpen: true, message: "New password must be at least 6 characters", type: "error" });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setToast({ isOpen: true, message: "New password and confirm password do not match", type: "error" });
      return;
    }
    
    setUpdatingPassword(true);
    
    try {
      const customerId = getLoggedInCustomerId();
      if (!customerId) {
        setToast({ isOpen: true, message: "Please login first", type: "error" });
        setUpdatingPassword(false);
        return;
      }
      
      // First verify current password
      const customer = getLoggedInCustomer();
      if (!customer || !customer.email) {
        setToast({ isOpen: true, message: "Customer information not found", type: "error" });
        setUpdatingPassword(false);
        return;
      }
      
      // Verify current password by attempting login
      const loginResult = await loginCustomer(customer.email, currentPassword);
      
      if (!loginResult.ok) {
        setToast({ isOpen: true, message: "Current password is incorrect", type: "error" });
        setUpdatingPassword(false);
        return;
      }
      
      // If current password is correct, update to new password
      const result = await updateCustomer(customerId, { password: newPassword });
      
      if (result.ok) {
        setToast({ isOpen: true, message: "Password updated successfully!", type: "success" });
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
      } else {
        setToast({ isOpen: true, message: result.error || "Failed to update password", type: "error" });
      }
    } catch (error) {
      setToast({ isOpen: true, message: "An error occurred: " + error.message, type: "error" });
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002D7A] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#002D7A]">My Account</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Manage your account settings and preferences</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
          {/* Sidebar */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <div className="text-center mb-4 sm:mb-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#002D7A] rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <FaUser className="text-white text-xl sm:text-2xl" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-800">{formData.firstName} {formData.lastName}</h3>
                <p className="text-xs sm:text-sm text-gray-600">{formData.company}</p>
              </div>

              <nav className="space-y-1 sm:space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-left transition-colors text-sm sm:text-base ${
                        activeTab === tab.id
                          ? "bg-[#002D7A] text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <Icon size={16} className="sm:w-[18px] sm:h-[18px]" />
                      {tab.label}
                    </button>
                  );
                })}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors text-red-600 hover:bg-red-50"
                >
                  <FaSignOutAlt size={18} />
                  Logout
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:w-3/4">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-[#002D7A]">Profile Information</h2>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 bg-[#002D7A] text-white px-4 py-2 rounded-lg hover:bg-[#001C4C] transition-colors"
                    >
                      <FaEdit size={16} />
                      Edit Profile
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FaSave size={16} />
                        {saving ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={handleCancel}
                        className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        <FaTimes size={16} />
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                      Personal Information
                    </h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A] ${
                          isEditing ? "border-gray-300" : "border-gray-200 bg-gray-50"
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A] ${
                          isEditing ? "border-gray-300" : "border-gray-200 bg-gray-50"
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <div className="relative">
                        <FaEnvelope className="absolute left-3 top-3 text-gray-400" size={16} />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          disabled={!isEditing}
                          className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A] ${
                            isEditing ? "border-gray-300" : "border-gray-200 bg-gray-50"
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <div className="relative">
                        <FaPhone className="absolute left-3 top-3 text-gray-400" size={16} />
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          disabled={!isEditing}
                          className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A] ${
                            isEditing ? "border-gray-300" : "border-gray-200 bg-gray-50"
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Business Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                      Business Information
                    </h3>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                      <div className="relative">
                        <FaBuilding className="absolute left-3 top-3 text-gray-400" size={16} />
                        <input
                          type="text"
                          name="company"
                          value={formData.company}
                          onChange={handleChange}
                          disabled={!isEditing}
                          className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A] ${
                            isEditing ? "border-gray-300" : "border-gray-200 bg-gray-50"
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                      <div className="relative">
                        <FaMapMarkerAlt className="absolute left-3 top-3 text-gray-400" size={16} />
                        <textarea
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          disabled={!isEditing}
                          rows={3}
                          className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A] ${
                            isEditing ? "border-gray-300" : "border-gray-200 bg-gray-50"
                          }`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          disabled={!isEditing}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A] ${
                            isEditing ? "border-gray-300" : "border-gray-200 bg-gray-50"
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Pincode</label>
                        <input
                          type="text"
                          name="pincode"
                          value={formData.pincode}
                          onChange={handleChange}
                          disabled={!isEditing}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A] ${
                            isEditing ? "border-gray-300" : "border-gray-200 bg-gray-50"
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === "orders" && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-[#002D7A] mb-6">Order History</h2>
                {recentOrders.length > 0 ? (
                  <div className="space-y-4">
                    {recentOrders.map((order) => (
                      <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-gray-800">Order #{order.id}</h3>
                            <p className="text-gray-600">Date: {new Date(order.date).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-[#002D7A]">{order.total}</p>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                              order.status === "delivered" ? "bg-green-100 text-green-800" :
                              order.status === "shipped" ? "bg-blue-100 text-blue-800" :
                              order.status === "processing" || order.status === "confirmed" ? "bg-yellow-100 text-yellow-800" :
                              "bg-gray-100 text-gray-800"
                            }`}>
                              {order.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FaHistory className="text-gray-400 text-4xl mx-auto mb-4" />
                    <p className="text-gray-600">No orders found</p>
                  </div>
                )}
              </div>
            )}

            {/* Wishlist Tab */}
            {activeTab === "wishlist" && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-[#002D7A] mb-6">Wishlist</h2>
                {wishlistLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002D7A] mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading wishlist...</p>
                  </div>
                ) : wishlistItems.length === 0 ? (
                  <div className="text-center py-12">
                    <FaHeart className="mx-auto text-gray-300 mb-4" size={48} />
                    <p className="text-gray-600 text-lg">Your wishlist is empty</p>
                    <p className="text-gray-500 text-sm mt-2">Start adding products to your wishlist!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {wishlistItems.map((item) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow relative">
                        <button
                          onClick={() => handleRemoveFromWishlist(item.id, item.product_id)}
                          className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-red-50 text-red-500 transition-colors z-10"
                          title="Remove from wishlist"
                        >
                          <FaTrash size={14} />
                        </button>
                        {item.image && item.image.trim() !== '' ? (
                          <img src={item.image} alt={item.product_name || 'Product'} className="w-full h-32 object-cover rounded-lg mb-3" onError={(e) => {
                            e.target.style.display = 'none';
                            const fallback = e.target.nextElementSibling;
                            if (fallback) fallback.classList.remove('hidden');
                          }} />
                        ) : null}
                        <div className={`${item.image && item.image.trim() !== '' ? 'hidden' : ''} w-full h-32 bg-gray-200 rounded-lg mb-3 flex items-center justify-center`}>
                          <span className="text-gray-400 text-2xl font-bold">{(item.product_name || 'P').charAt(0).toUpperCase()}</span>
                        </div>
                        <h3 className="font-semibold text-gray-800 mb-2">{item.product_name}</h3>
                        <p className="text-[#002D7A] font-bold mb-3">₹{parseFloat(item.price || 0).toFixed(2)}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAddToCartFromWishlist(item.product_id)}
                            className="flex-1 bg-[#FE7F06] text-white py-2 rounded-lg hover:bg-[#eb7200] transition-colors flex items-center justify-center gap-2 text-sm"
                          >
                            <FaShoppingCart size={14} />
                            Add to Cart
                          </button>
                          <button
                            onClick={() => {
                              handleAddToCartFromWishlist(item.product_id);
                              navigate('/checkout');
                            }}
                            className="flex-1 bg-[#002D7A] text-white py-2 rounded-lg hover:bg-[#001C4C] transition-colors text-sm"
                          >
                            Order Now
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === "settings" && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-[#002D7A] mb-6">Account Settings</h2>
                <div className="space-y-6">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <FaLock size={18} />
                      Change Password
                    </h3>
                    <div className="space-y-3">
                      <input
                        type="password"
                        placeholder="Current Password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A]"
                        disabled={updatingPassword}
                      />
                      <input
                        type="password"
                        placeholder="New Password (min 6 characters)"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A]"
                        disabled={updatingPassword}
                      />
                      <input
                        type="password"
                        placeholder="Confirm New Password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A]"
                        disabled={updatingPassword}
                      />
                      <button
                        onClick={handlePasswordUpdate}
                        disabled={updatingPassword}
                        className="bg-[#002D7A] text-white px-4 py-2 rounded-lg hover:bg-[#001C4C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {updatingPassword ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Updating...
                          </>
                        ) : (
                          "Update Password"
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <FaBell size={18} />
                      Notification Preferences
                    </h3>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3">
                        <input type="checkbox" className="rounded" defaultChecked />
                        <span>Email notifications for new orders</span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input type="checkbox" className="rounded" defaultChecked />
                        <span>SMS notifications for order updates</span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input type="checkbox" className="rounded" />
                        <span>Marketing emails and promotions</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2 text-center">Confirm Logout</h3>
            <p className="text-sm text-gray-600 mb-6 text-center">
              Are you sure you want to logout?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <Toast
        isOpen={toast.isOpen}
        onClose={() => setToast({ ...toast, isOpen: false })}
        message={toast.message}
        type={toast.type}
      />
    </div>
  );
}

export default Profile;
