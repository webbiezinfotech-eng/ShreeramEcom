import React, { useState, useEffect, useRef } from "react";
import { FaPlus, FaMinus, FaTrash, FaShoppingBag, FaArrowLeft, FaTimes, FaExclamationTriangle } from "react-icons/fa";
import { Link } from "react-router-dom";
import { useCart } from "../contexts/CartContext";

function Cart() {
  const { 
    cartItems, 
    loading, 
    updateItemQuantity, 
    removeItemFromCart, 
    loadCartItems 
  } = useCart();
  
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, itemId: null, itemName: null });
  const [quantityInputs, setQuantityInputs] = useState({});
  const inputDebounceTimer = useRef({});
  const touchStartPos = useRef({});

  // Load cart items when component mounts
  useEffect(() => {
    loadCartItems();
  }, [loadCartItems]);

  // Sync quantity inputs with cart items
  useEffect(() => {
    const newInputs = {};
    cartItems.forEach(item => {
      const itemId = item.cart_id || item.id;
      if (itemId) {
        newInputs[itemId] = item.quantity || 1;
      }
    });
    setQuantityInputs(newInputs);
  }, [cartItems]);

  // Helper function to handle touch start - track position
  const handleTouchStart = (e, key) => {
    const touch = e.touches[0];
    touchStartPos.current[key] = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  };

  // Helper function to check if it's a proper click (not a scroll)
  const isProperClick = (e, key) => {
    if (!touchStartPos.current[key]) return true;
    const start = touchStartPos.current[key];
    const touch = e.changedTouches[0];
    const deltaX = Math.abs(touch.clientX - start.x);
    const deltaY = Math.abs(touch.clientY - start.y);
    const deltaTime = Date.now() - start.time;
    // Consider it a click if movement is less than 10px and time is less than 300ms
    return deltaX < 10 && deltaY < 10 && deltaTime < 300;
  };

  // Handle direct quantity input - update cart with debounce
  const handleQuantityInput = async (itemId, value) => {
    const item = cartItems.find(item => (item.cart_id || item.id) === itemId);
    if (!item) return;

    // Allow empty string for typing, but treat invalid values as 1
    const numValue = value === '' ? 1 : parseInt(value);
    const validQty = isNaN(numValue) ? 1 : Math.max(1, numValue);
    
    // Update local state immediately
    setQuantityInputs(prev => ({ ...prev, [itemId]: validQty }));
    
    // Clear previous timer
    if (inputDebounceTimer.current[itemId]) {
      clearTimeout(inputDebounceTimer.current[itemId]);
    }
    
    // Debounce cart update - wait 500ms after user stops typing
    inputDebounceTimer.current[itemId] = setTimeout(async () => {
      try {
        const actualItemId = item.id ? parseInt(item.id) : null;
        if (actualItemId && !isNaN(actualItemId)) {
          await updateItemQuantity(actualItemId, validQty);
        }
      } catch (error) {
        console.error('Error updating cart quantity:', error);
        // Reload cart on error
        await loadCartItems();
      }
    }, 500);
  };

  const updateQuantity = async (id, change) => {
    try {
      const item = cartItems.find(item => (item.id === id || item.cart_id === id));
      if (!item) {
        return;
      }
      
      const currentQuantity = parseInt(item.quantity || 1);
      const newQuantity = Math.max(1, currentQuantity + change);
      
      if (newQuantity !== currentQuantity) {
        const itemId = item.id ? parseInt(item.id) : null;
        if (!itemId || isNaN(itemId)) {
          return;
        }
        
        // Update local input state immediately
        setQuantityInputs(prev => ({ ...prev, [id]: newQuantity }));
        
        // Update quantity - context will handle optimistic update
        await updateItemQuantity(itemId, newQuantity);
      }
    } catch (error) {
      // On error, reload to ensure sync
      await loadCartItems();
    }
  };

  const handleDeleteClick = (id, name) => {
    setDeleteConfirm({ isOpen: true, itemId: id, itemName: name });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.itemId) {
      try {
        await removeItemFromCart(deleteConfirm.itemId);
        // Reload cart items to ensure sync
        await loadCartItems();
        setDeleteConfirm({ isOpen: false, itemId: null, itemName: null });
      } catch (error) {
        console.error('Error removing item:', error);
        // Still close the modal even if there's an error
        setDeleteConfirm({ isOpen: false, itemId: null, itemName: null });
        // Reload to sync
        await loadCartItems();
      }
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ isOpen: false, itemId: null, itemName: null });
  };

  const getSubtotal = () => {
    return cartItems.reduce((total, item) => {
      const price = parseFloat(item.price || 0);
      const quantity = parseInt(item.quantity || 1);
      const itemsPerPack = parseInt(item.items_per_pack || 1);
      return total + (price * quantity * itemsPerPack);
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
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <Link to="/" className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 text-[#002D7A] hover:text-[#001C4C] hover:bg-gray-100 rounded-full transition-colors flex-shrink-0">
              <FaArrowLeft size={14} className="sm:w-4 sm:h-4" />
            </Link>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#002D7A]">Shopping Cart</h1>
          </div>
          <p className="text-[#002D7A] text-xs sm:text-sm ml-10 sm:ml-11">{cartItems.length} item(s) in your cart</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
          {/* Cart Items */}
          <div className="lg:w-2/3">
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 lg:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 sm:mb-5">Cart Items</h2>
              
              <div className="space-y-3 sm:space-y-3">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex flex-col sm:flex-row gap-3 p-3 sm:p-4 border border-gray-100 rounded-lg hover:shadow-sm transition-all duration-200 bg-gray-50/50">
                    {/* Product Image */}
                    <div className="flex-shrink-0 self-center sm:self-start">
                      {(item.image && item.image.trim() !== '') || (item.image_url && item.image_url.trim() !== '') ? (
                        <img 
                          src={item.image || item.image_url}
                          alt={item.name || 'Product'}
                          className="w-16 h-16 sm:w-18 sm:h-18 object-cover rounded-lg"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const fallback = e.target.nextElementSibling;
                            if (fallback) fallback.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`${((item.image && item.image.trim() !== '') || (item.image_url && item.image_url.trim() !== '')) ? 'hidden' : ''} w-16 h-16 sm:w-18 sm:h-18 bg-gray-200 rounded-lg flex items-center justify-center`}>
                        <span className="text-gray-400 text-base sm:text-lg font-bold">{(item.name || 'Product').charAt(0).toUpperCase()}</span>
                      </div>
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-[#002D7A] font-medium uppercase tracking-wide">
                            {item.category_name || 'General'}
                          </span>
                          <h3 className="text-sm sm:text-base font-semibold text-gray-800 mt-1 mb-2 line-clamp-2">
                            {item.name}
                          </h3>
                          
                          {/* Price - Detailed Pack/Box Information */}
                          <div className="mb-2 sm:mb-3">
                            {item.items_per_pack && item.items_per_pack > 1 ? (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                                {/* Badge */}
                                <div className="inline-block bg-[#002D7A] text-white text-xs font-semibold px-2 py-1 rounded mb-2">
                                  BOX/PACK ITEM
                                </div>
                                
                                {/* Price per piece */}
                                <div>
                                  <p className="text-xs text-gray-600 mb-1">Price per piece:</p>
                                  <p className="text-base sm:text-lg font-bold text-[#002D7A]">
                                    ₹{parseFloat(item.price || 0).toFixed(2)}
                                  </p>
                                </div>
                                
                                {/* Items per pack */}
                                <div className="border-t border-blue-200 pt-2">
                                  <p className="text-xs text-gray-600 mb-1">
                                    <span className="font-semibold">{item.items_per_pack} pieces</span> per box/pack
                                  </p>
                                </div>
                                
                                {/* Price per box */}
                                <div>
                                  <p className="text-xs text-gray-600 mb-1">Price per box (1 pack):</p>
                                  <p className="text-lg sm:text-xl font-bold text-[#002D7A]">
                                    ₹{((parseFloat(item.price || 0) * parseInt(item.items_per_pack || 1))).toFixed(2)}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    (₹{parseFloat(item.price || 0).toFixed(2)} × {item.items_per_pack} pieces)
                                  </p>
                                </div>
                                
                                {/* Minimum order warning */}
                                <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
                                  <p className="text-xs text-yellow-800 font-medium">
                                    ⚠️ Minimum order: 1 box ({item.items_per_pack} pieces)
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-base sm:text-lg font-bold text-[#002D7A]">
                                  ₹{parseFloat(item.price || 0).toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => handleDeleteClick(item.cart_id || item.id, item.name)}
                          className="text-red-500 hover:text-red-700 transition-colors p-1.5 sm:p-2 flex-shrink-0"
                          title="Remove item"
                        >
                          <FaTrash size={14} className="sm:w-4 sm:h-4" />
                        </button>
                      </div>

                      {/* Quantity Controls */}
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                          <span className="text-xs sm:text-sm font-medium text-gray-600 whitespace-nowrap">
                            {item.items_per_pack && item.items_per_pack > 1 ? 'Boxes:' : 'Quantity:'}
                          </span>
                          <div className="flex items-center border border-gray-200 rounded-lg bg-white">
                            <button
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                e.target.blur();
                                await updateQuantity(item.cart_id || item.id, -1);
                              }}
                              onTouchStart={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleTouchStart(e, `qty-minus-${item.cart_id || item.id}`);
                              }}
                              onTouchEnd={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (isProperClick(e, `qty-minus-${item.cart_id || item.id}`)) {
                                  e.target.blur();
                                  await updateQuantity(item.cart_id || item.id, -1);
                                }
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              className="p-1.5 sm:p-2 hover:bg-gray-50 active:bg-gray-100 transition-colors rounded-l-lg disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation select-none min-w-[32px] min-h-[32px] flex items-center justify-center"
                              disabled={parseInt(item.quantity || 1) <= 1}
                              type="button"
                            >
                              <FaMinus className="text-gray-500" size={10} />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={quantityInputs[item.cart_id || item.id] || item.quantity || 1}
                              onChange={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleQuantityInput(item.cart_id || item.id, e.target.value);
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                e.target.select();
                              }}
                              onTouchStart={(e) => {
                                e.stopPropagation();
                              }}
                              onFocus={(e) => {
                                e.target.select();
                              }}
                              className="w-12 sm:w-14 text-center border-0 focus:outline-none focus:ring-0 text-xs sm:text-sm font-medium py-1.5 sm:py-2 touch-manipulation min-h-[32px]"
                            />
                            <button
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                e.target.blur();
                                await updateQuantity(item.cart_id || item.id, 1);
                              }}
                              onTouchStart={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleTouchStart(e, `qty-plus-${item.cart_id || item.id}`);
                              }}
                              onTouchEnd={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (isProperClick(e, `qty-plus-${item.cart_id || item.id}`)) {
                                  e.target.blur();
                                  await updateQuantity(item.cart_id || item.id, 1);
                                }
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              className="p-1.5 sm:p-2 hover:bg-gray-50 active:bg-gray-100 transition-colors rounded-r-lg touch-manipulation select-none min-w-[32px] min-h-[32px] flex items-center justify-center"
                              type="button"
                            >
                              <FaPlus className="text-gray-500" size={10} />
                            </button>
                          </div>
                          {item.items_per_pack && item.items_per_pack > 1 && (
                            <span className="text-xs text-gray-600 whitespace-nowrap">
                              = {parseInt(item.quantity || 1) * parseInt(item.items_per_pack || 1)} pieces
                            </span>
                          )}
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2 sm:p-3 border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs sm:text-sm font-medium text-gray-700">Item Total:</span>
                            <span className="text-base sm:text-lg font-bold text-[#002D7A]">
                              ₹{((parseFloat(item.price || 0) * parseInt(item.quantity || 1) * parseInt(item.items_per_pack || 1))).toFixed(2)}
                            </span>
                          </div>
                          {item.items_per_pack && item.items_per_pack > 1 ? (
                            <div className="space-y-2 mt-2 border-t border-gray-200 pt-2">
                              {/* Box-based calculation - Clear and simple */}
                              <div className="bg-white rounded p-2 border border-blue-200">
                                <p className="text-xs sm:text-sm font-semibold text-gray-800 mb-1">
                                  Calculation:
                                </p>
                                <p className="text-xs sm:text-sm text-gray-700">
                                  <span className="font-bold text-[#002D7A]">{item.quantity}</span> box(es) × <span className="font-bold text-[#002D7A]">₹{((parseFloat(item.price || 0) * parseInt(item.items_per_pack || 1))).toFixed(2)}</span> per box
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                  = <span className="font-semibold">{item.quantity}</span> × ₹{((parseFloat(item.price || 0) * parseInt(item.items_per_pack || 1))).toFixed(2)} = ₹{((parseFloat(item.price || 0) * parseInt(item.quantity || 1) * parseInt(item.items_per_pack || 1))).toFixed(2)}
                                </p>
                              </div>
                              {/* Detailed breakdown */}
                              <div className="space-y-1">
                                <p className="text-xs text-gray-600">
                                  <span className="font-semibold">{item.quantity}</span> box(es) = <span className="font-semibold">{parseInt(item.quantity || 1) * parseInt(item.items_per_pack || 1)}</span> pieces total
                                </p>
                                <p className="text-xs text-gray-500">
                                  (₹{parseFloat(item.price || 0).toFixed(2)} per piece × {item.items_per_pack} pieces per box)
                                </p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-600 mt-1">
                              {item.quantity} item(s) × ₹{parseFloat(item.price || 0).toFixed(2)} = ₹{((parseFloat(item.price || 0) * parseInt(item.quantity || 1))).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:w-1/3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-5 lg:p-6 sticky top-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 sm:mb-5">Order Summary</h2>
              
              <div className="space-y-3 sm:space-y-4">
                {/* Subtotal */}
                <div className="flex justify-between py-1 sm:py-2">
                  <span className="text-sm sm:text-base text-gray-600">Subtotal ({cartItems.length} items)</span>
                  <span className="text-sm sm:text-base font-semibold text-gray-800">₹{getSubtotal().toFixed(2)}</span>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200 my-3 sm:my-4"></div>

                {/* Total */}
                <div className="flex justify-between text-lg sm:text-xl font-bold py-1 sm:py-2">
                  <span className="text-gray-800">Total</span>
                  <span className="text-[#002D7A]">₹{getTotal().toFixed(2)}</span>
                </div>

                {/* Checkout Button */}
                {getSubtotal() < 1000 ? (
                  <>
                    <button disabled className="w-full bg-gray-200 text-gray-500 py-3 sm:py-4 px-4 rounded-lg sm:rounded-xl font-semibold cursor-not-allowed flex items-center justify-center gap-2 mt-4 sm:mt-5 text-sm sm:text-base">
                      <FaShoppingBag size={16} className="sm:w-[18px] sm:h-[18px]" />
                      Proceed to Checkout
                    </button>
                    <div className="text-xs sm:text-sm text-red-600 text-center mt-2 sm:mt-3 bg-red-50 p-2 sm:p-3 rounded-lg">
                      Minimum order amount is ₹1,000 to proceed to checkout.
                    </div>
                  </>
                ) : (
                  <Link to="/checkout" className="w-full bg-[#002D7A] text-white py-3 sm:py-4 px-4 rounded-lg sm:rounded-xl font-semibold hover:bg-[#001C4C] transition-colors flex items-center justify-center gap-2 mt-4 sm:mt-5 text-sm sm:text-base">
                    <FaShoppingBag size={16} className="sm:w-[18px] sm:h-[18px]" />
                    Proceed to Checkout
                  </Link>
                )}

                {/* Security Notice */}
                <div className="text-xs text-gray-500 text-center mt-3 sm:mt-4">
                  🔒 Secure checkout with SSL encryption
                </div>
              </div>

              {/* Promo Code */}
              <div className="mt-4 sm:mt-5 pt-4 sm:pt-5 border-t border-gray-200">
                <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">Have a promo code?</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter code"
                    className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A] focus:border-transparent"
                  />
                  <button className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                    Apply
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50 p-4" onClick={handleDeleteCancel}>
          <div className="bg-white rounded-xl shadow-xl p-5 sm:p-6 max-w-md w-full mx-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <FaExclamationTriangle className="text-red-600" size={20} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">Remove Item?</h3>
              </div>
              <button
                onClick={handleDeleteCancel}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <FaTimes size={18} />
              </button>
            </div>
            <p className="text-sm sm:text-base text-gray-600 mb-1">
              Are you sure you want to remove
            </p>
            <p className="text-sm sm:text-base font-semibold text-gray-800 mb-4 sm:mb-6">
              "{deleteConfirm.itemName}" from your cart?
            </p>
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={handleDeleteCancel}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-gray-700 text-sm sm:text-base font-medium"
              >
                No, Keep It
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors text-sm sm:text-base font-medium flex items-center justify-center gap-2"
              >
                <FaTrash size={14} />
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Cart;

