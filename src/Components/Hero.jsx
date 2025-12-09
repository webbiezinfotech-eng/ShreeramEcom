import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getCategories } from "../services/api"; 
import { FaTruckFast } from "react-icons/fa6";
import { BsBoxSeam } from "react-icons/bs";
import { MdOutlineVerified } from "react-icons/md";
import { CiBadgeDollar } from "react-icons/ci";
import WelcomePopup from "./WelcomePopup";

// API Base URL for images (should match api.js)
const API_BASE_URL = "http://192.168.1.6:8000";

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
      <section className="bg-gradient-to-r from-[#002D7A] to-[#001C4C] text-white py-6 sm:py-8 md:py-10 lg:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-8 md:gap-10">
          {/* Left Content */}
          <div className="max-w-xl w-full text-center lg:text-left">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Your Trusted <span className="text-[#FE7F06]">Wholesale Partner</span>
            </h2>
            <p className="mt-3 sm:mt-4 md:mt-6 lg:mt-8 text-sm sm:text-base md:text-lg text-gray-100">
              Discover premium stationery supplies at unbeatable wholesale prices. 
              From office essentials to school supplies, we've got everything your business needs.
            </p>
            <div className="mt-4 sm:mt-6 md:mt-8 flex justify-center lg:justify-start gap-3 sm:gap-4">
              <a
                href="/products"
                className="bg-[#FE7F06] hover:bg-[#eb7200] text-white px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base md:text-lg rounded-lg font-semibold transition whitespace-nowrap"
              >
                Browse Products →
              </a>
            </div>
          </div>

          {/* Right Features */}
          <div className="grid grid-cols-2 border border-[#ffffff5c] gap-4 sm:gap-6 md:gap-8 lg:gap-12 xl:gap-16 p-6 sm:p-8 md:p-12 lg:p-16 rounded-xl sm:rounded-2xl shadow-lg bg-[#ffffff38] w-full max-w-md lg:max-w-none">
            <div className="flex flex-col items-center text-center">
              <BsBoxSeam size={24} className="sm:w-7 sm:h-7 md:w-8 md:h-8" />
              <p className="mt-1 sm:mt-2 text-xs sm:text-sm md:text-base font-semibold">10,000+ Products</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <FaTruckFast size={24} className="sm:w-7 sm:h-7 md:w-8 md:h-8" />
              <p className="mt-1 sm:mt-2 text-xs sm:text-sm md:text-base font-semibold">Fast Delivery</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <MdOutlineVerified size={24} className="sm:w-7 sm:h-7 md:w-8 md:h-8" />
              <p className="mt-1 sm:mt-2 text-xs sm:text-sm md:text-base font-semibold">Quality Guaranteed</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <CiBadgeDollar size={24} className="sm:w-7 sm:h-7 md:w-8 md:h-8" />
              <p className="mt-1 sm:mt-2 text-xs sm:text-sm md:text-base font-semibold">Best Prices</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-8 sm:py-10 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
            Shop By <span className="text-[#FE7F06]">Category</span>
          </h2>
          <p className="mt-2 sm:mt-3 text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
            Explore our comprehensive range of stationery categories, carefully curated for your business needs
          </p>

          {/* Category Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5 md:gap-6 mt-6 sm:mt-8 md:mt-10 lg:mt-12">
            {categories.length > 0 ? (
              categories.map((cat, index) => {
                // Use category ID for routing (most reliable)
                const categoryId = cat.id;
                if (!categoryId) return null; // Skip if no ID
                return (
                  <Link key={cat.id || index} to={`/category/${categoryId}`} className="block">
                    <div className="rounded-xl shadow-md md:shadow-lg border border-[#003fad2c] p-4 md:px-2 flex flex-col items-center hover:shadow-xl transition-shadow">
                      {cat.image ? (
                        <div className="w-16 h-16 rounded-full overflow-hidden mb-4 border-2 border-[#003fad23]">
                          <img 
                            src={`${API_BASE_URL}/api/uploads/${cat.image}`}
                            alt={cat.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = '<div class="w-16 h-16 bg-[#003fad23] rounded-full flex items-center justify-center">🎨</div>';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-[#003fad23] rounded-full flex items-center justify-center mb-4">
                          🎨
                        </div>
                      )}
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
