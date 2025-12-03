import React, { useState, useEffect } from "react";
import { FaArrowLeft, FaCheckCircle, FaShoppingBag } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { createOrder, getLoggedInCustomerId } from "../services/api";

function Checkout() {
  const navigate = useNavigate();
  const { cartItems, loading: cartLoading, clearCartItems } = useCart();
  const [loading, setLoading] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  // ✅ Redirect to cart if empty
  useEffect(() => {
    if (!cartLoading && cartItems.length === 0) {
      navigate('/cart');
    }
  }, [cartItems.length, cartLoading, navigate]);

  const handlePlaceOrder = async () => {
    setOrderError("");
    
    // Enforce ₹5,000 minimum order
    if (getSubtotal() < 5000) {
      setOrderError("Minimum order amount is ₹5,000. Please add more items to proceed.");
      return;
    }
    
      setLoading(true);
      try {
        const customerId = getLoggedInCustomerId();
        if (!customerId) {
          setOrderError("Please login to place an order.");
          setLoading(false);
          return;
        }

      // Prepare order data - minimal data, admin will contact customer
      const today = new Date();
      const deliveryDate = new Date();
      deliveryDate.setDate(today.getDate() + 3); // 3 days from today
      
        const orderData = {
          customer_id: parseInt(customerId),
        total_amount: getSubtotal(),
          currency: "INR",
        payment: "pending",
          status: "pending",
        // Address will be fetched from customer profile automatically
        order_date: today.toISOString().split('T')[0], // Current date
        delivery_date: deliveryDate.toISOString().split('T')[0], // 3 days from today
        items: cartItems.map(item => {
          // Get product_id - it should be in item.product_id from cart
          const productId = item.product_id;
          if (!productId) {
            // Skip items without product_id
          }
          return {
            product_id: productId,
            category_id: null, // Will be fetched from product if needed
            quantity: parseInt(item.quantity || 1),
            price: parseFloat(item.price || 0)
          };
        }).filter(item => item.product_id) // Filter out items without product_id
        };

        const result = await createOrder(orderData);
        
        if (result.ok) {
        // Clear cart after successful order
        await clearCartItems();
        
        // Show success popup
        setShowSuccessPopup(true);
        // After 2 seconds, redirect to home page
        setTimeout(() => {
          navigate('/');
        }, 2000);
        } else {
          setOrderError(result.error || "Failed to place order. Please try again.");
        }
      } catch (error) {
        setOrderError("An error occurred. Please try again.");
        // Silently handle error
      } finally {
        setLoading(false);
    }
  };

  const getSubtotal = () => {
    return cartItems.reduce((total, item) => total + ((item.price || 0) * (item.quantity || 1)), 0);
  };

  if (cartLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002D7A] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaCheckCircle className="text-green-600 text-4xl" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Your order has been placed!</h2>
              <p className="text-gray-600 mb-6">Thank you for your order. We'll contact you shortly.</p>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002D7A] mx-auto"></div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/cart" className="flex items-center gap-2 text-[#002D7A] hover:text-[#001C4C] transition-colors text-sm sm:text-base">
              <FaArrowLeft size={16} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Back to Cart</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#002D7A] mt-3 sm:mt-4">Checkout</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Order Summary */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 sm:mb-6">Order Summary</h2>
              
              {/* Items */}
              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                {cartItems.map((item) => (
                  <div key={item.id || item.product_id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border border-gray-100 rounded-lg">
                    <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                      {item.image && item.image.trim() !== '' ? (
                        <img 
                          src={item.image} 
                          alt={item.name || 'Product'} 
                          className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded bg-gray-200 flex-shrink-0"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const fallback = e.target.nextElementSibling;
                            if (fallback) fallback.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`${item.image && item.image.trim() !== '' ? 'hidden' : ''} w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded flex items-center justify-center flex-shrink-0`}>
                        <span className="text-gray-400 text-lg sm:text-xl font-bold">{(item.name || 'Product').charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base font-medium text-gray-800 truncate">{item.name}</h3>
                        <p className="text-xs sm:text-sm text-gray-600">Quantity: {item.quantity || 1}</p>
                        <p className="text-xs sm:text-sm text-gray-600">Price: ₹{parseFloat(item.price || 0).toFixed(2)}</p>
                      </div>
                    </div>
                    <span className="text-base sm:text-lg font-semibold text-[#002D7A] w-full sm:w-auto text-right sm:text-left">
                      ₹{((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                    </span>
                  </div>
                ))}
                    </div>
                    
              {/* Totals */}
              <div className="space-y-3 border-t border-gray-200 pt-4">
                <div className="flex justify-between text-lg">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold text-gray-800">₹{getSubtotal().toFixed(2)}</span>
                    </div>
                <div className="flex justify-between text-xl font-bold border-t border-gray-200 pt-3">
                  <span className="text-gray-800">Total</span>
                  <span className="text-[#002D7A]">₹{getSubtotal().toFixed(2)}</span>
                        </div>
                      </div>

              {/* Error Message */}
              {orderError && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {orderError}
                </div>
              )}

              {/* Place Order Button */}
                  <button
                onClick={handlePlaceOrder}
                disabled={loading || cartItems.length === 0}
                className="w-full mt-6 bg-[#002D7A] text-white py-4 px-4 rounded-xl font-semibold hover:bg-[#001C4C] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Placing Order...
                  </>
                ) : (
                  <>
                    <FaShoppingBag size={18} />
                    Place Order
                  </>
                )}
                  </button>

              {/* Info Message */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> After placing your order, our team will contact you to confirm the details and delivery address.
                </p>
                </div>
              </div>
          </div>

          {/* Sidebar Info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 sticky top-4 sm:top-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Order Information</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Items</p>
                  <p className="text-lg font-semibold text-[#002D7A]">{cartItems.length}</p>
                    </div>
                
                <div>
                  <p className="text-sm text-gray-600 mb-1">Order Total</p>
                  <p className="text-2xl font-bold text-[#002D7A]">₹{getSubtotal().toFixed(2)}</p>
              </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <FaCheckCircle className="text-green-600 mt-0.5" size={16} />
                    <span>Secure checkout</span>
                </div>
                  <div className="flex items-start gap-2 text-sm text-gray-600 mt-2">
                    <FaCheckCircle className="text-green-600 mt-0.5" size={16} />
                    <span>Admin will contact you</span>
                </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Checkout;
