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
    <div className="fixed bottom-6 right-4 sm:right-6 z-[10000] animate-slide-up">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-4 sm:p-5 max-w-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <FaShoppingCart className="text-green-600" size={20} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">Item added to cart!</p>
            <p className="text-xs text-gray-600 mt-1">
              Cart Total: <span className="font-bold text-[#002D7A]">₹{cartTotal.toFixed(2)}</span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {cartCount} item(s) in cart
            </p>
            <Link
              to="/cart"
              className="text-xs text-[#002D7A] hover:underline mt-1 inline-block font-medium"
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
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 flex-shrink-0"
            title="Hide notification"
          >
            <FaTimes size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default CartNotification;

