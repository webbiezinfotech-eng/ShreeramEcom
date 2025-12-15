import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { FaSearch, FaShoppingCart, FaStar, FaHeart, FaEye, FaArrowLeft, FaPlus, FaMinus, FaFilter } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { getProducts, getProductsByCategory, getCategories, canSeePrices, getLoggedInCustomer } from "../services/api";
import { useCart } from "../contexts/CartContext";
import { useWishlist } from "../contexts/WishlistContext";
import Toast from "./Toast";
import LoginPrompt from "./LoginPrompt";

function CategoryPage() {
  const navigate = useNavigate();
  const { category } = useParams();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ isOpen: false, message: "", type: "success" });
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [quantities, setQuantities] = useState({});
  const [addingToCart, setAddingToCart] = useState({});
  const [showQuantitySelector, setShowQuantitySelector] = useState({});
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 20;
  
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

  // Keyword-based category mapping (define BEFORE using it) - Separate categories
  const categoryKeywords = {
    "pens": {
      keywords: ["pen", "pens", "ballpoint", "gel", "ink", "cello", "camlin", "reynolds", "parker", "pilot", "uniball", "uni-ball", "rotomac", "linc", "flair", "addgel", "pentonic", "butterflow", "octane", "gripper", "techliner", "signo", "v5", "v7", "g2", "bic", "fountain"],
      name: "Pens"
    },
    "pencils": {
      keywords: ["pencil", "pencils", "natraj", "apsara", "domes", "staedtler", "faber", "castell", "hb", "2b", "4b", "6b", "mechanical", "lead"],
      name: "Pencils"
    },
    "staplers": {
      keywords: ["stapler", "staplers", "kangaro", "punch", "binding"],
      name: "Staplers"
    },
    "sketchpens": {
      keywords: ["sketchpen", "sketchpens", "sketch pen", "sketch pens", "marker", "markers", "sketch", "art", "drawing"],
      name: "Sketchpens"
    },
    "office-supplies": {
      keywords: ["folder", "binder", "clip", "pin", "tack", "office", "file", "organizer", "desk", "calculator", "scissors", "cutter", "tape", "dispenser"],
      name: "Office Supplies"
    },
    "school-supplies": {
      keywords: ["school", "student", "backpack", "bag", "notebook", "notepad", "eraser", "sharpener", "ruler", "compass", "geometry", "box"],
      name: "School Supplies"
    },
    "paper-products": {
      keywords: ["paper", "papers", "sheet", "sheets", "notebook", "notepad", "pad", "copy", "a4", "a3", "a5", "legal", "letter", "card", "cardstock"],
      name: "Paper Products"
    }
  };

  // Get current category from API data
  const getCurrentCategoryInfo = () => {
    if (!category || category === "all-products") {
      return {
        title: "All Products",
        description: "Browse our complete range of stationery and office supplies",
        icon: "🛍️",
        color: "from-[#002D7A] to-[#001C4C]"
      };
    }
    
    // Check keyword-based categories first
    if (categoryKeywords[category]) {
      return {
        title: categoryKeywords[category].name,
        description: `Explore our ${categoryKeywords[category].name} collection`,
        icon: "📦",
        color: "from-[#002D7A] to-[#001C4C]"
      };
    }
    
    // Find category from API data
    const foundCategory = categories.find(cat => {
      const slug = cat.slug || (cat.name ? cat.name.toLowerCase().replace(/\s+/g, '-') : '');
      return slug === category || cat.id === parseInt(category) || cat.name?.toLowerCase() === category;
    });
    
    if (foundCategory) {
      return {
        title: foundCategory.name || "Category",
        description: `Explore our ${foundCategory.name} collection`,
        icon: "📦",
        color: "from-[#002D7A] to-[#001C4C]"
      };
    }
    
    // Fallback
    return {
      title: category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' '),
      description: "Browse our complete range of stationery and office supplies",
      icon: "🛍️",
      color: "from-[#002D7A] to-[#001C4C]"
    };
  };

  const currentCategory = getCurrentCategoryInfo();

  // ✅ Load categories and products from API with pagination
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // First load categories
        const cats = await getCategories();
        // Filter out invalid categories (only numbers, empty names, etc.) for display
        const validCategories = (cats || []).filter(cat => {
          const name = (cat.name || '').trim();
          // Filter out: empty names, only numbers, names shorter than 2 characters
          return name.length >= 2 && !/^\d+$/.test(name);
        });
        setCategories(validCategories);
        
        // Then load products based on category
        // Use original cats array for lookup (to find category by ID/slug even if filtered)
        let result = { products: [], total: 0, page: 1, limit: pageSize, totalPages: 1 };
        const currentCategory = category;
        
        if (!currentCategory || currentCategory === "all-products") {
          // Fetch all products with pagination
          const allProds = await getProducts(pageSize, currentPage);
          result = {
            products: allProds?.products || allProds || [],
            total: allProds?.total || allProds?.length || 0,
            page: currentPage,
            limit: pageSize,
            totalPages: allProds?.totalPages || 1
          };
        } else {
          // Find category ID - use original cats array for lookup
          let categoryId = null;
          
          // Try numeric ID first
          if (!isNaN(currentCategory)) {
            const cat = cats.find(c => c.id === parseInt(currentCategory));
            if (cat) categoryId = cat.id;
          }
          
          // Try slug match - handle different formats
          if (!categoryId) {
            const currentCategoryLower = currentCategory.toLowerCase();
            const cat = cats.find(c => {
              const nameSlug = c.name?.toLowerCase().replace(/\s+/g, '-');
              const catSlug = (c.slug || '').toLowerCase();
              const catNameLower = (c.name || '').toLowerCase();
              
              // Match by slug
              if (catSlug === currentCategoryLower) return true;
              // Match by name slug
              if (nameSlug === currentCategoryLower) return true;
              // Match by direct name (case insensitive)
              if (catNameLower === currentCategoryLower) return true;
              // Match by name with spaces replaced
              if (catNameLower.replace(/\s+/g, '-') === currentCategoryLower) return true;
              // Match by name with dashes replaced with spaces
              if (catNameLower === currentCategoryLower.replace(/-/g, ' ')) return true;
              
              return false;
            });
            if (cat) categoryId = cat.id;
          }
          
          if (categoryId) {
            // Fetch products for specific category with pagination
            result = await getProductsByCategory(categoryId, pageSize, currentPage);
          } else {
            // Fallback: fetch all products
            const allProds = await getProducts(pageSize, currentPage);
            result = {
              products: allProds?.products || allProds || [],
              total: allProds?.total || allProds?.length || 0,
              page: currentPage,
              limit: pageSize,
              totalPages: allProds?.totalPages || 1
            };
          }
        }
        
        setProducts(result.products || []);
        setTotalItems(result.total || 0);
        setTotalPages(result.totalPages || 1);
      } catch (error) {
        console.error("Error fetching products:", error);
        setProducts([]);
        setTotalItems(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [category, currentPage]);
  
  // Reset to page 1 when category changes and close dropdown
  useEffect(() => {
    setCurrentPage(1);
    setShowCategoryDropdown(false); // Close dropdown when category changes
  }, [category]);

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

  // ✅ Find category ID from category slug - improved matching for all formats
  const findCategoryId = () => {
    if (!category || category === "all-products") return null;
    if (categories.length === 0) return null;
    
    const categoryLower = category.toLowerCase();
    
    // First try to find by numeric ID
    if (!isNaN(category)) {
      const cat = categories.find(c => c.id === parseInt(category));
      if (cat) return cat.id;
    }
    
    // Try to find by slug (exact match, case insensitive)
    let cat = categories.find(c => {
      const catSlug = (c.slug || '').toLowerCase();
      return catSlug === categoryLower;
    });
    
    // If not found, try to match by name (converted to slug)
    if (!cat) {
      cat = categories.find(c => {
        const nameSlug = (c.name || '').toLowerCase().replace(/\s+/g, '-');
        return nameSlug === categoryLower;
      });
    }
    
    // Try direct name match (case insensitive)
    if (!cat) {
      cat = categories.find(c => {
        const catNameLower = (c.name || '').toLowerCase();
        return catNameLower === categoryLower || catNameLower === categoryLower.replace(/-/g, ' ');
      });
    }
    
    // Try matching with spaces/dashes interchanged
    if (!cat) {
      cat = categories.find(c => {
        const catNameLower = (c.name || '').toLowerCase();
        const categoryWithSpaces = categoryLower.replace(/-/g, ' ');
        const categoryWithDashes = categoryLower.replace(/\s+/g, '-');
        return catNameLower === categoryWithSpaces || 
               catNameLower.replace(/\s+/g, '-') === categoryWithDashes;
      });
    }
    
    return cat ? cat.id : null;
  };

  // Function to check if product matches keyword-based category
  const matchesKeywordCategory = (product, categorySlug) => {
    if (!categoryKeywords[categorySlug]) return false;
    
    const productName = (product.name || product.title || "").toLowerCase();
    const productDesc = (product.description || "").toLowerCase();
    const productCategory = (product.category || product.category_name || "").toLowerCase();
    const searchText = `${productName} ${productDesc} ${productCategory}`;
    
    // Priority matching for specific categories
    if (categorySlug === "pens") {
      // Check if name contains "pen" as a word, but NOT "pencil" or "sketch"
      if ((/\bpen\b/i.test(productName) || /\bpens\b/i.test(productName)) && 
          !/\bpencil\b/i.test(productName) && !/\bsketch\b/i.test(productName)) {
        return true;
      }
    }
    
    if (categorySlug === "pencils") {
      // Check if name contains "pencil" as a word
      if (/\bpencil\b/i.test(productName) || /\bpencils\b/i.test(productName)) {
        return true;
      }
    }
    
    if (categorySlug === "sketchpens") {
      // Check if name contains "sketch" or "sketchpen"
      if (/\bsketch\b/i.test(productName) || /\bsketchpen\b/i.test(productName) || /\bmarker\b/i.test(productName)) {
        return true;
      }
    }
    
    // Check keywords
    return categoryKeywords[categorySlug].keywords.some(keyword => 
      searchText.includes(keyword.toLowerCase())
    );
  };

  // Function to check if category slug contains keywords (for partial matches like "kangaro-staplers")
  const findKeywordMatch = (categorySlug) => {
    for (const [key, data] of Object.entries(categoryKeywords)) {
      if (data.keywords.some(keyword => categorySlug.includes(keyword.toLowerCase()))) {
        return key;
      }
    }
    return null;
  };

  // ✅ Products are already filtered by backend API, just filter out inactive
  const filteredProducts = products.filter(product => {
    return product.status !== 'inactive';
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

    const existingCartItem = getCartItem(productId);
    const currentQty = existingCartItem ? existingCartItem.quantity : (quantities[productId] || 1);
    const newQty = Math.max(0, currentQty + change);
    
    setQuantities(prev => ({ ...prev, [productId]: newQty }));
    
    if (existingCartItem) {
      const cartItemId = existingCartItem.cart_id || existingCartItem.id;
      try {
        await updateItemQuantity(cartItemId, newQty);
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

  // Handle direct quantity input
  const handleQuantityInput = async (productId, value) => {
    const customer = getLoggedInCustomer();
    if (!customer) {
      setShowLoginPrompt(true);
      return;
    }

    const numValue = value === '' ? 0 : parseInt(value);
    const validQty = isNaN(numValue) ? 0 : Math.max(0, numValue);
    
    setQuantities(prev => ({ ...prev, [productId]: validQty }));
    
    if (inputDebounceTimer.current[productId]) {
      clearTimeout(inputDebounceTimer.current[productId]);
    }
    
    inputDebounceTimer.current[productId] = setTimeout(async () => {
      const cartItem = getCartItem(productId);
      if (cartItem) {
        const cartItemId = cartItem.cart_id || cartItem.id;
        try {
          await updateItemQuantity(cartItemId, validQty);
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

  // Helper function to handle touch start
  const handleTouchStart = (e, key) => {
    const touch = e.touches[0];
    touchStartPos.current[key] = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  };

  // Helper function to check if touch was a proper click
  const isProperClick = (e, key) => {
    if (!touchStartPos.current[key]) return false;
    
    const touch = e.changedTouches[0];
    const startPos = touchStartPos.current[key];
    const deltaX = Math.abs(touch.clientX - startPos.x);
    const deltaY = Math.abs(touch.clientY - startPos.y);
    const deltaTime = Date.now() - startPos.time;
    
    delete touchStartPos.current[key];
    
    return deltaX < 10 && deltaY < 10 && deltaTime < 300;
  };

  // Handle add to cart button click
  const handleAddToCartClick = async (productId, e) => {
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
    
    if (isInCart(productId)) {
      setShowQuantitySelector(prev => ({ ...prev, [productId]: true }));
      return;
    }
    
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    setAddingToCart(prev => ({ ...prev, [productId]: true }));
    
    try {
      const result = await addItemToCart(productId, 1);
      if (result.success) {
        setQuantities(prev => ({ ...prev, [productId]: 1 }));
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

  // Add to cart with quantity
  const addToCart = async (product, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.target) {
        e.target.blur();
      }
    }
    
    const quantity = quantities[product.id] || 1;
    setAddingToCart(prev => ({ ...prev, [product.id]: true }));
    
    try {
      const cartItem = getCartItem(product.id);
      
      if (cartItem) {
        const cartItemId = cartItem.cart_id || cartItem.id;
        const result = await updateItemQuantity(cartItemId, quantity);
    if (result.success) {
          setToast({ isOpen: true, message: `${product.title || product.name} quantity updated to ${quantity}!`, type: "success" });
          setShowQuantitySelector(prev => ({ ...prev, [product.id]: true }));
    } else {
          setToast({ isOpen: true, message: 'Failed to update cart', type: "error" });
        }
      } else {
        const result = await addItemToCart(product.id, quantity);
    if (result.success) {
          setToast({ isOpen: true, message: `${product.title || product.name} (${quantity} qty) added to cart!`, type: "success" });
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002D7A] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className={`bg-gradient-to-r ${currentCategory.color} text-white py-12`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="text-6xl mb-4">{currentCategory.icon}</div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {currentCategory.title.split(' ').map((word, index) => (
                <span key={index} className={index === 0 ? "text-white" : "text-[#FE7F06]"}>
                  {word}{index < currentCategory.title.split(' ').length - 1 ? ' ' : ''}
                </span>
              ))}
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              {currentCategory.description}
            </p>
            <div className="mt-6">
              <Link 
                to="/products" 
                className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg transition-colors"
              >
                <FaArrowLeft size={16} />
                View All Products
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Category Buttons - Desktop: Show all, Mobile: Compact Button */}
        <div className="mb-4 sm:mb-6">
          {/* Mobile: Compact Category Button - Only shows selected category name */}
          <div className="lg:hidden relative">
                <button 
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="flex items-center justify-between gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white w-full text-sm"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FaFilter className="text-gray-500 flex-shrink-0" size={14} />
                <span className="font-medium text-gray-700 truncate">
                  {currentCategory.title}
                </span>
              </div>
              <span className={`text-gray-400 text-xs flex-shrink-0 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`}>▼</span>
            </button>
            
            {/* Mobile Dropdown - Only shows when clicked */}
            {showCategoryDropdown && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 bg-black/20 z-40 lg:hidden"
                  onClick={() => setShowCategoryDropdown(false)}
                />
                {/* Dropdown Box - Compact */}
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-[45vh] overflow-hidden flex flex-col">
                  <div className="p-2.5 border-b border-gray-200 bg-white flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-[#002D7A]">Select Category</h3>
                      <button
                        onClick={() => setShowCategoryDropdown(false)}
                        className="text-gray-500 hover:text-gray-700 text-base leading-none w-5 h-5 flex items-center justify-center"
                      >
                        ✕
                      </button>
                </div>
              </div>
                  <div className="p-1.5 space-y-0.5 overflow-y-auto flex-1">
                    <Link
                      to="/products"
                      onClick={() => setShowCategoryDropdown(false)}
                      className={`block w-full text-left px-2.5 py-1.5 rounded transition-colors text-xs ${
                        !category || category === "all-products"
                          ? "bg-[#002D7A] text-white font-medium"
                          : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      All Categories
                    </Link>
                    {categories.map((cat) => {
                      const categorySlug = cat.slug || cat.name?.toLowerCase().replace(/\s+/g, '-') || cat.id;
                      const isActive = category === categorySlug || category === cat.id.toString();
                      return (
                        <Link
                          key={cat.id}
                          to={`/category/${categorySlug}`}
                          onClick={() => setShowCategoryDropdown(false)}
                          className={`block w-full text-left px-2.5 py-1.5 rounded transition-colors text-xs ${
                            isActive
                              ? "bg-[#002D7A] text-white font-medium"
                              : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {cat.name}
                        </Link>
                      );
                    })}
                </div>
                </div>
              </>
            )}
              </div>

          {/* Desktop: Show all category buttons */}
          <div className="hidden lg:flex flex-wrap gap-2 sm:gap-3">
            <Link
              to="/products"
              className={`px-4 py-2 rounded-lg transition-colors text-sm sm:text-base ${
                !category || category === "all-products"
                  ? "bg-[#002D7A] text-white font-medium"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All Categories
            </Link>
            {categories.map((cat) => {
              const categorySlug = cat.slug || cat.name?.toLowerCase().replace(/\s+/g, '-') || cat.id;
              const isActive = category === categorySlug || category === cat.id.toString();
              return (
                <Link
                  key={cat.id}
                  to={`/category/${categorySlug}`}
                  className={`px-4 py-2 rounded-lg transition-colors text-sm sm:text-base ${
                    isActive
                      ? "bg-[#002D7A] text-white font-medium"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {cat.name}
                </Link>
              );
            })}
            </div>
          </div>

          {/* Main Content */}
        <div>
            {/* Top Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4">
                <div className="text-sm text-gray-600">
              {filteredProducts.length} products found in {currentCategory.title}
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
            {filteredProducts.map((product) => (
                <div 
                  key={product.id} 
                  className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col cursor-pointer"
                  onClick={() => {
                    if (canSeePrices()) {
                      navigate(`/product/${product.id}`);
                    } else {
                      setShowLoginPrompt(true);
                    }
                  }}
                >
                  {/* Product Image */}
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
                        Best Seller
                      </span>
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
                        <FaEye className="text-gray-400 hover:text-blue-500" size={14} />
                      </Link>
                    </div>
                  </div>

                  {/* Product Info */}
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

                    {/* Rating */}
                    <div className="flex items-center mb-3">
                      <div className="flex items-center">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <FaStar
                            key={index}
                            className={`text-sm ${
                              index < Math.floor(product.rating)
                                ? "text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600 ml-2">
                        ({product.rating})
                      </span>
                    </div>

                    {/* Price */}
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
                              {Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}% OFF
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
              ))}
            </div>

            {/* Pagination */}
            {!loading && filteredProducts.length > 0 && totalPages > 1 && (
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Showing page {currentPage} of {totalPages} ({totalItems} products total)
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-[#002D7A] hover:bg-[#001C4C] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <FaArrowLeft size={14} />
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-[#002D7A] hover:bg-[#001C4C] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    Next
                    <FaArrowLeft size={14} className="rotate-180" />
                  </button>
                </div>
              </div>
            )}

            {/* Back to Home Button */}
            {!loading && (
              <div className="mt-6 flex justify-center">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  <FaArrowLeft size={16} />
                  Back to Home
                </Link>
              </div>
            )}

            {/* No Results */}
          {!loading && filteredProducts.length === 0 && (
              <div className="text-center py-16 min-h-[400px] flex flex-col items-center justify-center">
                <div className="text-gray-400 mb-6">
                  <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold text-gray-700 mb-3">
                  इस कैटेगरी में कोई प्रोडक्ट उपलब्ध नहीं है
                </h3>
                <p className="text-lg text-gray-500 mb-6">
                  No products available in <span className="font-semibold text-[#002D7A]">{currentCategory.title}</span> category at the moment.
                </p>
                <Link
                  to="/products"
                  className="inline-flex items-center gap-2 bg-[#002D7A] hover:bg-[#001C4C] text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  <FaArrowLeft size={16} />
                  View All Products
                </Link>
              </div>
            )}
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

export default CategoryPage;
