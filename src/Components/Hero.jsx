import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getCategories } from "../services/api"; 
import { FaTruckFast } from "react-icons/fa6";
import { BsBoxSeam } from "react-icons/bs";
import { MdOutlineVerified } from "react-icons/md";
import { CiBadgeDollar } from "react-icons/ci";
import { FaWhatsapp } from "react-icons/fa";
import WelcomePopup from "./WelcomePopup";

function Hero() {
  const [categories, setCategories] = useState([]);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [welcomeData, setWelcomeData] = useState(null);

  // 🔹 Fetch categories from API
  useEffect(() => {
    async function fetchData() {
      const data = await getCategories();
      setCategories(data);
    }
    fetchData();
  }, []);

  // 🔹 Check for welcome popup on mount
  useEffect(() => {
    const welcomeInfo = localStorage.getItem('show_welcome_popup');
    if (welcomeInfo) {
      try {
        const data = JSON.parse(welcomeInfo);
        // Only show if it's recent (within last 5 seconds)
        if (Date.now() - data.timestamp < 5000) {
          setWelcomeData(data);
          setShowWelcomePopup(true);
        }
        // Remove from localStorage
        localStorage.removeItem('show_welcome_popup');
      } catch (e) {
        localStorage.removeItem('show_welcome_popup');
      }
    }
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#002D7A] to-[#001C4C] text-white py-5 sm:py-12">
        <div className="max-w-auto md:mx-12 sm:py-5 md:py-10 px-4 flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Left Content */}
          <div className="max-w-xl">
            <h2 className="text-4xl md:text-6xl font-bold leading-tight">
              Your Trusted <span className="text-[#FE7F06]">Wholesale Partner</span>
            </h2>
            <p className="mt-4 md:mt-8 text-lg text-gray-100">
              Discover premium stationery supplies at unbeatable wholesale prices. 
              From office essentials to school supplies, we've got everything your business needs.
            </p>
            <div className="mt-6 md:mt-8 flex gap-4">
              <a
                href="/products"
                className="bg-[#FE7F06] hover:bg-[#eb7200] text-white p-2 md:px-6 md:py-3 sm:text-lg rounded-lg font-semibold transition"
              >
                Browse Products →
              </a>
            </div>
          </div>

          {/* Right Features */}
          <div className="grid grid-cols-2 border border-[#ffffff5c] gap-6 md:gap-16 p-8 md:p-16 rounded-2xl shadow-lg bg-[#ffffff38]">
            <div className="flex flex-col items-center text-center">
              <BsBoxSeam size={28} />
              <p className="mt-2 font-semibold">10,000+ Products</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <FaTruckFast size={28} />
              <p className="mt-2 font-semibold">Fast Delivery</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <MdOutlineVerified size={28} />
              <p className="mt-2 font-semibold">Quality Guaranteed</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <CiBadgeDollar size={28} />
              <p className="mt-2 font-semibold">Best Prices</p>
            </div>
          </div>
        </div>

        {/* WhatsApp Floating Button */}
        <a
          href="https://wa.me/91XXXXXXXXXX"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 bg-green-500 p-3 rounded-full shadow-lg text-white"
        >
          <FaWhatsapp size={26} />
        </a>
      </section>

      {/* Categories Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 md:py-10 text-center">
          <h2 className="text-3xl md:text-5xl font-bold leading-tight">
            Shop By <span className="text-[#FE7F06]">Category</span>
          </h2>
          <p className="mt-2">
            Explore our comprehensive range of stationery categories, carefully curated for your business needs
          </p>

          {/* Category Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mt-8 md:mt-12">
            {categories.length > 0 ? (
              categories.map((cat, index) => {
                // Use category ID for routing (most reliable)
                const categoryId = cat.id;
                if (!categoryId) return null; // Skip if no ID
                return (
                  <Link key={cat.id || index} to={`/category/${categoryId}`} className="block">
                    <div className="rounded-xl shadow-md md:shadow-lg border border-[#003fad2c] p-4 md:px-2 flex flex-col items-center hover:shadow-xl transition-shadow">
                      <div className="w-12 h-12 bg-[#003fad23] rounded-full flex items-center justify-center mb-4">
                        🎨
                      </div>
                      <h3 className="font-semibold">{cat.name}</h3>
                      <p className="text-gray-500 text-sm">
                        {cat.items_count ? `${cat.items_count}+ items` : "Explore"}
                      </p>
                    </div>
                  </Link>
                );
              }).filter(Boolean)
            ) : (
              <p className="col-span-6 text-gray-500">Loading categories...</p>
            )}
          </div>
        </div>
      </section>

      {/* Welcome Popup */}
      {welcomeData && (
        <WelcomePopup
          isOpen={showWelcomePopup}
          onClose={() => {
            setShowWelcomePopup(false);
            setWelcomeData(null);
          }}
          customerName={welcomeData.customerName}
          isFirstTime={welcomeData.isFirstTime}
        />
      )}
    </div>
  );
}

export default Hero;
