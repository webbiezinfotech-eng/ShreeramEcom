import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { FaSearch, FaFilter, FaShoppingCart, FaStar, FaHeart, FaEye, FaArrowLeft } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { getProducts, getProductsByCategory, getCategories, canSeePrices } from "../services/api";
import { useCart } from "../contexts/CartContext";
import { useWishlist } from "../contexts/WishlistContext";
import Toast from "./Toast";
import LoginPrompt from "./LoginPrompt";

function CategoryPage() {
  const navigate = useNavigate();
  const { category } = useParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [sortBy, setSortBy] = useState("featured");
  const [showFilters, setShowFilters] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ isOpen: false, message: "", type: "success" });
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const { addItemToCart, getCartCount } = useCart();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlist();

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

  // ✅ Load categories and products from API
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // First load categories
        const cats = await getCategories();
        setCategories(cats || []);
        
        // Then load products based on category
        let prods = [];
        const currentCategory = category;
        
        if (!currentCategory || currentCategory === "all-products") {
          // Fetch all products
          prods = await getProducts();
        } else {
          // Find category ID
          let categoryId = null;
          
          // Try numeric ID first
          if (!isNaN(currentCategory)) {
            const cat = cats.find(c => c.id === parseInt(currentCategory));
            if (cat) categoryId = cat.id;
          }
          
          // Try slug match
          if (!categoryId) {
            const cat = cats.find(c => {
              const nameSlug = c.name?.toLowerCase().replace(/\s+/g, '-');
              return c.slug === currentCategory || nameSlug === currentCategory || c.name?.toLowerCase() === currentCategory.toLowerCase();
            });
            if (cat) categoryId = cat.id;
          }
          
          if (categoryId) {
            // Fetch products for specific category
            prods = await getProductsByCategory(categoryId);
          } else {
            // Check if it's a keyword-based category - fetch all products, filtering will happen in getCategoryProducts
            prods = await getProducts();
          }
        }
        
        setProducts(prods || []);
      } catch (error) {
        // Silently handle error
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [category]);

  // ✅ Find category ID from category slug
  const findCategoryId = () => {
    if (!category || category === "all-products") return null;
    if (categories.length === 0) return null;
    
    // First try to find by numeric ID
    if (!isNaN(category)) {
      const cat = categories.find(c => c.id === parseInt(category));
      if (cat) return cat.id;
    }
    
    // Try to find by slug
    let cat = categories.find(c => c.slug === category);
    
    // If not found, try to match by name (converted to slug)
    if (!cat) {
      cat = categories.find(c => {
        const nameSlug = c.name?.toLowerCase().replace(/\s+/g, '-');
        return nameSlug === category;
      });
    }
    
    // Try direct name match
    if (!cat) {
      cat = categories.find(c => c.name?.toLowerCase() === category.toLowerCase());
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

  // ✅ Filter products based on category from API data
  const getCategoryProducts = () => {
    if (!products.length) return [];
    if (!category || category === "all-products") return products;
    
    // First try to find category ID from database
    const categoryId = findCategoryId();
    if (categoryId) {
      const filtered = products.filter(product => product.category_id === categoryId);
      if (filtered.length > 0) return filtered;
    }
    
    // Check if it's a predefined keyword category
    if (categoryKeywords[category]) {
      const filtered = products.filter(product => matchesKeywordCategory(product, category));
      if (filtered.length > 0) return filtered;
    }
    
    // Check if category slug contains keywords (e.g., "kangaro-staplers" contains "stapler")
    const matchedKeywordCategory = findKeywordMatch(category);
    if (matchedKeywordCategory) {
      const filtered = products.filter(product => matchesKeywordCategory(product, matchedKeywordCategory));
      if (filtered.length > 0) return filtered;
    }
    
    // Try to match with database category names (convert category slug back to name)
    const categoryNameFromSlug = category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const dbCategoryMatch = categories.find(cat => {
      const catSlug = (cat.slug || cat.name?.toLowerCase().replace(/\s+/g, '-') || '').toLowerCase();
      const catNameLower = cat.name?.toLowerCase() || '';
      return catSlug === category || catNameLower === category.toLowerCase() || 
             catNameLower === categoryNameFromSlug.toLowerCase();
    });
    
    if (dbCategoryMatch) {
      const filtered = products.filter(product => 
        product.category_id === dbCategoryMatch.id || 
        (product.category || product.category_name || '').toLowerCase() === dbCategoryMatch.name?.toLowerCase()
      );
      if (filtered.length > 0) return filtered;
    }
    
    // Fallback: filter by category name/slug from product data
    const filtered = products.filter(product => {
      const productCategory = product.category || product.category_name || "";
      const catSlug = productCategory.toLowerCase().replace(/\s+/g, '-');
      const productName = (product.name || product.title || "").toLowerCase();
      const categoryLower = category.toLowerCase();
      
      // Check if category slug matches product category
      if (catSlug === categoryLower || productCategory.toLowerCase() === categoryLower) {
        return true;
      }
      
      // Check if product name contains category slug keywords
      const categoryWords = categoryLower.replace(/-/g, ' ').split(' ');
      if (categoryWords.some(word => word.length > 2 && productName.includes(word))) {
        return true;
      }
      
      // Check if product category contains category slug
      if (productCategory.toLowerCase().includes(categoryLower.replace(/-/g, ' '))) {
        return true;
      }
      
      return false;
    });
    
    // If no matches found, return all products (better than showing blank page)
    return filtered.length > 0 ? filtered : products;
  };

  const categoryProducts = getCategoryProducts();

  const filteredProducts = categoryProducts.filter(product => {
    // Hide inactive products completely
    if (product.status === 'inactive') {
      return false;
    }

    const matchesSearch = 
      (product.title || product.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPrice = 
      (product.price || 0) >= priceRange[0] && 
      (product.price || 0) <= priceRange[1];
    
    return matchesSearch && matchesPrice;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return (a.price || 0) - (b.price || 0);
      case "price-high":
        return (b.price || 0) - (a.price || 0);
      case "rating":
        return (b.rating || 0) - (a.rating || 0);
      case "name":
        return (a.title || a.name || '').localeCompare(b.title || b.name || '');
      default:
        return 0;
    }
  });

  // ✅ Add to cart using CartContext
  const handleAddToCart = async (product) => {
    const result = await addItemToCart(product.id, 1);
    if (result.success) {
      setToast({ isOpen: true, message: `${product.title || product.name} added to cart!`, type: "success" });
    } else {
      setToast({ isOpen: true, message: 'Failed to add to cart: ' + (result.error || 'Unknown error'), type: "error" });
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <div className={`lg:w-1/4 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white border border-gray-200 rounded-lg p-6 sticky top-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">
                  <span className="text-[#002D7A]">Fil</span><span className="text-[#FE7F06]">ters</span>
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

              {/* Price Range */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price Range: ₹{priceRange[0]} - ₹{priceRange[1]}
                </label>
                <input
                  type="range"
                  min="0"
                  max="10000"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>₹0</span>
                  <span>₹10,000</span>
                </div>
              </div>

              {/* Sort By */}
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

              {/* Results Count */}
              <div className="text-sm text-gray-600">
                Showing {sortedProducts.length} of {categoryProducts.length} products
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:w-3/4">
            {/* Top Bar */}
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
                  {sortedProducts.length} products found in {currentCategory.title}
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
              {sortedProducts.map((product) => (
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

                    {/* Action Buttons */}
                    <div className="space-y-2 mt-auto">
                      <Link
                        to={`/product/${product.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-[#002D7A] hover:bg-[#001C4C] text-white font-medium py-2 px-3 sm:px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm sm:text-base"
                      >
                        <FaEye size={14} className="sm:w-4 sm:h-4" />
                        View Details
                      </Link>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(product);
                        }}
                        className="w-full bg-[#FE7F06] hover:bg-[#E66F00] text-white font-medium py-2 px-3 sm:px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        <FaShoppingCart size={14} className="sm:w-4 sm:h-4" />
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* No Results */}
            {sortedProducts.length === 0 && (
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

export default CategoryPage;
