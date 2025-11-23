import React from "react";
import { FaSignInAlt, FaTimes } from "react-icons/fa";
import { Link } from "react-router-dom";

function LoginPrompt({ isOpen, onClose, message = "Please login first to use this feature" }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-[#002D7A]">Login Required</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-gray-700"
          >
            Cancel
          </button>
          <Link
            to="/login"
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg bg-[#002D7A] text-white hover:bg-[#001C4C] transition-colors flex items-center justify-center gap-2"
          >
            <FaSignInAlt size={16} />
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default LoginPrompt;

