import React from "react";
import { FaSignInAlt, FaTimes } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

function LoginPrompt({ isOpen, onClose, message = "Please login first to use this feature" }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleLoginClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
    // Small delay to ensure modal closes before navigation
    setTimeout(() => {
      navigate("/login", { replace: false });
    }, 100);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white rounded-xl shadow-xl p-4 sm:p-6 max-w-md w-full mx-4 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg sm:text-xl font-bold text-[#002D7A]">Login Required</h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>
        <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">{message}</p>
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="flex-1 px-3 sm:px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-gray-700 text-sm sm:text-base"
          >
            Cancel
          </button>
          <button
            onClick={handleLoginClick}
            type="button"
            className="flex-1 px-3 sm:px-4 py-2 rounded-lg bg-[#002D7A] text-white hover:bg-[#001C4C] transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <FaSignInAlt size={14} className="sm:w-4 sm:h-4" />
            Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginPrompt;

