import React, { useState, useEffect } from "react";
import { FaPlus, FaMinus, FaTrash, FaShoppingBag, FaArrowLeft } from "react-icons/fa";
import { Link } from "react-router-dom";
import { useCart } from "../contexts/CartContext";

function Cart() {
  const { 
    cartItems, 
    loading, 
    updateItemQuantity, 
    removeItemFromCart, 
    getCartTotal,
    loadCartItems 
  } = useCart();

  // Load cart items when component mounts
  useEffect(() => {
    loadCartItems();
  }, [loadCartItems]);

  const updateQuantity = async (id, change) => {
    try {
      const item = cartItems.find(item => (item.id === id || item.cart_id === id));
      if (!item) {
        // Item not found
        return;
      }
      
      const currentQuantity = parseInt(item.quantity || 1);
      const newQuantity = Math.max(1, currentQuantity + change);
      
      if (newQuantity !== currentQuantity) {
        // API expects the cart item ID (from cart table), which is stored as 'id' in our item
        // The cart item ID is the primary key from the cart table
        // Use the cart item ID (from cart table)
        const itemId = item.id ? parseInt(item.id) : null;
        if (!itemId || isNaN(itemId)) {
          // Item ID not found
          return;
        }
        
        const result = await updateItemQuantity(itemId, newQuantity);
        if (result && result.success) {
          // Cart will reload automatically via context
        } else {
          // Failed to update quantity
          // Still try to reload in case of partial success
          await loadCartItems();
        }
      }
    } catch (error) {
      // Error updating quantity
    }
  };

  const removeItem = async (id) => {
    await removeItemFromCart(id);
  };

  const getSubtotal = () => {
    return cartItems.reduce((total, item) => {
      const price = parseFloat(item.price || 0);
      const quantity = parseInt(item.quantity || 1);
      return total + (price * quantity);
    }, 0);
  };

  const getTotal = () => {
    return getSubtotal();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002D7A] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading cart...</p>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 text-[#002D7A] hover:text-[#001C4C] transition-colors">
                <FaArrowLeft size={20} />
                Continue Shopping
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-[#002D7A] mt-4">Shopping Cart</h1>
          </div>
        </div>

        {/* Empty Cart */}
        <div className="max-w-7xl mx-auto px-2 py-16">
          <div className="text-center">
            <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaShoppingBag className="text-gray-400 text-4xl" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Your cart is empty</h2>
            <p className="text-gray-600 mb-8">Looks like you haven't added any items to your cart yet.</p>
            <Link 
              to="/products" 
              className="inline-flex items-center gap-2 bg-[#002D7A] text-white px-6 py-3 rounded-lg hover:bg-[#001C4C] transition-colors"
            >
              <FaShoppingBag size={18} />
              Start Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white">
        <div className="md:mx-12 mx-auto px-2 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/" className="flex items-center justify-center w-10 h-10 text-[#002D7A] hover:text-[#001C4C] hover:bg-gray-100 rounded-full transition-colors">
              <FaArrowLeft size={18} />
            </Link>
            <h1 className="text-4xl font-bold text-[#002D7A]">Shopping Cart</h1>
          </div>
          <p className="text-[#002D7A] text-lg">{cartItems.length} item(s) in your cart</p>
        </div>
      </div>

      <div className="md:mx-12 mx-auto px-2 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Cart Items */}
          <div className="lg:w-2/3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Cart Items</h2>
              
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex flex-col sm:flex-row gap-4 p-5 border border-gray-100 rounded-xl hover:shadow-sm transition-all duration-200 bg-gray-50/50">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      {item.image || item.image_url ? (
                        <img 
                          src={item.image || item.image_url}
                          alt={item.name || 'Product'}
                          className="w-20 h-20 object-cover rounded-lg"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const fallback = e.target.nextElementSibling;
                            if (fallback) fallback.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`${item.image || item.image_url ? 'hidden' : ''} w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center`}>
                        <span className="text-gray-400 text-xl font-bold">{(item.name || 'Product').charAt(0)}</span>
                      </div>
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <span className="text-xs text-[#002D7A] font-medium uppercase tracking-wide">
                            {item.category_name || 'General'}
                          </span>
                          <h3 className="text-base font-semibold text-gray-800 mt-1 mb-2">
                            {item.name}
                          </h3>
                          
                          {/* Price */}
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-lg font-bold text-[#002D7A]">
                              ₹{parseFloat(item.price || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => removeItem(item.cart_id || item.id)}
                          className="text-red-500 hover:text-red-700 transition-colors p-2"
                          title="Remove item"
                        >
                          <FaTrash size={16} />
                        </button>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-600">Quantity:</span>
                        <div className="flex items-center border border-gray-200 rounded-lg bg-white">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              updateQuantity(item.cart_id || item.id, -1);
                            }}
                            className="p-2 hover:bg-gray-50 transition-colors rounded-l-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={parseInt(item.quantity || 1) <= 1}
                            type="button"
                          >
                            <FaMinus className="text-gray-500" size={10} />
                          </button>
                          <span className="px-3 py-2 text-gray-800 font-medium min-w-[2.5rem] text-center text-sm">
                            {item.quantity}
                          </span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              updateQuantity(item.cart_id || item.id, 1);
                            }}
                            className="p-2 hover:bg-gray-50 transition-colors rounded-r-lg"
                            type="button"
                          >
                            <FaPlus className="text-gray-500" size={10} />
                          </button>
                        </div>
                        <span className="text-sm font-semibold text-[#002D7A]">
                          Total: ₹{(parseFloat(item.price || 0) * parseInt(item.quantity || 1)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:w-1/3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Order Summary</h2>
              
              <div className="space-y-4">
                {/* Subtotal */}
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Subtotal ({cartItems.length} items)</span>
                  <span className="font-semibold text-gray-800">₹{getSubtotal().toFixed(2)}</span>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200 my-4"></div>

                {/* Total */}
                <div className="flex justify-between text-xl font-bold py-2">
                  <span className="text-gray-800">Total</span>
                  <span className="text-[#002D7A]">₹{getTotal().toFixed(2)}</span>
                </div>

                {/* Checkout Button */}
                {getSubtotal() < 5000 ? (
                  <>
                    <button disabled className="w-full bg-gray-200 text-gray-500 py-4 px-4 rounded-xl font-semibold cursor-not-allowed flex items-center justify-center gap-2 mt-6">
                      <FaShoppingBag size={18} />
                      Proceed to Checkout
                    </button>
                    <div className="text-sm text-red-600 text-center mt-3 bg-red-50 p-3 rounded-lg">
                      Minimum order amount is ₹5,000 to proceed to checkout.
                    </div>
                  </>
                ) : (
                  <Link to="/checkout" className="w-full bg-[#002D7A] text-white py-4 px-4 rounded-xl font-semibold hover:bg-[#001C4C] transition-colors flex items-center justify-center gap-2 mt-6">
                    <FaShoppingBag size={18} />
                    Proceed to Checkout
                  </Link>
                )}

                {/* Security Notice */}
                <div className="text-xs text-gray-500 text-center">
                  🔒 Secure checkout with SSL encryption
                </div>
              </div>

              {/* Promo Code */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Have a promo code?</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter code"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A] focus:border-transparent"
                  />
                  <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                    Apply
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Cart;
