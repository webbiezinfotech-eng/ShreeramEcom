import React, { useEffect } from "react";
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from "react-icons/fa";

function Toast({ isOpen, onClose, message, type = "success", duration = 3000 }) {
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const bgColor = {
    success: "bg-green-50 border-green-200 text-green-800",
    error: "bg-red-50 border-red-200 text-red-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800"
  }[type];

  const iconColor = {
    success: "text-green-600",
    error: "text-red-600",
    info: "text-blue-600",
    warning: "text-yellow-600"
  }[type];

  const Icon = {
    success: FaCheckCircle,
    error: FaExclamationCircle,
    info: FaInfoCircle,
    warning: FaExclamationCircle
  }[type];

  return (
    <div className="fixed top-4 right-4 z-[10001] animate-fade-in">
      <div className={`${bgColor} border rounded-lg shadow-lg p-4 min-w-[300px] max-w-md flex items-start gap-3`}>
        <Icon className={`${iconColor} flex-shrink-0 mt-0.5`} size={20} />
        <p className="flex-1 text-sm font-medium">{message}</p>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <FaTimes size={14} />
        </button>
      </div>
    </div>
  );
}

export default Toast;

