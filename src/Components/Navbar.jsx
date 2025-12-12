import React, { useState, useEffect, useRef } from "react";
import { FaPhoneAlt, FaHeart } from "react-icons/fa";
import { AiOutlineShoppingCart, AiOutlineSearch } from "react-icons/ai";
import { FiUser } from "react-icons/fi";
import { useCart } from "../contexts/CartContext";
import { useWishlist } from "../contexts/WishlistContext";
import { getLoggedInCustomer, logoutCustomer } from "../services/api";
import { Link, useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/srlogo.png";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [active, setActive] = useState("Home");
  const [searchQuery, setSearchQuery] = useState("");
  const [customer, setCustomer] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { getCartCount } = useCart();
  const { getWishlistCount } = useWishlist();

  // Simple navigation links
  const links = [
    "Home",
    "All Products",
    "About",
    "Contact Us",
  ];

  // Load customer info on mount and when localStorage changes
  useEffect(() => {
    const loadCustomer = () => {
      const customerData = getLoggedInCustomer();
      setCustomer(customerData);
    };
    
    loadCustomer();
    
    // Listen for storage changes
    const handleStorageChange = (e) => {
      if (e.key === 'customer' || e.key === 'customer_id') {
        loadCustomer();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    // Also check periodically (for same-tab login/logout)
    const interval = setInterval(loadCustomer, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Auto-detect active page based on current URL and sync search query
  useEffect(() => {
    const currentPath = location.pathname;
    const urlParams = new URLSearchParams(location.search);
    const urlSearchQuery = urlParams.get('q') || '';

    // Sync search query from URL (only if different to avoid loops)
    if (urlSearchQuery !== searchQuery) {
      setSearchQuery(urlSearchQuery);
    }

    if (currentPath === "/") {
      setActive("Home");
    } else if (currentPath === "/products" || currentPath.startsWith("/product/") || currentPath.startsWith("/category/")) {
      setActive("All Products");
    } else if (currentPath === "/about") {
      setActive("About");
    } else if (currentPath === "/contact") {
      setActive("Contact Us");
    } else {
      setActive("Home");
    }
  }, [location.pathname, location.search]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }
    };
  }, []);

  // Close sidebar on escape key and prevent body scroll when open
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Debounce timer for search
  const searchDebounceTimer = useRef(null);

  // Handle search input change - dynamic search
  const handleSearchChange = (value) => {
    setSearchQuery(value);
    
    // Clear existing timer
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }
    
    // Update URL after 300ms of no typing (debounce)
    // If value is empty, navigate immediately to show all products
    if (!value.trim()) {
      navigate("/products");
    } else {
      searchDebounceTimer.current = setTimeout(() => {
        navigate(`/products?q=${encodeURIComponent(value.trim())}`);
      }, 300);
    }
  };

  // Handle search form submit
  const handleSearch = (e) => {
    e.preventDefault();
    // Clear timer if user submits manually
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }
    if (searchQuery.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/products");
    }
  };

  // Handle logout
  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logoutCustomer();
    setCustomer(null);
    setShowLogoutConfirm(false);
    navigate("/");
  };

  // Get path for each link
  const getLinkPath = (link) => {
    switch (link) {
      case "Home":
        return "/";
      case "All Products":
        return "/products";
      case "About":
        return "/about";
      case "Contact Us":
        return "/contact";
      default:
        return "#";
    }
  };

  return (
    <div>
      {/* Top Bar - Ultra Compact for Mobile */}
      <div className="bg-[#0b1b35] text-white py-1 sm:py-1.5 md:py-2 px-2 sm:px-3 md:px-4 lg:px-6 flex flex-row items-center justify-between gap-1 sm:gap-2 relative h-[28px] sm:h-[32px] md:h-auto">
        {/* Left: Phone Number */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="flex items-center gap-0.5 text-[9px] sm:text-[10px] md:text-xs lg:text-sm">
            <FaPhoneAlt className="text-[#FE7F06] text-[9px] sm:text-[10px] md:text-xs" /> 
            <span className="whitespace-nowrap hidden sm:inline">+91 7304044465</span>
            <span className="whitespace-nowrap sm:hidden">+91 7304...</span>
          </span>
        </div>
        
        {/* Center: Fixed Text - Responsive & Compact */}
        <div className="flex-1 flex justify-center items-center mx-0.5 sm:mx-1 md:mx-2">
          <div className="text-center text-[9px] sm:text-[10px] md:text-xs lg:text-sm font-medium whitespace-nowrap">
            Shreeram Stationery
          </div>
        </div>
        
        {/* Right: Login/Logout - Compact */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {customer ? (
            <>
              <span className="text-[9px] sm:text-[10px] md:text-xs truncate max-w-[50px] sm:max-w-[70px] md:max-w-none hidden sm:inline">Welcome</span>
              <button onClick={handleLogout} className="hover:underline whitespace-nowrap text-[9px] sm:text-[10px] md:text-xs">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:underline whitespace-nowrap text-[9px] sm:text-[10px] md:text-xs">Login</Link>
              <Link to="/register" className="hover:underline whitespace-nowrap text-[9px] sm:text-[10px] md:text-xs hidden md:inline">Register</Link>
            </>
          )}
        </div>
      </div>

      {/* Navbar */}
      <nav className="max-w-auto sticky top-0 z-50 bg-white">
        <div className="bg-white border-b border-[#0000003d] px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 py-3 sm:py-3 md:py-4">
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            {/* Mobile Menu Button & Logo */}
            <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
              <button
                className="md:hidden p-2 -ml-2 text-gray-700 hover:text-[#002D7A] transition-colors"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
              <Link to="/" className="flex-shrink-0">
                <img src={logo} alt="shreeram logo" className="h-7 sm:h-8 md:h-10 w-auto" />
              </Link>
            </div>

            {/* Search - Hidden on mobile, shown on tablet+ */}
            <form onSubmit={handleSearch} className="hidden sm:flex items-center flex-1 max-w-md mx-4 border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#002D7A] focus-within:border-transparent transition-all">
              <button type="submit" className="text-gray-500 hover:text-[#002D7A] px-3 sm:px-4 flex items-center flex-shrink-0 transition-colors">
                <AiOutlineSearch className="text-lg sm:text-xl" />
              </button>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search products..."
                className="px-2 sm:px-3 py-2 sm:py-2.5 w-full outline-none text-sm sm:text-base bg-transparent"
              />
            </form>

            {/* Icons */}
            <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4 flex-shrink-0">
              <Link to="/profile" className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Profile">
                <FiUser className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
              </Link>
              <Link 
                to="/profile" 
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/profile');
                  setTimeout(() => {
                    const event = new CustomEvent('switchToWishlistTab');
                    window.dispatchEvent(event);
                  }, 100);
                }}
                className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Wishlist"
              >
                <FaHeart className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 hover:text-red-500 transition-colors" />
                {getWishlistCount() > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-semibold rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center border-2 border-white">
                    {getWishlistCount()}
                  </span>
                )}
              </Link>
              <Link to="/cart" className="relative p-2 hover:bg-gray-100 rounded-full transition-colors" title="Cart">
                <AiOutlineShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
                {getCartCount() > 0 && (
                  <span className="absolute top-0 right-0 bg-[#FE7F06] text-white text-[10px] font-semibold rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center border-2 border-white">
                    {getCartCount()}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Mobile Search Bar */}
          <form onSubmit={handleSearch} className="sm:hidden mt-3 flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#002D7A] focus-within:border-transparent transition-all">
            <button type="submit" className="text-gray-500 px-3 flex items-center flex-shrink-0">
              <AiOutlineSearch className="text-lg" />
            </button>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search products..."
              className="px-2 py-2 w-full outline-none text-sm bg-transparent"
            />
          </form>
        </div>

        {/* Links - Desktop */}
        <div className="hidden md:block bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="flex items-center gap-6 lg:gap-8 xl:gap-10 py-3 md:py-4">
              {links.map((link) => (
                <Link
                  key={link}
                  to={getLinkPath(link)}
                  onClick={() => setActive(link)}
                  className={`relative whitespace-nowrap font-medium text-sm lg:text-base transition-colors ${
                    active === link 
                      ? "text-[#002D7A] font-semibold" 
                      : "text-gray-700 hover:text-[#002D7A]"
                  }`}
                >
                  {link}
                  {active === link && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#002D7A]"></span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
              onClick={() => setIsOpen(false)}
            ></div>
            
            {/* Sidebar */}
            <div className={`fixed top-0 left-0 h-full w-64 sm:w-72 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
              isOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
              <div className="flex flex-col h-full">
                {/* Sidebar Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <img src={logo} alt="shreeram logo" className="h-8 w-auto" />
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="Close menu"
                  >
                    <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Sidebar Links */}
                <div className="flex-1 overflow-y-auto py-4">
                  {links.map((link) => (
                    <Link
                      key={link}
                      to={getLinkPath(link)}
                      onClick={() => {
                        setActive(link);
                        setIsOpen(false);
                      }}
                      className={`block px-6 py-3 text-base font-medium transition-colors ${
                        active === link
                          ? "bg-[#002D7A]/10 text-[#002D7A] border-l-4 border-[#002D7A]"
                          : "text-gray-700 hover:bg-gray-50 hover:text-[#002D7A]"
                      }`}
                    >
                      {link}
                    </Link>
                  ))}
                </div>

                {/* Sidebar Footer */}
                <div className="p-4 border-t border-gray-200">
                  {customer ? (
                    <div className="text-sm text-gray-600">
                      <p className="font-medium text-gray-800 mb-1">Welcome, {customer.name || customer.email}</p>
                      <button 
                        onClick={() => {
                          setIsOpen(false);
                          handleLogout();
                        }}
                        className="text-red-600 hover:text-red-700 font-medium"
                      >
                        Logout
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Link 
                        to="/login" 
                        onClick={() => setIsOpen(false)}
                        className="block w-full text-center px-4 py-2 bg-[#002D7A] text-white rounded-lg font-medium hover:bg-[#001C4C] transition-colors"
                      >
                        Login
                      </Link>
                      <Link 
                        to="/register" 
                        onClick={() => setIsOpen(false)}
                        className="block w-full text-center px-4 py-2 border border-[#002D7A] text-[#002D7A] rounded-lg font-medium hover:bg-[#002D7A]/5 transition-colors"
                      >
                        Register
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </nav>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2 text-center">Confirm Logout</h3>
            <p className="text-sm text-gray-600 mb-6 text-center">
              Are you sure you want to logout?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Navbar;