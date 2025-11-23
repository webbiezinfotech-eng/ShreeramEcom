import React, { useEffect } from "react";
import { FaCheckCircle } from "react-icons/fa";

function WelcomePopup({ isOpen, onClose, customerName, isFirstTime }) {
  useEffect(() => {
    if (isOpen) {
      // Auto close after 3 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 animate-fade-in">
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full">
          <FaCheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-[#002D7A] mb-2 text-center">
          {isFirstTime 
            ? `Welcome to Shreeram General Store, ${customerName || "Valued Customer"}!` 
            : `Welcome Back, ${customerName || "Valued Customer"}!`}
        </h3>
        <p className="text-base text-gray-700 mb-1 text-center font-medium">
          {isFirstTime 
            ? "Your Trusted Wholesale Partner" 
            : "We're Glad to Have You Back"}
        </p>
        <p className="text-sm text-gray-600 mb-6 text-center leading-relaxed">
          {isFirstTime 
            ? "Discover premium stationery supplies at unbeatable wholesale prices. From office essentials to school supplies, we've got everything your business needs. Shop more, save more!" 
            : "Continue shopping for the best wholesale prices on premium stationery and office supplies. Your one-stop destination for quality products at competitive rates."}
        </p>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 rounded-lg bg-[#002D7A] text-white hover:bg-[#001C4C] transition-colors"
        >
          Continue Shopping
        </button>
      </div>
    </div>
  );
}

export default WelcomePopup;

