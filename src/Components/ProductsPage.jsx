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
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [toast, setToast] = useState({ isOpen: false, message: "", type: "success" });
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [quantities, setQuantities] = useState({});
  const [addingToCart, setAddingToCart] = useState({}); // Track which product is being added
  const [showQuantitySelector, setShowQuantitySelector] = useState({});
  
  // Debounce timer ref for input field
  const inputDebounceTimer = useRef({});
  // Track touch positions to prevent accidental clicks during scroll
  const touchStartPos = useRef({});
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

  // ✅ Sync searchTerm with URL params (from Navbar search)
  useEffect(() => {
    const urlSearch = searchParams.get('q') || "";
    // Always sync with URL, even if empty - prevent state mismatch
    if (urlSearch !== searchTerm) {
      setSearchTerm(urlSearch);
    }
  }, [searchParams]);

  // ✅ Fetch categories from backend
  useEffect(() => {
    async function fetchCategories() {
      try {
        const cats = await getCategories();
        // Filter out invalid categories (only numbers, empty names, etc.)
        const validCategories = (cats || []).filter(cat => {
          const name = (cat.name || '').trim();
          // Filter out: empty names, only numbers, names shorter than 2 characters
          return name.length >= 2 && !/^\d+$/.test(name);
        });
        setCategories(validCategories);
      } catch (error) {
        // Silently handle error
      }
    }
    fetchCategories();
  }, []);

  // ✅ Fetch products from backend with debouncing for search
  useEffect(() => {
    // Clear any existing timeout
    let timeoutId;
    let isMounted = true;
    
    const fetchProducts = async () => {
      if (!isMounted) return;
      
      setLoading(true);
      try {
        // Trim search term to avoid issues with whitespace
        const trimmedSearch = searchTerm.trim();
        // Always fetch products - empty search means fetch all products
        const data = await getProducts(1000, 1, trimmedSearch); // Fetch more products for category filtering
        
        if (isMounted) {
          // Handle new API response format: {products: [], total: 0, ...}
          const productsArray = data?.products || (Array.isArray(data) ? data : []);
          setProducts(productsArray);
          setInitialLoadDone(true);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        if (isMounted) {
          // Set empty array on error - this will show "no products" message instead of white screen
          // Don't reset initialLoadDone to false - keep it true so UI shows properly
          setProducts([]);
          setInitialLoadDone(true);
          setLoading(false);
        }
      }
    };

    // Debounce search: 300ms delay if searchTerm exists, immediate if empty
    if (searchTerm.trim()) {
      timeoutId = setTimeout(fetchProducts, 300);
    } else {
      // If search is cleared or empty, fetch all products immediately
      fetchProducts();
    }

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [searchTerm]);

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

  // ✅ Filter products - ensure products is always an array
  const safeProducts = Array.isArray(products) ? products : [];
  const filteredProducts = safeProducts.filter((product) => {
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
  const handleQuantityChange = async (productId, change, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.target) {
        e.target.blur();
      }
    }
    
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

  // Helper function to handle touch start - track position
  const handleTouchStart = (e, key) => {
    const touch = e.touches[0];
    touchStartPos.current[key] = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  };

  // Helper function to check if touch was a proper click (not scroll)
  const isProperClick = (e, key) => {
    if (!touchStartPos.current[key]) return false;
    
    const touch = e.changedTouches[0];
    const startPos = touchStartPos.current[key];
    const deltaX = Math.abs(touch.clientX - startPos.x);
    const deltaY = Math.abs(touch.clientY - startPos.y);
    const deltaTime = Date.now() - startPos.time;
    
    // Clear the stored position
    delete touchStartPos.current[key];
    
    // Consider it a proper click if:
    // - Movement is less than 10px (not scrolling)
    // - Time is less than 300ms (quick tap)
    return deltaX < 10 && deltaY < 10 && deltaTime < 300;
  };

  // Handle add to cart button click - directly add 1 quantity if not in cart, otherwise show selector
  const handleAddToCartClick = async (productId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      // Prevent scroll to top
      if (e.target) {
        e.target.blur();
      }
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
      // Prevent scroll to top
      if (e.target) {
        e.target.blur();
      }
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

  // Check if searching - show header when search is empty or cleared
  const isSearching = searchTerm.trim().length > 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Show when NOT searching (search is empty/cleared) */}
      {!isSearching ? (
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
      ) : (
        // Show search results header when searching
        <div className="bg-gradient-to-r from-[#002D7A] to-[#001C4C] text-white py-4 sm:py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">
                Search Results
              </h2>
              <p className="text-sm sm:text-base text-blue-100">
                Found {sortedProducts.length} products for "{searchTerm}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Section - Always has background to prevent white screen */}
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${isSearching ? 'py-2 sm:py-4' : 'py-4 sm:py-6 lg:py-8'} min-h-[60vh] bg-white`}>
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters - Category Buttons (Desktop) */}
          <div className="hidden lg:block lg:w-1/4">
            <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 sticky top-4">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-lg font-semibold text-[#002D7A]">
                  Categories
                </h3>
              </div>

              {/* Category Buttons */}
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setSelectedCategory("All");
                    navigate('/products');
                  }}
                  className={`w-full text-left px-4 py-2.5 rounded-lg transition-colors ${
                    selectedCategory === "All"
                      ? "bg-[#002D7A] text-white font-medium"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  All Categories
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      setSelectedCategory(category.id);
                      // Navigate to category page when category is selected
                      const categorySlug = category.slug || category.name?.toLowerCase().replace(/\s+/g, '-') || category.id;
                      navigate(`/category/${categorySlug}`);
                    }}
                    className={`w-full text-left px-4 py-2.5 rounded-lg transition-colors ${
                      selectedCategory === category.id || selectedCategory === category.id.toString()
                        ? "bg-[#002D7A] text-white font-medium"
                        : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Products List */}
          <div className="w-full lg:w-3/4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                {/* Mobile Category Dropdown Button */}
                <div className="relative lg:hidden">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white w-full sm:w-auto min-w-[140px] justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <FaFilter />
                      <span className="text-sm font-medium">
                        {selectedCategory === "All" 
                          ? "Categories" 
                          : categories.find(c => c.id === selectedCategory || c.id.toString() === selectedCategory.toString())?.name || "Category"
                        }
                      </span>
                    </div>
                    <span className="text-gray-400">▼</span>
                  </button>
                  
                  {/* Mobile Dropdown Menu */}
                  {showFilters && (
                    <>
                      {/* Backdrop */}
                      <div 
                        className="fixed inset-0 bg-black/20 z-40 lg:hidden"
                        onClick={() => setShowFilters(false)}
                      />
                      {/* Dropdown Box - Compact */}
                      <div className="absolute top-full left-0 mt-2 w-full sm:w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-[50vh] overflow-hidden flex flex-col">
                        <div className="p-3 border-b border-gray-200 bg-white flex-shrink-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-[#002D7A]">Select Category</h3>
                            <button
                              onClick={() => setShowFilters(false)}
                              className="text-gray-500 hover:text-gray-700 text-lg leading-none"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        <div className="p-2 space-y-1 overflow-y-auto flex-1">
                          <button
                            onClick={() => {
                              setSelectedCategory("All");
                              navigate('/products');
                              setShowFilters(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                              selectedCategory === "All"
                                ? "bg-[#002D7A] text-white font-medium"
                                : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            All Categories
                          </button>
                          {categories.map((category) => (
                            <button
                              key={category.id}
                              onClick={() => {
                                setSelectedCategory(category.id);
                                const categorySlug = category.slug || category.name?.toLowerCase().replace(/\s+/g, '-') || category.id;
                                navigate(`/category/${categorySlug}`);
                                setShowFilters(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                                selectedCategory === category.id || selectedCategory === category.id.toString()
                                  ? "bg-[#002D7A] text-white font-medium"
                                  : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                              }`}
                            >
                              {category.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {isSearching ? (
                    <>
                      Searching: <span className="font-medium">"{searchTerm}"</span>
                    </>
                  ) : (
                    <>
                      {sortedProducts.length} products found
                    </>
                  )}
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

            {/* Products Grid - Always render to prevent white screen */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 min-h-[400px]">
              {loading && !initialLoadDone ? (
                // Show skeleton loaders while loading (only on initial load)
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
                      {/* Quantity Selector & Add to Cart - Blue Button at Top */}
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
                                e.target.blur();
                                handleQuantityChange(product.id, -1, e);
                              }}
                              onTouchStart={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleTouchStart(e, `qty-minus-${product.id}`);
                              }}
                              onTouchEnd={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (isProperClick(e, `qty-minus-${product.id}`)) {
                                  e.target.blur();
                                  handleQuantityChange(product.id, -1, e);
                                }
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
                                e.target.blur();
                                handleQuantityChange(product.id, 1, e);
                              }}
                              onTouchStart={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleTouchStart(e, `qty-plus-${product.id}`);
                              }}
                              onTouchEnd={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (isProperClick(e, `qty-plus-${product.id}`)) {
                                  e.target.blur();
                                  handleQuantityChange(product.id, 1, e);
                                }
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
                                  e.target.blur();
                                  addToCart(product, e);
                                }}
                                onTouchStart={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleTouchStart(e, `add-cart-${product.id}`);
                                }}
                                onTouchEnd={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (isProperClick(e, `add-cart-${product.id}`)) {
                                    e.target.blur();
                                    addToCart(product, e);
                                  }
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                disabled={addingToCart[product.id]}
                                className="flex-1 bg-[#002D7A] hover:bg-[#001C4C] text-white font-medium py-2 px-3 sm:px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
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
                                e.target.blur();
                                handleAddToCartClick(product.id, e);
                              }}
                              onTouchStart={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleTouchStart(e, `add-cart-btn-${product.id}`);
                              }}
                              onTouchEnd={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (isProperClick(e, `add-cart-btn-${product.id}`)) {
                                  e.target.blur();
                                  handleAddToCartClick(product.id, e);
                                }
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              className="w-full bg-[#002D7A] hover:bg-[#001C4C] text-white font-medium py-2 px-3 sm:px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm sm:text-base touch-manipulation"
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
                      
                      {/* View Details - Orange Button at Bottom */}
                      <Link
                        to={`/product/${product.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-[#FE7F06] hover:bg-[#E66F00] text-white font-medium py-2 px-3 sm:px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm sm:text-base"
                      >
                        <FaEye size={14} className="sm:w-4 sm:h-4" />
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))
              ) : (
                // No Results - Always show when not loading and no products (NEVER show white screen)
                <div className="col-span-full min-h-[400px] flex items-center justify-center">
                  <div className="text-center py-12 px-4 max-w-md mx-auto">
                    <div className="text-gray-400 mb-4">
                      <FaSearch size={64} className="mx-auto" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3">
                      {isSearching ? `कोई उत्पाद नहीं मिला` : 'कोई उत्पाद उपलब्ध नहीं'}
                    </h3>
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">
                      {isSearching ? `No products found for "${searchTerm}"` : 'No products available'}
                    </h3>
                    <p className="text-gray-600 mb-6 text-base">
                      {isSearching 
                        ? `हमें "${searchTerm}" के लिए कोई उत्पाद नहीं मिला। कृपया एक अलग कीवर्ड से खोजें या सभी उत्पाद देखें।`
                        : 'इस श्रेणी में वर्तमान में कोई उत्पाद उपलब्ध नहीं हैं।'}
                    </p>
                    <p className="text-gray-500 mb-6 text-sm">
                      {isSearching 
                        ? 'Try searching with a different keyword or browse all products.'
                        : 'No products are currently available in this category.'}
                    </p>
                    {isSearching && (
                      <button
                        onClick={() => {
                          navigate("/products");
                          // Clear search in Navbar by updating URL
                          window.history.pushState({}, '', '/products');
                          const event = new PopStateEvent('popstate');
                          window.dispatchEvent(event);
                        }}
                        className="inline-flex items-center gap-2 bg-[#002D7A] hover:bg-[#001C4C] text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
                      >
                        सभी उत्पाद देखें / View All Products
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
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