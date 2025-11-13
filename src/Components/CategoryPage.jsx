import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { FaSearch, FaFilter, FaShoppingCart, FaStar, FaHeart, FaEye, FaArrowLeft } from "react-icons/fa";
import { Link } from "react-router-dom";
import { getProducts, getProductsByCategory, getCategories } from "../services/api";
import { useCart } from "../contexts/CartContext";

function CategoryPage() {
  const { category } = useParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [sortBy, setSortBy] = useState("featured");
  const [showFilters, setShowFilters] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addItemToCart, getCartCount } = useCart();

  // Category configuration
  const categoryConfig = {
    "office-supplies": {
      title: "Office Supplies",
      description: "Professional office supplies for your workplace needs",
      icon: "🏢",
      color: "from-[#002D7A] to-[#001C4C]"
    },
    "school-supplies": {
      title: "School Supplies", 
      description: "Essential supplies for students and educational institutions",
      icon: "🎒",
      color: "from-[#002D7A] to-[#001C4C]"
    },
    "writing-instruments": {
      title: "Writing Instruments",
      description: "Quality pens, pencils, and writing tools for all needs",
      icon: "✏️",
      color: "from-[#002D7A] to-[#001C4C]"
    },
    "paper-products": {
      title: "Paper Products",
      description: "High-quality paper products for printing and writing",
      icon: "📄",
      color: "from-[#002D7A] to-[#001C4C]"
    }
  };

  const currentCategory = categoryConfig[category] || {
    title: "All Products",
    description: "Browse our complete range of stationery and office supplies",
    icon: "🛍️",
    color: "from-[#002D7A] to-[#001C4C]"
  };

  // ✅ Load categories and products from API
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [cats, prods] = await Promise.all([
          getCategories(),
          getProducts()
        ]);
        setCategories(cats || []);
        setProducts(prods || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // ✅ Find category ID from category slug
  const findCategoryId = () => {
    if (!category || category === "all-products") return null;
    const cat = categories.find(c => 
      c.slug === category || 
      c.name?.toLowerCase().replace(/\s+/g, '-') === category
    );
    return cat ? cat.id : null;
  };

  // ✅ Filter products based on category from API data
  const getCategoryProducts = () => {
    if (!products.length) return [];
    if (category === "all-products") return products;
    
    const categoryId = findCategoryId();
    if (categoryId) {
      return products.filter(product => product.category_id === categoryId);
    }
    
    // Fallback: filter by category name/slug
    return products.filter(product => {
      const catSlug = product.category?.toLowerCase().replace(/\s+/g, '-');
      return catSlug === category || product.category?.toLowerCase() === category;
    });
  };

  const categoryProducts = getCategoryProducts();

  const filteredProducts = categoryProducts.filter(product => {
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
      alert(`${product.title || product.name} added to cart!`);
    } else {
      alert('Failed to add to cart: ' + (result.error || 'Unknown error'));
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedProducts.map((product) => (
                <div key={product.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                  {/* Product Image */}
                  <div className="relative">
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-2 left-2">
                      <span className="bg-[#FE7F06] text-white text-xs font-medium px-2 py-1 rounded">
                        Best Seller
                      </span>
                    </div>
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                      <button className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50">
                        <FaHeart className="text-gray-400 hover:text-red-500" size={14} />
                      </button>
                      <button className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50">
                        <FaEye className="text-gray-400 hover:text-blue-500" size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <div className="mb-2">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {product.category}
                      </span>
                    </div>
                    
                    <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2">
                      {product.title}
                    </h3>
                    
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
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
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-lg font-bold text-[#002D7A]">
                        ₹{product.price}
                      </span>
                      <span className="text-sm text-gray-400 line-through">
                        ₹{product.oldPrice}
                      </span>
                      <span className="text-xs text-green-600 font-medium">
                        {Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}% OFF
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <Link
                        to={`/product/${product.id}`}
                        className="w-full bg-[#002D7A] hover:bg-[#001C4C] text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                      >
                        <FaEye size={16} />
                        View Details
                      </Link>
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="w-full bg-[#FE7F06] hover:bg-[#E66F00] text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <FaShoppingCart size={16} />
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
    </div>
  );
}

export default CategoryPage;
