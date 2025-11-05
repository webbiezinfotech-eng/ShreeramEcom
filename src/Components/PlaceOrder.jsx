import React, { useState, useEffect } from "react";
import { FaCheckCircle, FaTruck, FaBox, FaCreditCard, FaMapMarkerAlt, FaPhone, FaEnvelope, FaDownload, FaPrint, FaShare, FaArrowLeft } from "react-icons/fa";
import { Link } from "react-router-dom";

function PlaceOrder() {
  const [orderData, setOrderData] = useState({
    orderId: "ORD-2024-001234",
    orderDate: new Date().toLocaleDateString(),
    orderTime: new Date().toLocaleTimeString(),
    status: "confirmed",
    estimatedDelivery: "3-5 business days",
    
    // Customer Information
    customer: {
      name: "John Doe",
      email: "john.doe@company.com",
      phone: "+91 9876543210",
      company: "ABC Corporation"
    },
    
    // Billing Address
    billingAddress: {
      name: "John Doe",
      company: "ABC Corporation",
      address: "123 Business Street, Sector 15",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      phone: "+91 9876543210"
    },
    
    // Shipping Address
    shippingAddress: {
      name: "John Doe",
      company: "ABC Corporation", 
      address: "123 Business Street, Sector 15",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      phone: "+91 9876543210"
    },
    
    // Payment Information
    payment: {
      method: "Credit Card",
      cardNumber: "**** **** **** 1234",
      amount: 128.97
    },
    
    // Order Items
    items: [
      {
        id: 1,
        name: "Premium Ballpoint Pens (Pack of 50)",
        price: 24.99,
        originalPrice: 34.99,
        quantity: 2,
        image: "https://via.placeholder.com/80x80/002D7A/ffffff?text=Pen",
        category: "Writing Instruments"
      },
      {
        id: 2,
        name: "A4 Copy Paper (5000 sheets)",
        price: 45.99,
        originalPrice: 55.99,
        quantity: 1,
        image: "https://via.placeholder.com/80x80/002D7A/ffffff?text=Paper",
        category: "Paper Products"
      },
      {
        id: 3,
        name: "Office Desk Organizer Set",
        price: 32.99,
        originalPrice: 42.99,
        quantity: 1,
        image: "https://via.placeholder.com/80x80/002D7A/ffffff?text=Organizer",
        category: "Office Supplies"
      }
    ],
    
    // Order Summary
    summary: {
      subtotal: 128.97,
      shipping: 0,
      discount: 20.00,
      total: 128.97
    }
  });

  const [trackingSteps, setTrackingSteps] = useState([
    { id: 1, title: "Order Confirmed", description: "Your order has been confirmed", status: "completed", date: "Today, 2:30 PM" },
    { id: 2, title: "Processing", description: "Your order is being prepared", status: "completed", date: "Today, 3:15 PM" },
    { id: 3, title: "Shipped", description: "Your order has been shipped", status: "current", date: "Tomorrow, 10:00 AM" },
    { id: 4, title: "Out for Delivery", description: "Your order is out for delivery", status: "pending", date: "Day after tomorrow" },
    { id: 5, title: "Delivered", description: "Your order has been delivered", status: "pending", date: "Day after tomorrow" }
  ]);

  const handleDownloadInvoice = () => {
    // Simulate invoice download
    console.log("Downloading invoice for order:", orderData.orderId);
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
      alert("Order link copied to clipboard!");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center gap-4">
            <Link to="/checkout" className="flex items-center gap-2 text-[#002D7A] hover:text-[#001C4C] transition-colors">
              <FaArrowLeft size={20} />
              Back to Checkout
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-[#002D7A] mt-4">Order Confirmation</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Success Message */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
              <FaCheckCircle className="text-green-600 text-2xl" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-green-800">Order Placed Successfully!</h2>
              <p className="text-green-700 mt-1">
                Thank you for your order. We've received your order and will process it shortly.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Order Details */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Order Details</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadInvoice}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-[#002D7A] hover:bg-[#002D7A] hover:text-white border border-[#002D7A] rounded-lg transition-colors"
                  >
                    <FaDownload size={14} />
                    Invoice
                  </button>
                  <button
                    onClick={handlePrintOrder}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors"
                  >
                    <FaPrint size={14} />
                    Print
                  </button>
                  <button
                    onClick={handleShareOrder}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors"
                  >
                    <FaShare size={14} />
                    Share
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
                <div className="space-y-4">
                  {orderData.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                      <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800">{item.name}</h4>
                        <p className="text-sm text-gray-600">{item.category}</p>
                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-[#002D7A]">₹{(item.price * item.quantity).toFixed(2)}</p>
                        <p className="text-sm text-gray-500 line-through">₹{(item.originalPrice * item.quantity).toFixed(2)}</p>
                        <p className="text-xs text-green-600">Save ₹{((item.originalPrice - item.price) * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Tracking */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Order Tracking</h2>
              <div className="space-y-4">
                {trackingSteps.map((step, index) => (
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Customer Information</h2>
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FaMapMarkerAlt className="text-[#002D7A]" size={16} />
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FaTruck className="text-[#002D7A]" size={16} />
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FaCreditCard className="text-[#002D7A]" size={16} />
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Order Summary</h2>
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
