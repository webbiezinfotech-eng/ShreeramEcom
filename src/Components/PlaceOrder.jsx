import React, { useState, useEffect } from "react";
import { FaCheckCircle, FaTruck, FaBox, FaCreditCard, FaMapMarkerAlt, FaPhone, FaEnvelope, FaDownload, FaPrint, FaShare, FaArrowLeft } from "react-icons/fa";
import { Link, useSearchParams } from "react-router-dom";
import { getOrderById } from "../services/api";

function PlaceOrder() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderData, setOrderData] = useState({
    orderId: "ORD-2024-001234",
    orderDate: new Date().toLocaleDateString(),
    orderTime: new Date().toLocaleTimeString(),
    status: "confirmed",
    estimatedDelivery: "3-5 business days",
    
    // Customer Information
    customer: {
      name: "",
      email: "",
      phone: "",
      company: ""
    },
    
    // Billing Address - loaded from API
    billingAddress: {
      name: "",
      company: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      phone: ""
    },
    
    // Shipping Address - loaded from API
    shippingAddress: {
      name: "",
      company: "", 
      address: "",
      city: "",
      state: "",
      pincode: "",
      phone: ""
    },
    
    // Payment Information - loaded from API
    payment: {
      method: "",
      cardNumber: "",
      amount: 0
    },
    
    // Order Items - loaded from API
    items: [],
    
    // Order Summary - calculated from API data
    summary: {
      subtotal: 0,
      shipping: 0,
      discount: 0,
      total: 0
    }
  });

  const [trackingSteps, setTrackingSteps] = useState([]);

  // Fetch order data from API
  useEffect(() => {
    async function fetchOrderData() {
      if (!orderId) {
        setError("Order ID not found");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await getOrderById(orderId);
        
        if (result.ok && result.order) {
          const order = result.order;
          const items = result.items || [];

          // Parse address
          const addressParts = (order.address || "").split(",").map(s => s.trim());
          
          // Format order data
          setOrderData({
            orderId: `ORD-${String(order.id).padStart(6, '0')}`,
            orderDate: order.order_date ? new Date(order.order_date).toLocaleDateString() : new Date().toLocaleDateString(),
            orderTime: order.created_at ? new Date(order.created_at).toLocaleTimeString() : new Date().toLocaleTimeString(),
            status: order.status || "pending",
            estimatedDelivery: order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : "3-5 business days",
            
            // Customer Information
            customer: {
              name: order.customer_name || "N/A",
              email: order.email || "N/A",
              phone: order.phone || "N/A",
              company: order.customer_firm || "N/A"
            },
            
            // Billing Address
            billingAddress: {
              name: order.customer_name || "N/A",
              company: order.customer_firm || "",
              address: addressParts[0] || "",
              city: addressParts[1] || "",
              state: addressParts[2] || "",
              pincode: addressParts[3] || "",
              phone: order.phone || "N/A"
            },
            
            // Shipping Address (same as billing for now)
            shippingAddress: {
              name: order.customer_name || "N/A",
              company: order.customer_firm || "",
              address: addressParts[0] || "",
              city: addressParts[1] || "",
              state: addressParts[2] || "",
              pincode: addressParts[3] || "",
              phone: order.phone || "N/A"
            },
            
            // Payment Information
            payment: {
              method: order.payment === "paid" ? "Paid" : order.payment === "pending" ? "Pending" : "Cash on Delivery",
              cardNumber: "**** **** **** ****",
              amount: parseFloat(order.total_amount || 0)
            },
            
            // Order Items
            items: items.map(item => ({
              id: item.id,
              name: item.product_name || "Product",
              price: parseFloat(item.price || 0),
              originalPrice: parseFloat(item.price || 0) * 1.2, // Estimate old price
              quantity: parseInt(item.quantity || 1),
              image: null, // Will use fallback UI
              category: item.category_name || "General"
            })),
            
            // Order Summary
            summary: {
              subtotal: parseFloat(order.total_amount || 0),
              shipping: 0,
              discount: 0,
              total: parseFloat(order.total_amount || 0)
            }
          });

          // Set tracking steps based on order status
          const statusMap = {
            'pending': [{ id: 1, title: "Order Placed", description: "Your order has been placed", status: "completed", date: "Today" }],
            'confirmed': [
              { id: 1, title: "Order Confirmed", description: "Your order has been confirmed", status: "completed", date: "Today" },
              { id: 2, title: "Processing", description: "Your order is being prepared", status: "current", date: "Today" }
            ],
            'processing': [
              { id: 1, title: "Order Confirmed", description: "Your order has been confirmed", status: "completed", date: "Today" },
              { id: 2, title: "Processing", description: "Your order is being prepared", status: "completed", date: "Today" },
              { id: 3, title: "Shipped", description: "Your order is being shipped", status: "current", date: "Tomorrow" }
            ],
            'shipped': [
              { id: 1, title: "Order Confirmed", description: "Your order has been confirmed", status: "completed", date: "Today" },
              { id: 2, title: "Processing", description: "Your order is being prepared", status: "completed", date: "Today" },
              { id: 3, title: "Shipped", description: "Your order has been shipped", status: "completed", date: "Today" },
              { id: 4, title: "Out for Delivery", description: "Your order is out for delivery", status: "current", date: "Tomorrow" }
            ],
            'delivered': [
              { id: 1, title: "Order Confirmed", description: "Your order has been confirmed", status: "completed", date: "Today" },
              { id: 2, title: "Processing", description: "Your order is being prepared", status: "completed", date: "Today" },
              { id: 3, title: "Shipped", description: "Your order has been shipped", status: "completed", date: "Today" },
              { id: 4, title: "Out for Delivery", description: "Your order is out for delivery", status: "completed", date: "Today" },
              { id: 5, title: "Delivered", description: "Your order has been delivered", status: "completed", date: "Today" }
            ],
            'cancelled': [
              { id: 1, title: "Order Placed", description: "Your order was placed", status: "completed", date: "Today" },
              { id: 2, title: "Cancelled", description: "Your order has been cancelled", status: "completed", date: "Today" }
            ]
          };

          setTrackingSteps(statusMap[order.status] || statusMap['pending']);
        } else {
          setError(result.error || "Order not found");
        }
      } catch (err) {
        setError("Failed to load order details");
        // Silently handle error
      } finally {
        setLoading(false);
      }
    }

    fetchOrderData();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002D7A] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Order Not Found</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link 
            to="/" 
            className="bg-[#002D7A] text-white px-6 py-3 rounded-lg hover:bg-[#001C4C] transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  const handleDownloadInvoice = () => {
    // Simulate invoice download
    // In a real app, this would generate and download a PDF invoice
  };

  const handlePrintOrder = () => {
    window.print();
  };

  const handleShareOrder = () => {
    if (navigator.share) {
      navigator.share({
        title: `Order ${orderData.orderId}`,
        text: `Check out my order from Shreeram Stationery`,
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      // Link copied - could show toast if needed
    }
  };

  if (!orderData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/profile" className="flex items-center gap-2 text-[#002D7A] hover:text-[#001C4C] transition-colors text-sm sm:text-base">
              <FaArrowLeft size={16} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Back to Profile</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#002D7A] mt-3 sm:mt-4">Order Confirmation</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Success Message */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex items-center flex-col sm:flex-row">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center mb-3 sm:mb-0 sm:mr-4">
              <FaCheckCircle className="text-green-600 text-xl sm:text-2xl" />
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-lg sm:text-xl font-semibold text-green-800">Order Placed Successfully!</h2>
              <p className="text-sm sm:text-base text-green-700 mt-1">
                Thank you for your order. We've received your order and will process it shortly.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Order Details */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Order Details</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleDownloadInvoice}
                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-[#002D7A] hover:bg-[#002D7A] hover:text-white border border-[#002D7A] rounded-lg transition-colors"
                  >
                    <FaDownload size={12} className="sm:w-3.5 sm:h-3.5" />
                    <span className="hidden sm:inline">Invoice</span>
                  </button>
                  <button
                    onClick={handlePrintOrder}
                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-600 hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors"
                  >
                    <FaPrint size={12} className="sm:w-3.5 sm:h-3.5" />
                    <span className="hidden sm:inline">Print</span>
                  </button>
                  <button
                    onClick={handleShareOrder}
                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-600 hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors"
                  >
                    <FaShare size={12} className="sm:w-3.5 sm:h-3.5" />
                    <span className="hidden sm:inline">Share</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Order Number</h3>
                  <p className="text-lg font-semibold text-[#002D7A]">{orderData.orderId}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Order Date</h3>
                  <p className="text-lg font-semibold text-gray-800">{orderData.orderDate} at {orderData.orderTime}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Order Status</h3>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <FaCheckCircle className="mr-1" size={12} />
                    {orderData.status.charAt(0).toUpperCase() + orderData.status.slice(1)}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Estimated Delivery</h3>
                  <p className="text-lg font-semibold text-gray-800">{orderData.estimatedDelivery}</p>
                </div>
              </div>

              {/* Order Items */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Items</h3>
                {orderData.items && orderData.items.length > 0 ? (
                  <div className="space-y-4">
                    {orderData.items.map((item) => (
                      <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border border-gray-200 rounded-lg">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                          <span className="text-gray-400 text-xl sm:text-2xl font-bold">{item.name?.charAt(0) || 'P'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-800 text-sm sm:text-base truncate">{item.name}</h4>
                          <p className="text-xs sm:text-sm text-gray-600">{item.category}</p>
                          <p className="text-xs sm:text-sm text-gray-600">Quantity: {item.quantity}</p>
                        </div>
                        <div className="text-left sm:text-right w-full sm:w-auto">
                          <p className="font-semibold text-[#002D7A] text-sm sm:text-base">₹{(item.price * item.quantity).toFixed(2)}</p>
                          {item.originalPrice && item.originalPrice > item.price && (
                            <>
                              <p className="text-sm text-gray-500 line-through">₹{(item.originalPrice * item.quantity).toFixed(2)}</p>
                              <p className="text-xs text-green-600">Save ₹{((item.originalPrice - item.price) * item.quantity).toFixed(2)}</p>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No items found</p>
                )}
              </div>
            </div>

            {/* Order Tracking */}
            {trackingSteps.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">Order Tracking</h2>
                <div className="space-y-4">
                  {trackingSteps.map((step) => (
                  <div key={step.id} className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      step.status === "completed" ? "bg-green-500 text-white" :
                      step.status === "current" ? "bg-[#002D7A] text-white" :
                      "bg-gray-200 text-gray-500"
                    }`}>
                      {step.status === "completed" ? (
                        <FaCheckCircle size={14} />
                      ) : (
                        <span className="text-sm font-medium">{step.id}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-medium ${
                        step.status === "completed" || step.status === "current" ? "text-gray-800" : "text-gray-500"
                      }`}>
                        {step.title}
                      </h3>
                      <p className="text-sm text-gray-600">{step.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{step.date}</p>
                    </div>
                  </div>
                  ))}
                </div>
              </div>
            )}

            {/* Customer Support */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Need Help?</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#002D7A] rounded-full flex items-center justify-center">
                    <FaPhone className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">Call Us</h3>
                    <p className="text-sm text-gray-600">+91 7304044465</p>
                    <p className="text-xs text-gray-500">Mon-Fri 9AM-6PM</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#002D7A] rounded-full flex items-center justify-center">
                    <FaEnvelope className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">Email Us</h3>
                    <p className="text-sm text-gray-600">support@shreeramstationery.com</p>
                    <p className="text-xs text-gray-500">24/7 Support</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Customer Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Customer Information</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Name</h3>
                  <p className="text-gray-800">{orderData.customer.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Email</h3>
                  <p className="text-gray-800">{orderData.customer.email}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Phone</h3>
                  <p className="text-gray-800">{orderData.customer.phone}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Company</h3>
                  <p className="text-gray-800">{orderData.customer.company}</p>
                </div>
              </div>
            </div>

            {/* Billing Address */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
                <FaMapMarkerAlt className="text-[#002D7A] w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Billing Address
              </h2>
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-800">{orderData.billingAddress.name}</p>
                <p>{orderData.billingAddress.company}</p>
                <p>{orderData.billingAddress.address}</p>
                <p>{orderData.billingAddress.city}, {orderData.billingAddress.state} {orderData.billingAddress.pincode}</p>
                <p>{orderData.billingAddress.phone}</p>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
                <FaTruck className="text-[#002D7A] w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Shipping Address
              </h2>
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-800">{orderData.shippingAddress.name}</p>
                <p>{orderData.shippingAddress.company}</p>
                <p>{orderData.shippingAddress.address}</p>
                <p>{orderData.shippingAddress.city}, {orderData.shippingAddress.state} {orderData.shippingAddress.pincode}</p>
                <p>{orderData.shippingAddress.phone}</p>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
                <FaCreditCard className="text-[#002D7A] w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Payment Information
              </h2>
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Payment Method</h3>
                  <p className="text-gray-800">{orderData.payment.method}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Card Number</h3>
                  <p className="text-gray-800">{orderData.payment.cardNumber}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Amount Paid</h3>
                  <p className="text-lg font-semibold text-[#002D7A]">₹{orderData.payment.amount.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Order Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">₹{orderData.summary.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium text-green-600">FREE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount</span>
                  <span className="font-medium text-green-600">-₹{orderData.summary.discount.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-[#002D7A]">₹{orderData.summary.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Link
                to="/"
                className="w-full bg-[#002D7A] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#001C4C] transition-colors text-center block"
              >
                Continue Shopping
              </Link>
              <Link
                to="/profile"
                className="w-full border border-[#002D7A] text-[#002D7A] py-3 px-4 rounded-lg font-medium hover:bg-[#002D7A] hover:text-white transition-colors text-center block"
              >
                View Order History
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlaceOrder;
