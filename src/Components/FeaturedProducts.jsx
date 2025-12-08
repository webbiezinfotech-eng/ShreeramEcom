import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaHeart, FaEye, FaShoppingCart, FaPlus, FaMinus } from "react-icons/fa";
import { getProducts, canSeePrices, getLoggedInCustomer } from "../services/api";
import { useWishlist } from "../contexts/WishlistContext";
import { useCart } from "../contexts/CartContext";
import LoginPrompt from "./LoginPrompt";

export default function FeaturedProducts() {
  const [products, setProducts] = useState([]);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [quantities, setQuantities] = useState(() => {
    // Restore quantities from localStorage
    const saved = localStorage.getItem('featured_products_quantities');
    return saved ? JSON.parse(saved) : {};
  });
  const [addingToCart, setAddingToCart] = useState({}); // Track which product is being added
  const [showQuantitySelector, setShowQuantitySelector] = useState(() => {
    // Restore quantity selector visibility from localStorage
    const saved = localStorage.getItem('featured_products_quantity_selectors');
    return saved ? JSON.parse(saved) : {};
  });
  const navigate = useNavigate();
  const { addItemToCart } = useCart();
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

  // Handle quantity change
  const handleQuantityChange = (productId, change) => {
    setQuantities(prev => {
      const currentQty = prev[productId] || 1;
      const newQty = Math.max(1, currentQty + change);
      const updated = { ...prev, [productId]: newQty };
      // Persist to localStorage
      localStorage.setItem('featured_products_quantities', JSON.stringify(updated));
      return updated;
    });
  };

  // Handle direct quantity input
  const handleQuantityInput = (productId, value) => {
    const numValue = parseInt(value) || 1;
    const validQty = Math.max(1, numValue);
    setQuantities(prev => {
      const updated = { ...prev, [productId]: validQty };
      // Persist to localStorage
      localStorage.setItem('featured_products_quantities', JSON.stringify(updated));
      return updated;
    });
  };

  // Handle add to cart button click - show quantity selector
  const handleAddToCartClick = (productId, e) => {
    e.stopPropagation();
    // Show quantity selector for this product
    setShowQuantitySelector(prev => {
      const updated = { ...prev, [productId]: true };
      // Persist to localStorage
      localStorage.setItem('featured_products_quantity_selectors', JSON.stringify(updated));
      return updated;
    });
  };

  // Handle add to cart
  const handleAddToCart = async (product, e) => {
    e.stopPropagation();
    const customer = getLoggedInCustomer();
    if (!customer) {
      setShowLoginPrompt(true);
      return;
    }

    const quantity = quantities[product.id] || 1;
    setAddingToCart(prev => ({ ...prev, [product.id]: true }));

    try {
      e.preventDefault(); // Prevent any form submission or page refresh
      const result = await addItemToCart(product.id, quantity);
      if (result.success) {
        // Notification will be shown by CartContext
        // Don't reset quantity - keep the selected quantity
        // Keep quantity selector visible
        setShowQuantitySelector(prev => {
          const updated = { ...prev, [product.id]: true };
          // Persist to localStorage
          localStorage.setItem('featured_products_quantity_selectors', JSON.stringify(updated));
          return updated;
        });
      } else if (result.requiresLogin) {
        setShowLoginPrompt(true);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setAddingToCart(prev => ({ ...prev, [product.id]: false }));
    }
  };

  // ✅ Load recent products from API (sorted by id DESC = most recent first)
  useEffect(() => {
    async function fetchProducts() {
      const data = await getProducts(6, 1); // 6 most recent products
      // Filter out inactive products
      const activeProducts = (data || []).filter(p => p.status !== 'inactive');
      setProducts(activeProducts);
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
                className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden group cursor-pointer"
                onClick={() => handleProductClick(product.id)}
              >
                <div 
                  className="relative h-48 bg-gray-200"
                >
                  {product.image && product.image.trim() !== '' ? (
                    <img
                      src={product.image}
                      alt={product.title || product.name || 'Product'}
                      className={`w-full h-48 object-cover ${product.status !== 'active' ? 'opacity-50' : ''}`}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const fallback = e.target.nextElementSibling;
                        if (fallback) fallback.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`${product.image && product.image.trim() !== '' ? 'hidden' : ''} w-full h-48 bg-gray-200 flex items-center justify-center absolute inset-0 ${product.status !== 'active' ? 'opacity-50' : ''}`}>
                    <span className="text-gray-400 text-2xl font-bold">{(product.title || product.name || 'P').charAt(0).toUpperCase()}</span>
                  </div>
                  {/* Out of Stock Overlay */}
                  {product.status === 'out_of_stock' && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
                      <span className="bg-red-600 text-white text-sm font-bold px-4 py-2 rounded-lg shadow-lg">
                        OUT OF STOCK
                      </span>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 z-10">
                    {product.status === 'active' ? (
                      <span className="bg-[#FE7F06] text-white text-xs font-medium px-2 py-1 rounded">
                        New Arrival
                      </span>
                    ) : product.status === 'out_of_stock' ? (
                      <span className="bg-red-600 text-white text-xs font-medium px-2 py-1 rounded">
                        Out of Stock
                      </span>
                    ) : null}
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

                  <h3 
                    className="font-semibold text-gray-800 mt-2 line-clamp-2 text-sm sm:text-base hover:text-[#002D7A] transition-colors"
                  >
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

                  {/* Quantity Selector & Add to Cart */}
                  {canSeePrices() && product.status === 'active' && product.status !== 'out_of_stock' ? (
                    <div className="mt-3">
                      {showQuantitySelector[product.id] ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center border border-gray-300 rounded-lg bg-white flex-shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuantityChange(product.id, -1);
                              }}
                              className="p-1.5 hover:bg-gray-50 transition-colors"
                              disabled={(quantities[product.id] || 1) <= 1}
                            >
                              <FaMinus className="text-gray-500" size={10} />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={quantities[product.id] || 1}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleQuantityInput(product.id, e.target.value);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-10 text-center border-0 focus:outline-none focus:ring-0 text-xs font-medium py-1"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuantityChange(product.id, 1);
                              }}
                              className="p-1.5 hover:bg-gray-50 transition-colors"
                            >
                              <FaPlus className="text-gray-500" size={10} />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleAddToCart(product, e)}
                            disabled={addingToCart[product.id]}
                            className="flex-1 bg-[#002D7A] hover:bg-[#001C4C] text-white font-medium py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm sm:text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <FaShoppingCart size={14} />
                            {addingToCart[product.id] ? 'Adding...' : 'Add to Cart'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => handleAddToCartClick(product.id, e)}
                          className="w-full bg-[#002D7A] hover:bg-[#001C4C] text-white font-medium py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm sm:text-base flex items-center justify-center gap-2"
                        >
                          <FaShoppingCart size={14} />
                          Add to Cart
                        </button>
                      )}
                    </div>
                  ) : product.status === 'out_of_stock' ? (
                    <div className="mt-3">
                      <div className="w-full bg-red-100 border border-red-300 text-red-700 font-medium py-2 px-3 sm:px-4 rounded-lg text-sm sm:text-base text-center">
                        Out of Stock
                      </div>
                    </div>
                  ) : null}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProductClick(product.id);
                    }}
                    className="mt-2 w-full text-center bg-[#FE7F06] hover:bg-[#E66F00] text-white font-medium py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm sm:text-base"
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
