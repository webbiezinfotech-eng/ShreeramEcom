import React, { useState, useEffect } from "react";
import {
  FaSearch,
  FaFilter,
  FaShoppingCart,
  FaStar,
  FaHeart,
  FaEye,
  FaPlus,
  FaMinus,
} from "react-icons/fa";
import { Link, useSearchParams } from "react-router-dom";
import { getProducts, getCategories, canSeePrices } from "../services/api";
import { useCart } from "../contexts/CartContext";
import { useWishlist } from "../contexts/WishlistContext";
import Toast from "./Toast";
import LoginPrompt from "./LoginPrompt";

function ProductsPage() {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('q') || "";
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [categories, setCategories] = useState([]);
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [sortBy, setSortBy] = useState("featured");
  const [showFilters, setShowFilters] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ isOpen: false, message: "", type: "success" });
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [quantities, setQuantities] = useState(() => {
    // Restore quantities from localStorage
    const saved = localStorage.getItem('products_page_quantities');
    return saved ? JSON.parse(saved) : {};
  });
  const [addingToCart, setAddingToCart] = useState({}); // Track which product is being added
  const [showQuantitySelector, setShowQuantitySelector] = useState(() => {
    // Restore quantity selector visibility from localStorage
    const saved = localStorage.getItem('products_page_quantity_selectors');
    return saved ? JSON.parse(saved) : {};
  });
  const { addItemToCart, getCartCount } = useCart();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlist();

  // ✅ Fetch categories from backend
  useEffect(() => {
    async function fetchCategories() {
      try {
        const cats = await getCategories();
        setCategories(cats || []);
      } catch (error) {
        // Silently handle error
      }
    }
    fetchCategories();
  }, []);

  // ✅ Fetch products from backend with debouncing for search
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await getProducts(null, 1, searchTerm);
        setProducts(data || []);
      } catch (error) {
        // Silently handle error
      } finally {
        setLoading(false);
      }
    }, searchTerm ? 300 : 0); // 300ms debounce for search, no delay for initial load

    return () => clearTimeout(timeoutId);
  }, [searchTerm, initialSearch]);

  // ✅ Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase());

    // Match category by name or category_id
    let matchesCategory = true;
    if (selectedCategory !== "All") {
      if (typeof selectedCategory === 'number' || !isNaN(selectedCategory)) {
        // If selectedCategory is a number (category ID)
        matchesCategory = product.category_id === parseInt(selectedCategory);
      } else {
        // If selectedCategory is a string (category name)
        matchesCategory = product.category?.toLowerCase() === selectedCategory.toLowerCase() ||
                         product.category_name?.toLowerCase() === selectedCategory.toLowerCase();
      }
    }

    const matchesPrice =
      product.price >= priceRange[0] && product.price <= priceRange[1];

    return matchesSearch && matchesCategory && matchesPrice;
  });

  // ✅ Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return a.price - b.price;
      case "price-high":
        return b.price - a.price;
      case "rating":
        return (b.rating || 0) - (a.rating || 0);
      case "name":
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });

  // Handle quantity change
  const handleQuantityChange = (productId, change) => {
    setQuantities(prev => {
      const currentQty = prev[productId] || 1;
      const newQty = Math.max(1, currentQty + change);
      const updated = { ...prev, [productId]: newQty };
      // Persist to localStorage
      localStorage.setItem('products_page_quantities', JSON.stringify(updated));
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
      localStorage.setItem('products_page_quantities', JSON.stringify(updated));
      return updated;
    });
  };

  // Handle add to cart button click - show quantity selector
  const handleAddToCartClick = (productId) => {
    // Show quantity selector for this product
    setShowQuantitySelector(prev => {
      const updated = { ...prev, [productId]: true };
      // Persist to localStorage
      localStorage.setItem('products_page_quantity_selectors', JSON.stringify(updated));
      return updated;
    });
  };

  // ✅ Cart functions
  const addToCart = async (product, e) => {
    if (e) {
      e.preventDefault(); // Prevent any form submission or page refresh
      e.stopPropagation();
    }
    
    const quantity = quantities[product.id] || 1;
    setAddingToCart(prev => ({ ...prev, [product.id]: true }));
    
    try {
      const result = await addItemToCart(product.id, quantity);
      if (result.success) {
        // Notification will be shown by CartContext
        setToast({ isOpen: true, message: `${product.title || product.name} (${quantity} qty) added to cart!`, type: "success" });
        // Don't reset quantity - keep the selected quantity
        // Keep quantity selector visible
        setShowQuantitySelector(prev => {
          const updated = { ...prev, [product.id]: true };
          // Persist to localStorage
          localStorage.setItem('products_page_quantity_selectors', JSON.stringify(updated));
          return updated;
        });
      } else {
        if (result.requiresLogin) {
          setShowLoginPrompt(true);
        } else {
          setToast({ isOpen: true, message: 'Failed to add to cart: ' + result.error, type: "error" });
        }
      }
    } catch (error) {
      setToast({ isOpen: true, message: 'Failed to add to cart', type: "error" });
    } finally {
      setAddingToCart(prev => ({ ...prev, [product.id]: false }));
    }
  };

  // Skeleton loader component
  const ProductSkeleton = () => (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden animate-pulse">
      <div className="h-48 bg-gray-200"></div>
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="h-5 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#002D7A] to-[#001C4C] text-white py-8 sm:py-10 lg:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
              All Products
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-blue-100">
              Discover our complete range of stationery and office supplies
            </p>
          </div>
        </div>
      </div>

      {/* Main Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <div
            className={`lg:w-1/4 ${showFilters ? "block" : "hidden lg:block"}`}
          >
            <div className="bg-white border border-gray-200 rounded-lg p-6 sticky top-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-[#002D7A]">
                  Filters
                </h3>
                <button
                  onClick={() => setShowFilters(false)}
                  className="lg:hidden text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {/* Search */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Products
                </label>
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search products..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002D7A] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002D7A] focus:border-transparent"
                >
                  <option value="All">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price Range: ₹{priceRange[0]} - ₹{priceRange[1]}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  value={priceRange[1]}
                  onChange={(e) =>
                    setPriceRange([priceRange[0], parseInt(e.target.value)])
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>₹0</span>
                  <span>₹1000</span>
                </div>
              </div>

              {/* Sort */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002D7A] focus:border-transparent"
                >
                  <option value="featured">Featured</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="name">Name A-Z</option>
                </select>
              </div>
            </div>
          </div>

          {/* Products List */}
          <div className="lg:w-3/4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowFilters(true)}
                  className="lg:hidden flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <FaFilter />
                  Filters
                </button>
                <div className="text-sm text-gray-600">
                  {sortedProducts.length} products found
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Cart:</span>
                <div className="flex items-center gap-2 bg-[#002D7A] text-white px-3 py-1 rounded-full">
                  <FaShoppingCart size={14} />
                  <span className="text-sm font-medium">{getCartCount()}</span>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
              {loading && sortedProducts.length === 0 ? (
                // Show skeleton loaders while loading (only if no products yet)
                Array.from({ length: 6 }).map((_, index) => (
                  <ProductSkeleton key={`skeleton-${index}`} />
                ))
              ) : sortedProducts.length > 0 ? (
                sortedProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
                >
                  <div className="relative h-48 bg-gray-200">
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
                    {product.status !== 'active' && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
                        <span className="bg-red-600 text-white text-sm font-bold px-4 py-2 rounded-lg shadow-lg">
                          OUT OF STOCK
                        </span>
                      </div>
                    )}
                    <div className="absolute top-2 left-2 z-10">
                      {product.status === 'active' ? (
                        <span className="bg-[#FE7F06] text-white text-xs font-medium px-2 py-1 rounded">
                          Best Seller
                        </span>
                      ) : (
                        <span className="bg-red-600 text-white text-xs font-medium px-2 py-1 rounded">
                          Out of Stock
                        </span>
                      )}
                    </div>
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
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
                      <Link
                        to={`/product/${product.id}`}
                        className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50"
                      >
                        <FaEye className="text-gray-400 hover:text-blue-500" />
                      </Link>
                    </div>
                  </div>

                  <div className="p-3 sm:p-4 flex-1 flex flex-col">
                    <div className="mb-2">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {product.category || product.category_name || 'General'}
                      </span>
                    </div>

                    <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2 text-sm sm:text-base">
                      {product.title || product.name}
                    </h3>

                    <p className="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2 flex-1">
                      {product.description}
                    </p>

                    <div className="flex items-center mb-3">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <FaStar
                          key={index}
                          className={`text-sm ${
                            index < Math.floor(product.rating || 0)
                              ? "text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                      <span className="text-sm text-gray-600 ml-2">
                        ({product.rating || 0})
                      </span>
                    </div>

                    {canSeePrices() ? (
                      <div className="flex items-center gap-2 mb-4">
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
                      <div className="mb-4">
                        <span className="text-sm text-gray-500 italic">
                          Login to view prices
                        </span>
                      </div>
                    )}

                    <div className="space-y-2 mt-auto">
                      <Link
                        to={`/product/${product.id}`}
                        className="w-full bg-[#002D7A] hover:bg-[#001C4C] text-white font-medium py-2 px-3 sm:px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm sm:text-base"
                      >
                        <FaEye size={14} className="sm:w-4 sm:h-4" />
                        View Details
                      </Link>
                      
                      {/* Quantity Selector & Add to Cart */}
                      {canSeePrices() && product.status === 'active' ? (
                        <div>
                          {showQuantitySelector[product.id] ? (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center border border-gray-300 rounded-lg bg-white flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
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
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleQuantityInput(product.id, e.target.value);
                                  }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  className="w-10 text-center border-0 focus:outline-none focus:ring-0 text-xs font-medium py-1"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
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
                                onClick={(e) => addToCart(product, e)}
                                disabled={addingToCart[product.id]}
                                className="flex-1 bg-[#FE7F06] hover:bg-[#E66F00] text-white font-medium py-2 px-3 sm:px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <FaShoppingCart size={14} className="sm:w-4 sm:h-4" />
                                {addingToCart[product.id] ? 'Adding...' : 'Add to Cart'}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAddToCartClick(product.id);
                              }}
                              className="w-full bg-[#FE7F06] hover:bg-[#E66F00] text-white font-medium py-2 px-3 sm:px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm sm:text-base"
                            >
                              <FaShoppingCart size={14} className="sm:w-4 sm:h-4" />
                              Add to Cart
                            </button>
                          )}
                        </div>
                      ) : product.status !== 'active' ? (
                        <div className="w-full bg-red-100 border border-red-300 text-red-700 font-medium py-2 px-3 sm:px-4 rounded-lg text-sm sm:text-base text-center">
                          Out of Stock
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
              ) : null}
            </div>

            {/* No Results */}
            {!loading && sortedProducts.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <FaSearch size={48} className="mx-auto" />
                </div>
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  No products found
                </h3>
                <p className="text-gray-500">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <Toast
        isOpen={toast.isOpen}
        onClose={() => setToast({ ...toast, isOpen: false })}
        message={toast.message}
        type={toast.type}
      />

      {/* Login Prompt */}
      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        message="Please login first to add products to your wishlist"
      />
    </div>
  );
}

export default ProductsPage;