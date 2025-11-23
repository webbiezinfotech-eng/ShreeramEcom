import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaHeart } from "react-icons/fa";
import { getProducts } from "../services/api";
import { useWishlist } from "../contexts/WishlistContext";
import LoginPrompt from "./LoginPrompt";

export default function FeaturedProducts() {
  const [products, setProducts] = useState([]);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlist();

  // ✅ Load products from API
  useEffect(() => {
    async function fetchProducts() {
      const data = await getProducts(6); // 6 products dikhao
      setProducts(data || []);
    }
    fetchProducts();
  }, []);

  return (
    <section className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-5xl font-bold leading-tight">
          Featured <span className="text-[#FE7F06]">Products</span>
        </h2>
        <p className="mt-2 text-gray-600">
          Discover our most popular wholesale stationery items, trusted by businesses nationwide
        </p>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {products.length > 0 ? (
            products.map((product) => (
              <div
                key={product.id}
                className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="relative">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-full h-48 object-cover bg-gray-200"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const fallback = e.target.nextElementSibling;
                        if (fallback) fallback.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`${product.image ? 'hidden' : ''} w-full h-48 bg-gray-200 flex items-center justify-center absolute inset-0`}>
                    <span className="text-gray-400 text-2xl font-bold">{product.title?.charAt(0) || 'P'}</span>
                  </div>
                  <div className="absolute top-2 left-2">
                    <span className="bg-[#FE7F06] text-white text-xs font-medium px-2 py-1 rounded">
                      Best Seller
                    </span>
                  </div>
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={async () => {
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
                  </div>
                </div>

                <div className="p-4 text-left">
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {product.category}
                  </span>

                  <h3 className="font-semibold text-gray-800 mt-2 line-clamp-2">
                    {product.title}
                  </h3>

                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {product.description}
                  </p>

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

                  <Link
                    to={`/product/${product.id}`}
                    className="mt-4 block text-center bg-[#FE7F06] hover:bg-[#E66F00] text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    View Details
                  </Link>
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
        message="Please login first to add products to your wishlist"
      />
    </section>
  );
}
