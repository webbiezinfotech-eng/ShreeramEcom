import React, { useState, useEffect, useRef } from "react";
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
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { getProducts, getCategories, canSeePrices, getLoggedInCustomer } from "../services/api";
import { useCart } from "../contexts/CartContext";
import { useWishlist } from "../contexts/WishlistContext";
import Toast from "./Toast";
import LoginPrompt from "./LoginPrompt";

function ProductsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('q') || "";
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [categories, setCategories] = useState([]);
  const [sortBy, setSortBy] = useState("name"); // Default to A-Z
  const [showFilters, setShowFilters] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ isOpen: false, message: "", type: "success" });
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [quantities, setQuantities] = useState({});
  const [addingToCart, setAddingToCart] = useState({}); // Track which product is being added
  const [showQuantitySelector, setShowQuantitySelector] = useState({});
  
  // Debounce timer ref for input field
  const inputDebounceTimer = useRef({});
  const { addItemToCart, getCartCount, cartItems, updateItemQuantity } = useCart();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlist();
  
  // Check if product is already in cart and get cart item
  const isInCart = (productId) => {
    return cartItems.some(item => item.product_id === productId || item.id === productId);
  };
  
  // Get cart item for a product
  const getCartItem = (productId) => {
    return cartItems.find(item => item.product_id === productId || item.id === productId);
  };

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

  // Sync quantities from cart items when cart loads
  useEffect(() => {
    if (cartItems.length > 0) {
      const newQuantities = {};
      const newSelectors = {};
      
      cartItems.forEach(item => {
        const productId = item.product_id || item.id;
        if (productId) {
          newQuantities[productId] = item.quantity || 1;
          newSelectors[productId] = true; // Show selector for items in cart
        }
      });
      
      setQuantities(prev => ({ ...prev, ...newQuantities }));
      setShowQuantitySelector(prev => ({ ...prev, ...newSelectors }));
    } else {
      // If cart is empty, clear all quantities and selectors
      setQuantities({});
      setShowQuantitySelector({});
    }
  }, [cartItems]);

  // ✅ Filter products
  const filteredProducts = products.filter((product) => {
    // Hide inactive products completely
    if (product.status === 'inactive') {
      return false;
    }

    // Enhanced search - check name, title, description, category, brand, SKU
    const searchLower = searchTerm.toLowerCase().trim();
    const matchesSearch = !searchLower || 
      (product.title || product.name || '').toLowerCase().includes(searchLower) ||
      (product.description || '').toLowerCase().includes(searchLower) ||
      (product.category || product.category_name || '').toLowerCase().includes(searchLower) ||
      (product.brand || '').toLowerCase().includes(searchLower) ||
      (product.sku || '').toLowerCase().includes(searchLower);

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

    return matchesSearch && matchesCategory;
  });

  // ✅ Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "price-low": {
        return (parseFloat(a.price || 0)) - (parseFloat(b.price || 0));
      }
      case "price-high": {
        return (parseFloat(b.price || 0)) - (parseFloat(a.price || 0));
      }
      case "rating": {
        return (b.rating || 0) - (a.rating || 0);
      }
      case "name": {
        const nameA = (a.title || a.name || '').toLowerCase();
        const nameB = (b.title || b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      }
      default: {
        // Default to A-Z sorting
        const defaultNameA = (a.title || a.name || '').toLowerCase();
        const defaultNameB = (b.title || b.name || '').toLowerCase();
        return defaultNameA.localeCompare(defaultNameB);
      }
    }
  });

  // Handle quantity change - update cart immediately if item is in cart
  const handleQuantityChange = async (productId, change) => {
    const customer = getLoggedInCustomer();
    if (!customer) {
      setShowLoginPrompt(true);
      return;
    }

    // Calculate new quantity - get from cart item if exists, otherwise from state
    const existingCartItem = getCartItem(productId);
    const currentQty = existingCartItem ? existingCartItem.quantity : (quantities[productId] || 1);
    const newQty = Math.max(0, currentQty + change); // Allow 0 to remove item
    
    // Update local state (don't save to localStorage - sync from cart instead)
    setQuantities(prev => ({ ...prev, [productId]: newQty }));
    
    // If item is in cart, update cart immediately (quantity 0 will remove it)
    if (existingCartItem) {
      const cartItemId = existingCartItem.cart_id || existingCartItem.id;
      try {
        await updateItemQuantity(cartItemId, newQty);
        // If quantity becomes 0, hide the selector
        if (newQty === 0) {
          setShowQuantitySelector(prev => {
            const updated = { ...prev };
            delete updated[productId];
            return updated;
          });
        }
      } catch (error) {
        console.error('Error updating cart quantity:', error);
      }
    }
  };

  // Handle direct quantity input - update cart with debounce if item is in cart
  const handleQuantityInput = async (productId, value) => {
    const customer = getLoggedInCustomer();
    if (!customer) {
      setShowLoginPrompt(true);
      return;
    }

    // Allow empty string for typing, but treat invalid values as 0
    const numValue = value === '' ? 0 : parseInt(value);
    const validQty = isNaN(numValue) ? 0 : Math.max(0, numValue); // Allow 0 to remove item
    
    // Update local state immediately (don't save to localStorage - sync from cart instead)
    setQuantities(prev => ({ ...prev, [productId]: validQty }));
    
    // Clear previous timer
    if (inputDebounceTimer.current[productId]) {
      clearTimeout(inputDebounceTimer.current[productId]);
    }
    
    // Debounce cart update - wait 500ms after user stops typing
    inputDebounceTimer.current[productId] = setTimeout(async () => {
      // If item is in cart, update cart (quantity 0 will remove it)
      const cartItem = getCartItem(productId);
      if (cartItem) {
        const cartItemId = cartItem.cart_id || cartItem.id;
        try {
          await updateItemQuantity(cartItemId, validQty);
          // If quantity becomes 0, hide the selector
          if (validQty === 0) {
            setShowQuantitySelector(prev => {
              const updated = { ...prev };
              delete updated[productId];
              return updated;
            });
          }
        } catch (error) {
          console.error('Error updating cart quantity:', error);
        }
      }
    }, 500);
  };

  // Handle add to cart button click - directly add 1 quantity if not in cart, otherwise show selector
  const handleAddToCartClick = async (productId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const customer = getLoggedInCustomer();
    if (!customer) {
      setShowLoginPrompt(true);
      return;
    }
    
    // If product is already in cart, show quantity selector to add more
    if (isInCart(productId)) {
      setShowQuantitySelector(prev => ({ ...prev, [productId]: true }));
      return;
    }
    
    // If not in cart, directly add 1 quantity
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    setAddingToCart(prev => ({ ...prev, [productId]: true }));
    
    try {
      const result = await addItemToCart(productId, 1);
      if (result.success) {
        // Set quantity to 1 for this product (don't save to localStorage)
        setQuantities(prev => ({ ...prev, [productId]: 1 }));
        // Show quantity selector so user can add more if needed (don't save to localStorage)
        setShowQuantitySelector(prev => ({ ...prev, [productId]: true }));
      } else if (result.requiresLogin) {
        setShowLoginPrompt(true);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setAddingToCart(prev => ({ ...prev, [productId]: false }));
    }
  };

  // ✅ Cart functions - update if already in cart, otherwise add
  const addToCart = async (product, e) => {
    if (e) {
      e.preventDefault(); // Prevent any form submission or page refresh
      e.stopPropagation();
    }
    
    const quantity = quantities[product.id] || 1;
    setAddingToCart(prev => ({ ...prev, [product.id]: true }));
    
    try {
      // Check if product is already in cart
      const cartItem = getCartItem(product.id);
      
      if (cartItem) {
        // Update existing cart item quantity
        const cartItemId = cartItem.cart_id || cartItem.id;
        const result = await updateItemQuantity(cartItemId, quantity);
        if (result.success) {
          // Notification will be updated by CartContext
          setToast({ isOpen: true, message: `${product.title || product.name} quantity updated to ${quantity}!`, type: "success" });
          // Keep quantity selector visible (don't save to localStorage)
          setShowQuantitySelector(prev => ({ ...prev, [product.id]: true }));
        } else {
          setToast({ isOpen: true, message: 'Failed to update cart', type: "error" });
        }
      } else {
        // Add new item to cart
        const result = await addItemToCart(product.id, quantity);
        if (result.success) {
          // Notification will be shown by CartContext
          setToast({ isOpen: true, message: `${product.title || product.name} (${quantity} qty) added to cart!`, type: "success" });
          // Keep quantity selector visible (don't save to localStorage)
          setShowQuantitySelector(prev => ({ ...prev, [product.id]: true }));
        } else {
          if (result.requiresLogin) {
            setShowLoginPrompt(true);
          } else {
            setToast({ isOpen: true, message: 'Failed to add to cart: ' + result.error, type: "error" });
          }
        }
      }
    } catch (error) {
      setToast({ isOpen: true, message: 'Failed to update cart', type: "error" });
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
                  <option value="name">Name A-Z</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="featured">Featured</option>
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
                  className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col cursor-pointer"
                  onClick={(e) => {
                    // Only navigate if click is not on interactive elements
                    if (e.target.closest('button, a, input')) {
                      return;
                    }
                    if (canSeePrices()) {
                      navigate(`/product/${product.id}`);
                    } else {
                      setShowLoginPrompt(true);
                    }
                  }}
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
                          Best Seller
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
                        onClick={(e) => e.stopPropagation()}
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
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-[#002D7A] hover:bg-[#001C4C] text-white font-medium py-2 px-3 sm:px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm sm:text-base"
                      >
                        <FaEye size={14} className="sm:w-4 sm:h-4" />
                        View Details
                      </Link>
                      
                      {/* Quantity Selector & Add to Cart */}
                      {canSeePrices() && product.status === 'active' && product.status !== 'out_of_stock' ? (
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
                              onTouchStart={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onTouchEnd={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleQuantityChange(product.id, -1);
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              className="p-2 sm:p-1.5 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation select-none min-w-[32px] min-h-[32px] flex items-center justify-center"
                            >
                              <FaMinus className="text-gray-500 text-sm sm:text-xs" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={quantities[product.id] || 1}
                              onChange={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleQuantityInput(product.id, e.target.value);
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                e.target.select();
                              }}
                              onTouchStart={(e) => {
                                e.stopPropagation();
                              }}
                              onFocus={(e) => {
                                e.target.select();
                              }}
                              className="w-12 sm:w-10 text-center border-0 focus:outline-none focus:ring-0 text-sm sm:text-xs font-medium py-1 touch-manipulation min-h-[32px]"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleQuantityChange(product.id, 1);
                              }}
                              onTouchStart={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onTouchEnd={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleQuantityChange(product.id, 1);
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              className="p-2 sm:p-1.5 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation select-none min-w-[32px] min-h-[32px] flex items-center justify-center"
                            >
                              <FaPlus className="text-gray-500 text-sm sm:text-xs" />
                            </button>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  addToCart(product, e);
                                }}
                                onTouchStart={(e) => {
                                  e.stopPropagation();
                                }}
                                onTouchEnd={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  addToCart(product, e);
                                }}
                                disabled={addingToCart[product.id]}
                                className="flex-1 bg-[#FE7F06] hover:bg-[#E66F00] text-white font-medium py-2 px-3 sm:px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
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
                              onTouchStart={(e) => {
                                e.stopPropagation();
                              }}
                              onTouchEnd={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAddToCartClick(product.id);
                              }}
                              className="w-full bg-[#FE7F06] hover:bg-[#E66F00] text-white font-medium py-2 px-3 sm:px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm sm:text-base touch-manipulation"
                            >
                              <FaShoppingCart size={14} className="sm:w-4 sm:h-4" />
                              Add to Cart
                            </button>
                          )}
                        </div>
                      ) : product.status === 'out_of_stock' ? (
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