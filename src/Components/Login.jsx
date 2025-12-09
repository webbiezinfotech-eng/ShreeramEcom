import React, { useState, useEffect } from "react";
import { FaEye, FaEyeSlash, FaUser, FaLock, FaTimes, FaExclamationTriangle } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { loginCustomer } from "../services/api";
import ForgotPassword from "./ForgotPassword";

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    emailOrPhone: "",
    password: "",
  });
  const [step, setStep] = useState(1); // 1 = email/phone, 2 = password
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [showInactivePopup, setShowInactivePopup] = useState(false);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const validateEmailOrPhone = (value) => {
    const trimmed = value.trim();
    // Check if it's a valid email
    const emailRegex = /\S+@\S+\.\S+/;
    // Check if it's a valid phone (10 digits, allow spaces/dashes but remove them)
    const phoneDigits = trimmed.replace(/[\s\-\(\)]/g, ''); // Remove spaces, dashes, parentheses
    const phoneRegex = /^[0-9]{10}$/;
    
    if (emailRegex.test(trimmed)) {
      return 'email';
    } else if (phoneRegex.test(phoneDigits)) {
      return 'phone';
    }
    return null;
  };

  const handleEmailOrPhoneSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    const trimmedValue = formData.emailOrPhone.trim();
    
    if (!trimmedValue) {
      newErrors.emailOrPhone = "Email or Phone number is required";
    } else {
      const type = validateEmailOrPhone(trimmedValue);
      if (!type) {
        // Check if it looks like a phone number (all digits or mostly digits)
        const phoneDigits = trimmedValue.replace(/[\s\-\(\)]/g, '');
        if (/^[0-9]+$/.test(phoneDigits)) {
          if (phoneDigits.length < 10) {
            newErrors.emailOrPhone = "Phone number must be 10 digits";
          } else if (phoneDigits.length > 10) {
            newErrors.emailOrPhone = "Phone number must be exactly 10 digits";
          } else {
            newErrors.emailOrPhone = "Please enter a valid 10-digit phone number";
          }
        } else {
          newErrors.emailOrPhone = "Please enter a valid email address or 10-digit phone number";
        }
      }
    }
    
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      setStep(2); // Move to password step
    }
  };

  const validatePassword = () => {
    const newErrors = {};
    
    // Password validation removed - user can use any password
    if (!formData.password || formData.password.trim() === '') {
      newErrors.password = "Password is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    
    if (validatePassword()) {
      setLoading(true);
      try {
        const result = await loginCustomer(formData.emailOrPhone.trim(), formData.password);
        
        if (result.ok && result.customer) {
          // Check if first time login
          const loginHistoryKey = `login_history_${result.customer.id}`;
          const hasLoggedInBefore = localStorage.getItem(loginHistoryKey);
          const isFirstTime = !hasLoggedInBefore;
          
          if (isFirstTime) {
            // Mark as logged in before
            localStorage.setItem(loginHistoryKey, 'true');
          }

          // Clear ALL old cart and product-related localStorage on login
          localStorage.removeItem('show_cart_notification');
          localStorage.removeItem('featured_products_quantities');
          localStorage.removeItem('featured_products_quantity_selectors');
          localStorage.removeItem('products_page_quantities');
          localStorage.removeItem('products_page_quantity_selectors');
          
          // Trigger storage event to sync cart context
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'customer_id',
            newValue: result.customer.id.toString()
          }));
          // Also trigger a custom event
          window.dispatchEvent(new CustomEvent('customerLogin', { detail: result.customer }));
          
          // Store login info in localStorage to show popup on home page
          const loginInfo = {
            showWelcome: true,
            customerName: result.customer.name || result.customer.email || result.customer.phone,
            isFirstTime: isFirstTime,
            timestamp: Date.now()
          };
          localStorage.setItem('show_welcome_popup', JSON.stringify(loginInfo));
          
          // Redirect to home
          navigate("/");
        } else {
          // Check if account is inactive
          if (result.inactive || (result.error && (result.error.includes('contact') || result.error.includes('Shreeram Store')))) {
            setShowInactivePopup(true);
            setSubmitError("");
          } else {
            setSubmitError(result.error || "Login failed. Please check your credentials.");
          }
        }
      } catch (error) {
        setSubmitError("An error occurred. Please try again.");
        // Silently handle error
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    setStep(1);
    setFormData(prev => ({ ...prev, password: "" }));
    setErrors({});
    setSubmitError("");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-start sm:items-center justify-center py-6 sm:py-8 px-4 sm:px-6">
      <div className="max-w-md w-full space-y-5 sm:space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#002D7A]">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your account to continue
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-5 sm:p-6 md:p-8">
          {step === 1 ? (
            // Step 1: Email/Phone Input
            <form className="space-y-4 sm:space-y-5" onSubmit={handleEmailOrPhoneSubmit}>
              <div>
                <label htmlFor="emailOrPhone" className="block text-sm font-medium text-gray-700 mb-2">
                  Email or Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaUser className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="emailOrPhone"
                    name="emailOrPhone"
                    type="text"
                    inputMode="text"
                    autoComplete="username"
                    value={formData.emailOrPhone}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-3 py-2.5 text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A] focus:border-transparent transition-colors ${
                      errors.emailOrPhone ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Enter email or 10-digit phone number"
                    autoFocus
                  />
                </div>
                {errors.emailOrPhone && (
                  <p className="mt-1.5 text-sm text-red-600">{errors.emailOrPhone}</p>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  You can login with your email address or 10-digit phone number
                </p>
              </div>

              {/* Error Message */}
              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {submitError}
                </div>
              )}

              {/* Continue Button */}
              <div>
                <button
                  type="submit"
                  disabled={loading || !formData.emailOrPhone.trim()}
                  className="w-full flex justify-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-white bg-[#002D7A] hover:bg-[#001C4C] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#002D7A] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>

              {/* Sign Up Link */}
              <div className="text-center pt-3">
                <p className="text-sm text-gray-600">
                  Don't have an account?{" "}
                  <Link to="/register" className="font-medium text-[#002D7A] hover:text-[#001C4C] transition-colors">
                    Sign up here
                  </Link>
                </p>
              </div>
            </form>
          ) : (
            // Step 2: Password Input
            <form className="space-y-4 sm:space-y-5" onSubmit={handlePasswordSubmit}>
              {/* Back Button */}
              <button
                type="button"
                onClick={handleBack}
                className="text-sm text-[#002D7A] hover:text-[#001C4C] flex items-center gap-2 mb-2"
              >
                ← Back
              </button>

              {/* Email/Phone Display */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-500 mb-1">Logging in as:</p>
                <p className="text-sm font-medium text-gray-700">{formData.emailOrPhone}</p>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-10 py-2.5 text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A] focus:border-transparent transition-colors ${
                      errors.password ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Enter your password"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <FaEyeSlash className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <FaEye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              {/* Forgot Password */}
              <div className="flex justify-end">
                <button 
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm font-medium text-[#002D7A] hover:text-[#001C4C] transition-colors"
                >
                  Forgot your password?
                </button>
              </div>

              {/* Error Message */}
              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {submitError}
                </div>
              )}

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-white bg-[#002D7A] hover:bg-[#001C4C] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#002D7A] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Signing In..." : "Sign In"}
                </button>
              </div>
            </form>
          )}
        </div>
       </div>
       
       {/* Forgot Password Popup */}
       <ForgotPassword 
         isOpen={showForgotPassword} 
         onClose={() => setShowForgotPassword(false)} 
       />

       {/* Inactive Account Popup */}
       {showInactivePopup && (
         <div 
           className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50"
           onClick={(e) => {
             if (e.target === e.currentTarget) {
               setShowInactivePopup(false);
             }
           }}
         >
           <div 
             className="bg-white rounded-xl shadow-xl p-4 sm:p-6 max-w-md w-full mx-4 animate-fade-in"
             onClick={(e) => e.stopPropagation()}
           >
             <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-3">
                 <div className="bg-orange-100 p-2 rounded-full">
                   <FaExclamationTriangle className="text-orange-600 text-xl" />
                 </div>
                 <h3 className="text-lg sm:text-xl font-bold text-[#002D7A]">Account Access Restricted</h3>
               </div>
               <button
                 onClick={() => setShowInactivePopup(false)}
                 className="text-gray-400 hover:text-gray-600 transition-colors"
               >
                 <FaTimes size={18} className="sm:w-5 sm:h-5" />
               </button>
             </div>
             <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
               Please contact Shreeram Store for view products.
             </p>
             <div className="bg-gray-50 rounded-lg p-3 mb-4">
               <p className="text-xs sm:text-sm text-gray-700 font-medium mb-1">Contact Information:</p>
               <p className="text-xs sm:text-sm text-gray-600">Email: Shreeramgeneralstore.20@gmail.com</p>
               <p className="text-xs sm:text-sm text-gray-600">Phone: +91 7304044465</p>
             </div>
             <div className="flex gap-2 sm:gap-3">
               <button
                 onClick={() => setShowInactivePopup(false)}
                 className="flex-1 px-3 sm:px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-gray-700 text-sm sm:text-base"
               >
                 Close
               </button>
               <a
                 href="mailto:Shreeramgeneralstore.20@gmail.com"
                 className="flex-1 px-3 sm:px-4 py-2 rounded-lg bg-[#002D7A] text-white hover:bg-[#001C4C] transition-colors flex items-center justify-center gap-2 text-sm sm:text-base text-center"
               >
                 Contact Admin
               </a>
             </div>
           </div>
         </div>
       )}

     </div>
   );
 }
 
 export default Login;
