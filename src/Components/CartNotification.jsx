import React, { useMemo } from 'react';
import { FaShoppingCart, FaTimes } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';

function CartNotification() {
  const { showCartNotification, setShowCartNotification, cartItems } = useCart();

  // Calculate cart total and count in real-time from cartItems
  const cartTotal = useMemo(() => {
    return cartItems.reduce((total, item) => {
      const itemsPerPack = parseInt(item.items_per_pack || 1);
      const price = parseFloat(item.price || 0);
      const quantity = parseInt(item.quantity || 1);
      return total + (price * quantity * itemsPerPack);
    }, 0);
  }, [cartItems]);

  const cartCount = useMemo(() => {
    return cartItems.length;
  }, [cartItems]);

  if (!showCartNotification || cartItems.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[10000] animate-slide-up px-2 sm:px-4 md:px-6 pb-2 sm:pb-4 md:pb-6">
      <div className="bg-white rounded-lg sm:rounded-xl shadow-2xl border-2 border-green-500 p-3 sm:p-4 md:p-5 max-w-full mx-auto">
        <div className="flex items-center gap-3 sm:gap-4 md:gap-5">
          <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <FaShoppingCart className="text-green-600" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm sm:text-base md:text-lg font-bold text-gray-800">Item added to cart! 🎉</p>
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 mt-1 sm:mt-2">
              <p className="text-xs sm:text-sm md:text-base text-gray-600">
                Cart Total: <span className="font-bold text-[#002D7A] text-sm sm:text-base md:text-lg">₹{cartTotal.toFixed(2)}</span>
              </p>
              <span className="hidden sm:inline text-gray-300">|</span>
              <p className="text-xs sm:text-sm md:text-base text-gray-500">
                {cartCount} item(s) in cart
              </p>
            </div>
            <Link
              to="/cart"
              className="text-xs sm:text-sm md:text-base text-[#002D7A] hover:underline mt-2 sm:mt-1 inline-block font-semibold"
            >
              View Cart →
            </Link>
          </div>
          <button
            type="button"
            onClick={() => {
              // Hide notification (user manually closed)
              setShowCartNotification(false);
              localStorage.setItem('show_cart_notification', 'false');
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 sm:p-2 flex-shrink-0"
            title="Hide notification"
          >
            <FaTimes size={16} className="sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default CartNotification;

