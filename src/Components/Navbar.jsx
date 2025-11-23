import React, { useState, useEffect } from "react";
import { FaPhoneAlt, FaHeart } from "react-icons/fa";
import { AiOutlineShoppingCart, AiOutlineSearch } from "react-icons/ai";
import { FiUser } from "react-icons/fi";
import { useCart } from "../contexts/CartContext";
import { useWishlist } from "../contexts/WishlistContext";
import { getLoggedInCustomer, logoutCustomer } from "../services/api";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/srlogo.png";

function Navbar() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [active, setActive] = useState("Home");
  const [searchQuery, setSearchQuery] = useState("");
  const [customer, setCustomer] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { getCartCount } = useCart();
  const { getWishlistCount } = useWishlist();

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

  // Auto-detect active page based on current URL
  useEffect(() => {
    const currentPath = window.location.pathname;

    if (currentPath === "/") {
      setActive("Home");
    } else if (currentPath === "/products") {
      setActive("All Products");
    } else if (currentPath === "/category/office-supplies") {
      setActive("Office Supplies");
    } else if (currentPath === "/category/school-supplies") {
      setActive("School Supplies");
    } else if (currentPath === "/category/writing-instruments") {
      setActive("Writing Instruments");
    } else if (currentPath === "/category/paper-products") {
      setActive("Paper Products");
    } else if (currentPath === "/about") {
      setActive("About");
    } else if (currentPath === "/contact") {
      setActive("Contact");
    } else {
      setActive("Home");
    }
  }, []);

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
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

  const links = [
    "Home",
    "All Products",
    "Office Supplies",
    "School Supplies",
    "Writing Instruments",
    "Paper Products",
    "About",
    "Contact",
  ];

  return (
    <div>
      {/* Top Bar */}
      <div className="bg-[#0b1b35] text-white text-sm md:text-[17px] py-2 md:py-4 px-4 md:px-10 lg:px-16 flex-wrap sm:flex justify-between items-center">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2">
            <FaPhoneAlt className="text-[#FE7F06]" /> +91 7304044465
          </span>
          
        </div>
        <div className="flex items-center gap-4">
          {customer ? (
            <>
              <span className="text-sm">Welcome, {customer.name || customer.email}</span>
              <button onClick={handleLogout} className="hover:underline">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:underline">Login</Link>
              <Link to="/register" className="hover:underline">Register</Link>
            </>
          )}
        </div>
      </div>

      {/* Navbar */}
      <nav className="max-w-auto">
        <div className="bg-white border-b border-[#0000003d] px-4 md:px-16 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link to="/">
            <img src={logo} alt="shreeram logo" className="h-6 md:h-10" />
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex items-center w-1/3 border rounded overflow-hidden">
            <button type="submit" className="text-black px-4 flex items-center">
              <AiOutlineSearch />
            </button>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Shreeram Stationery"
              className="px-3 py-2 w-full outline-none"
            />
          </form>

          {/* Icons */}
          <div className="flex items-center gap-6">
            <Link to="/profile" className="flex items-center gap-2">
              <FiUser size={20} />
            </Link>
            <Link 
              to="/profile" 
              onClick={(e) => {
                e.preventDefault();
                navigate('/profile');
                // Set wishlist tab active after navigation
                setTimeout(() => {
                  const event = new CustomEvent('switchToWishlistTab');
                  window.dispatchEvent(event);
                }, 100);
              }}
              className="relative"
              title="Wishlist"
            >
              <FaHeart size={20} className="text-gray-700 hover:text-red-500 transition-colors" />
              {getWishlistCount() > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {getWishlistCount()}
                </span>
              )}
            </Link>
            <Link to="/cart" className="relative">
              <AiOutlineShoppingCart size={22} />
              <span className="absolute -top-2 -right-2 bg-[#FE7F06] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {getCartCount()}
              </span>
            </Link>
          </div>
        </div>

        {/* Links */}
        <div className="bg-white shadow">
          <div className="max-w-auto md:mx-12 px-4 flex gap-6 md:gap-12 py-2 md:py-5">
            {/* Toggle Button for mobile */}
            <button
              className="md:hidden p-2 border rounded"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? "✖" : "☰"}
            </button>

            {/* Links for desktop */}
            <div className="hidden md:flex gap-6 font-medium">
              {links.map((link) => (
                <Link
                  key={link}
                  to={
                    link === "Home" ? "/" :
                    link === "All Products" ? "/products" :
                    link === "Office Supplies" ? "/category/office-supplies" :
                    link === "School Supplies" ? "/category/school-supplies" :
                    link === "Writing Instruments" ? "/category/writing-instruments" :
                    link === "Paper Products" ? "/category/paper-products" :
                    link === "About" ? "/about" :
                    link === "Contact" ? "/contact" :
                    "#"
                  }
                  onClick={() => setActive(link)}
                  className={`${
                    active === link ? "text-[#002D7A] underline decoration-2 underline-offset-4 font-bold" : "text-gray-700"
                  } hover:text-[#002D7A] transition-colors`}
                >
                  {link}
                </Link>
              ))}
            </div>
          </div>

          {/* Links for mobile */}
          {isOpen && (
            <div className="md:hidden flex flex-col gap-4 px-4 pb-4 font-medium">
              {links.map((link) => (
                <Link
                  key={link}
                  to={
                    link === "Home" ? "/" :
                    link === "All Products" ? "/products" :
                    link === "Office Supplies" ? "/category/office-supplies" :
                    link === "School Supplies" ? "/category/school-supplies" :
                    link === "Writing Instruments" ? "/category/writing-instruments" :
                    link === "Paper Products" ? "/category/paper-products" :
                    link === "About" ? "/about" :
                    link === "Contact" ? "/contact" :
                    "#"
                  }
                  onClick={() => {
                    setActive(link);
                    setIsOpen(false);
                  }}
                  className={`${
                    active === link ? "text-[#002D7A] underline decoration-2 underline-offset-4 font-bold" : "text-gray-700"
                  } hover:text-[#002D7A] transition-colors`}
                >
                  {link}
                </Link>
              ))}
            </div>
          )}
        </div>
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