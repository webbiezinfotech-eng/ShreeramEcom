import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaHeart, FaEye } from "react-icons/fa";
import { getProducts, canSeePrices, getLoggedInCustomer } from "../services/api";
import { useWishlist } from "../contexts/WishlistContext";
import LoginPrompt from "./LoginPrompt";

export default function FeaturedProducts() {
  const [products, setProducts] = useState([]);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const navigate = useNavigate();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlist();

  // Handle product click - check if logged in
  const handleProductClick = (productId) => {
    const customer = getLoggedInCustomer();
    if (!customer) {
      setShowLoginPrompt(true);
      return;
    }
    navigate(`/product/${productId}`);
  };

  // ✅ Load recent products from API (sorted by id DESC = most recent first)
  useEffect(() => {
    async function fetchProducts() {
      const data = await getProducts(6, 1); // 6 most recent products
      setProducts(data || []);
    }
    fetchProducts();
  }, []);

  return (
    <section className="py-8 sm:py-10 md:py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
          Featured <span className="text-[#FE7F06]">Products</span>
        </h2>
        <p className="mt-2 sm:mt-3 text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
          Discover our most popular wholesale stationery items, trusted by businesses nationwide
        </p>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 mt-6 sm:mt-8">
          {products.length > 0 ? (
            products.map((product) => (
              <div
                key={product.id}
                className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden cursor-pointer group"
                onClick={() => handleProductClick(product.id)}
              >
                <div className="relative h-48 bg-gray-200">
                  {product.image && product.image.trim() !== '' ? (
                    <img
                      src={product.image}
                      alt={product.title || product.name || 'Product'}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const fallback = e.target.nextElementSibling;
                        if (fallback) fallback.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`${product.image && product.image.trim() !== '' ? 'hidden' : ''} w-full h-48 bg-gray-200 flex items-center justify-center absolute inset-0`}>
                    <span className="text-gray-400 text-2xl font-bold">{(product.title || product.name || 'P').charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="absolute top-2 left-2 z-10">
                    <span className="bg-[#FE7F06] text-white text-xs font-medium px-2 py-1 rounded">
                      New Arrival
                    </span>
                  </div>
                  <div className="absolute top-2 right-2 flex flex-col gap-1">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (isInWishlist(product.id)) {
                          await removeFromWishlist(null, product.id);
                        } else {
                          const result = await addToWishlist(product.id);
                          if (result.requiresLogin) {
                            setShowLoginPrompt(true);
                          }
                        }
                      }}
                      className={`p-2 rounded-full shadow-md transition-colors ${
                        isInWishlist(product.id)
                          ? 'bg-red-500 text-white'
                          : 'bg-white text-gray-400 hover:text-red-500'
                      }`}
                      title={isInWishlist(product.id) ? "Remove from wishlist" : "Add to wishlist"}
                    >
                      <FaHeart size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProductClick(product.id);
                      }}
                      className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50"
                    >
                      <FaEye className="text-gray-400 hover:text-blue-500" size={14} />
                    </button>
                  </div>
                </div>

                <div className="p-3 sm:p-4 text-left flex-1 flex flex-col">
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {product.category || product.category_name || 'General'}
                  </span>

                  <h3 className="font-semibold text-gray-800 mt-2 line-clamp-2 text-sm sm:text-base">
                    {product.title || product.name}
                  </h3>

                  <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2 flex-1">
                    {product.description}
                  </p>

                  {canSeePrices() ? (
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-lg font-bold text-[#002D7A]">
                        ₹{product.price}
                      </span>
                      {product.oldPrice && (
                        <>
                          <span className="text-sm text-gray-400 line-through">
                            ₹{product.oldPrice}
                          </span>
                          <span className="text-xs text-green-600 font-medium">
                            {Math.round(
                              ((product.oldPrice - product.price) /
                                product.oldPrice) *
                                100
                            )}
                            % OFF
                          </span>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3">
                      <span className="text-sm text-gray-500 italic">
                        Login to view prices
                      </span>
                    </div>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProductClick(product.id);
                    }}
                    className="mt-3 sm:mt-4 w-full text-center bg-[#FE7F06] hover:bg-[#E66F00] text-white font-medium py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm sm:text-base"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="col-span-3 text-gray-500">Loading products...</p>
          )}
        </div>
      </div>

      {/* Login Prompt */}
      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        message="Please login first to view product details"
      />
    </section>
  );
}
