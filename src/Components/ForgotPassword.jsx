import React, { useState } from "react";
import { FaTimes, FaEnvelope, FaCheckCircle } from "react-icons/fa";

function ForgotPassword({ isOpen, onClose }) {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!email) {
      setError("Email is required");
      return;
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 2000);
  };

  const handleClose = () => {
    setEmail("");
    setIsSubmitted(false);
    setError("");
    setIsLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-[#002D7A]">
            {isSubmitted ? "Check Your Email" : "Forgot Password"}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!isSubmitted ? (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-[#002D7A] bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaEnvelope className="text-[#002D7A] text-2xl" />
                </div>
                <p className="text-gray-600">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaEnvelope className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="forgot-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A] focus:border-transparent transition-colors ${
                        error ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="Enter your email address"
                      disabled={isLoading}
                    />
                  </div>
                  {error && (
                    <p className="mt-1 text-sm text-red-600">{error}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-[#002D7A] hover:bg-[#001C4C] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#002D7A] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Remember your password?{" "}
                  <button
                    onClick={handleClose}
                    className="font-medium text-[#002D7A] hover:text-[#001C4C] transition-colors"
                  >
                    Sign in here
                  </button>
                </p>
              </div>
            </>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaCheckCircle className="text-green-600 text-2xl" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Email Sent Successfully!
              </h3>
              <p className="text-gray-600 mb-6">
                We've sent a password reset link to <strong>{email}</strong>. 
                Please check your email and follow the instructions to reset your password.
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleClose}
                  className="w-full py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-[#002D7A] hover:bg-[#001C4C] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#002D7A] transition-colors duration-200"
                >
                  Back to Sign In
                </button>
                <button
                  onClick={() => {
                    setIsSubmitted(false);
                    setEmail("");
                  }}
                  className="w-full py-2 px-4 text-sm font-medium text-[#002D7A] hover:text-[#001C4C] transition-colors"
                >
                  Try Different Email
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-2xl">
          <p className="text-xs text-gray-500 text-center">
            If you don't receive an email within a few minutes, check your spam folder or{" "}
            <a href="#" className="text-[#002D7A] hover:text-[#001C4C] transition-colors">
              contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
