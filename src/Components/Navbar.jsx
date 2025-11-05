import React, { useState, useEffect } from "react";
import { FaPhoneAlt } from "react-icons/fa";
import { AiOutlineShoppingCart, AiOutlineSearch } from "react-icons/ai";
import { FiUser } from "react-icons/fi";
import { useCart } from "../contexts/CartContext";
import logo from "../assets/srlogo.png";

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [active, setActive] = useState("Home");
  const { getCartCount } = useCart();

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
          <a href="/login" className="hover:underline">Login</a>
          <a href="/register" className="hover:underline">Register</a>
        </div>
      </div>

      {/* Navbar */}
      <nav className="max-w-auto">
        <div className="bg-white border-b border-[#0000003d] px-4 md:px-16 py-3 flex items-center justify-between">
          {/* Logo */}
          <a href="/">
            <img src={logo} alt="shreeram logo" className="h-6 md:h-10" />
          </a>

          {/* Search */}
          <div className="flex items-center w-1/3 border rounded overflow-hidden">
            <button className="text-black px-4 flex items-center">
              <AiOutlineSearch />
            </button>
            <input
              type="text"
              placeholder="Search Shreeram Stationery"
              className="px-3 py-2 w-full outline-none"
            />
          </div>

          {/* Icons */}
          <div className="flex items-center gap-6">
            <a href="/profile" className="flex items-center gap-2">
              <FiUser size={20} />
            </a>
            <a href="/cart" className="relative">
              <AiOutlineShoppingCart size={22} />
              <span className="absolute -top-2 -right-2 bg-[#FE7F06] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {getCartCount()}
              </span>
            </a>
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
                <a
                  key={link}
                  href={
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
                </a>
              ))}
            </div>
          </div>

          {/* Links for mobile */}
          {isOpen && (
            <div className="md:hidden flex flex-col gap-4 px-4 pb-4 font-medium">
              {links.map((link) => (
                <a
                  key={link}
                  href={
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
                </a>
              ))}
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}

export default Navbar;