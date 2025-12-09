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
    <div 
      className="fixed bottom-0 left-0 right-0 z-[99999] w-full"
      style={{ 
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        pointerEvents: 'none'
      }}
    >
      <div 
        className="w-full"
        style={{ pointerEvents: 'auto' }}
      >
        <div className="bg-white/95 backdrop-blur-md shadow-2xl border-t-2 border-green-500 py-3 px-4 sm:py-3.5 sm:px-5 md:py-4 md:px-6 w-full">
          <div className="flex items-center gap-3 sm:gap-4 w-full">
            {/* Cart Icon */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ring-2 ring-green-100">
              <FaShoppingCart className="text-white text-sm sm:text-base md:text-lg" />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <p className="text-sm sm:text-base md:text-lg font-bold text-gray-900 leading-tight">
                Item added to cart
              </p>
              <div className="flex items-center gap-2 sm:gap-2.5">
                <span className="text-sm sm:text-base md:text-lg font-bold text-[#002D7A]">
                  ₹{cartTotal.toFixed(2)}
                </span>
                <span className="text-gray-300 text-sm">•</span>
                <span className="text-xs sm:text-sm md:text-base text-gray-600 font-medium">
                  {cartCount} {cartCount === 1 ? 'item' : 'items'}
                </span>
              </div>
            </div>
            
            {/* View Cart Link - Vertically Centered */}
            <Link
              to="/cart"
              className="text-sm sm:text-base md:text-lg text-[#002D7A] hover:text-[#001a5c] font-bold whitespace-nowrap transition-all duration-200 hover:underline flex items-center gap-1 self-center"
            >
              View Cart
              <span className="text-[#002D7A]">→</span>
            </Link>
            
            {/* Close Button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowCartNotification(false);
                localStorage.setItem('show_cart_notification', 'false');
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowCartNotification(false);
                localStorage.setItem('show_cart_notification', 'false');
              }}
              className="text-gray-400 hover:text-gray-700 active:text-gray-900 transition-all duration-200 p-2 flex-shrink-0 touch-manipulation rounded-full hover:bg-gray-100 active:bg-gray-200 min-w-[36px] min-h-[36px] flex items-center justify-center"
              title="Hide notification"
              aria-label="Close notification"
            >
              <FaTimes className="text-base sm:text-lg md:text-xl" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CartNotification;

