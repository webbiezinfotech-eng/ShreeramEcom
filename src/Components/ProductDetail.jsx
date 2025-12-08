import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  FaShoppingCart, 
  FaHeart, 
  FaShare, 
  FaStar, 
  FaArrowLeft,
  FaPlus,
  FaMinus,
  FaTruck,
  FaShieldAlt,
  FaUndo,
  FaCheckCircle,
  FaWhatsapp
} from "react-icons/fa";
import { getProductById, canSeePrices, getLoggedInCustomer, getProductsByCategory, getProducts } from "../services/api";
import { useCart } from "../contexts/CartContext";
import { useWishlist } from "../contexts/WishlistContext";
import LoginPrompt from "./LoginPrompt";

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItemToCart } = useCart();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlist();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Fetch product details and related products
  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);
        const customer = getLoggedInCustomer();
        // Show login prompt for non-registered users instead of blocking
        if (!customer) {
          setShowLoginPrompt(true);
          setLoading(false);
          return;
        }
        
        const data = await getProductById(id);
        if (data && data.item) {
          // Construct full image URL if needed
          let imageUrl = data.item.image;
          if (imageUrl && !imageUrl.startsWith('http')) {
            // LOCAL DEVELOPMENT
            imageUrl = `http://localhost:8000/${imageUrl}`;
            // PRODUCTION SERVER
            // imageUrl = `https://shreeram.webbiezinfotech.in/${imageUrl}`;
          }
          setProduct({ ...data.item, image: imageUrl });
          
          // Fetch related products from same category
          if (data.item.category_id) {
            const related = await getProductsByCategory(data.item.category_id, 8);
            // Exclude current product, inactive products, and limit to 4
            const filtered = related
              .filter(p => p.id !== parseInt(id) && p.status !== 'inactive')
              .slice(0, 4);
            setRelatedProducts(filtered);
          } else {
            // If no category, fetch recent products
            const recent = await getProducts(4, 1);
            const filtered = recent
              .filter(p => p.id !== parseInt(id) && p.status !== 'inactive')
              .slice(0, 4);
            setRelatedProducts(filtered);
          }
        } else {
          setError("Product not found");
        }
      } catch (err) {
        setError("Failed to load product");
        // Silently handle error
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchProduct();
    }
  }, [id]);

  // Listen for login events to reload product when user logs in
  useEffect(() => {
    const handleLogin = () => {
      const customer = getLoggedInCustomer();
      if (customer && showLoginPrompt) {
        setShowLoginPrompt(false);
        // Reload the page to fetch product data
        window.location.reload();
      }
    };

    window.addEventListener('customerLogin', handleLogin);
    window.addEventListener('storage', (e) => {
      if (e.key === 'customer' && e.newValue) {
        handleLogin();
      }
    });

    return () => {
      window.removeEventListener('customerLogin', handleLogin);
    };
  }, [showLoginPrompt]);

  // Check if product is in wishlist
  const isWishlisted = product ? isInWishlist(product.id) : false;

  // Handle quantity changes
  const handleQuantityChange = (action) => {
    if (action === 'increase') {
      setQuantity(prev => prev + 1);
    } else if (action === 'decrease' && quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  // Add to cart using context
  const handleAddToCart = async () => {
    if (product) {
      const result = await addItemToCart(product.id, quantity);
      if (result.success) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        // Handle error silently or show toast
      }
    }
  };

  // Add/Remove from wishlist
  const handleWishlist = async () => {
    if (!product) return;
    
    if (isWishlisted) {
      await removeFromWishlist(null, product.id);
    } else {
      const result = await addToWishlist(product.id);
      if (result.requiresLogin) {
        setShowLoginPrompt(true);
      }
    }
  };

  // Share product
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product?.name || product?.title,
        text: product?.description,
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      // Link copied - could show toast if needed
    }
  };

  // WhatsApp share
  const handleWhatsAppShare = () => {
    const message = `Check out this product: ${product?.name || product?.title}\n${window.location.href}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Skeleton loader for product detail
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
            {/* Image Skeleton */}
            <div className="space-y-4 animate-pulse">
              <div className="aspect-square bg-gray-200 rounded-xl"></div>
            </div>
            {/* Details Skeleton */}
            <div className="space-y-4 animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              <div className="h-10 bg-gray-200 rounded w-1/4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-4/6"></div>
              </div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't show error page if login prompt is shown
  if (showLoginPrompt && !getLoggedInCustomer()) {
    return (
      <div className="min-h-screen bg-white">
        <LoginPrompt
          isOpen={showLoginPrompt}
          onClose={() => {
            setShowLoginPrompt(false);
            navigate(-1); // Go back when prompt is closed
          }}
          message="Please login first to view product details"
        />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Product Not Found</h2>
          <p className="text-gray-600 mb-6">The product you're looking for doesn't exist or has been removed.</p>
          <Link 
            to="/products" 
            className="bg-[#002D7A] text-white px-6 py-3 rounded-lg hover:bg-[#001C4C] transition-colors"
          >
            Browse All Products
          </Link>
        </div>
      </div>
    );
  }

  const productImages = (product.image && product.image.trim() !== '') ? [product.image] : [];

  const discountPercentage = product.oldPrice 
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-[#002D7A] hover:text-[#001C4C] transition-colors text-sm sm:text-base"
            >
              <FaArrowLeft size={16} className="sm:w-5 sm:h-5" />
              Back
            </button>
            <div className="text-xs sm:text-sm text-gray-500 flex flex-wrap items-center gap-1 sm:gap-2">
              <Link to="/" className="hover:text-[#002D7A]">Home</Link>
              <span>/</span>
              <Link to="/products" className="hover:text-[#002D7A]">Products</Link>
              <span>/</span>
              <span className="text-gray-800 truncate max-w-[150px] sm:max-w-none">{product.name || product.title}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <FaCheckCircle />
          Added to cart successfully!
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center relative">
              {productImages.length > 0 && productImages[selectedImage] && productImages[selectedImage].trim() !== '' ? (
              <img
                src={productImages[selectedImage]}
                  alt={product.name || product.title || 'Product'}
                className={`w-full h-full object-cover ${product.status !== 'active' ? 'opacity-50' : ''}`}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const fallback = e.target.nextElementSibling;
                    if (fallback) fallback.classList.remove('hidden');
                  }}
              />
              ) : null}
              <div className={`${productImages.length > 0 && productImages[selectedImage] && productImages[selectedImage].trim() !== '' ? 'hidden' : ''} w-full h-full flex items-center justify-center ${product.status !== 'active' ? 'opacity-50' : ''}`}>
                <span className="text-gray-400 text-4xl sm:text-5xl font-bold">{(product.name || product.title || 'P').charAt(0).toUpperCase()}</span>
              </div>
              {/* Out of Stock Overlay */}
              {product.status !== 'active' && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
                  <span className="bg-red-600 text-white text-lg sm:text-xl font-bold px-6 py-3 rounded-lg shadow-lg">
                    OUT OF STOCK
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnail Images */}
            {productImages.length > 0 && (
              <div className="flex gap-2 sm:gap-3 overflow-x-auto">
              {productImages.map((image, index) => (
                  image && image.trim() !== '' ? (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                      className={`w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 flex-shrink-0 ${
                    selectedImage === index ? 'border-[#002D7A]' : 'border-gray-200'
                  }`}
                >
                  <img
                    src={image}
                        alt={`${product.name || 'Product'} ${index + 1}`}
                    className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                  />
                </button>
                  ) : null
              ))}
            </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-4 sm:space-y-6">
            {/* Product Title & Category */}
            <div>
              <span className="text-xs sm:text-sm text-[#002D7A] font-medium uppercase tracking-wide">
                {product.category_name || 'General'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">
                {product.name || product.title}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <FaStar
                      key={index}
                      className={`text-sm ${
                        index < Math.floor(product.rating || 4.5)
                          ? "text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600">
                  ({product.rating || 4.5}) • {Math.floor(Math.random() * 50) + 10} reviews
                </span>
              </div>
            </div>

            {/* Price */}
            {canSeePrices() ? (
              <div className="space-y-3">
                {product.items_per_pack && product.items_per_pack > 1 ? (
                  // Box/Pack Item - Show per piece and per box pricing
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold">
                        BOX/PACK ITEM
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Price per piece:</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xl sm:text-2xl font-bold text-[#002D7A]">
                            ₹{product.price}
                          </span>
                          {product.oldPrice && (
                            <>
                              <span className="text-base text-gray-400 line-through">
                                ₹{product.oldPrice}
                              </span>
                              <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-medium">
                                {discountPercentage}% OFF
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="border-t border-blue-200 pt-2">
                        <p className="text-xs text-gray-600 mb-1">
                          <span className="font-semibold">{product.items_per_pack} pieces</span> per box/pack
                        </p>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Price per box (1 pack):</p>
                          <span className="text-2xl sm:text-3xl font-bold text-[#002D7A]">
                            ₹{((product.price || 0) * (product.items_per_pack || 1)).toFixed(2)}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            (₹{product.price} × {product.items_per_pack} pieces)
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
                      <p className="text-xs text-yellow-800 font-medium">
                        ⚠️ Minimum order: 1 box ({product.items_per_pack} pieces)
                      </p>
                    </div>
                  </div>
                ) : (
                  // Regular Item - Show normal pricing
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className="text-2xl sm:text-3xl font-bold text-[#002D7A]">
                        ₹{product.price}
                      </span>
                      {product.oldPrice && (
                        <>
                          <span className="text-lg sm:text-xl text-gray-400 line-through">
                            ₹{product.oldPrice}
                          </span>
                          <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs sm:text-sm font-medium">
                            {discountPercentage}% OFF
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}
                <p className="text-xs sm:text-sm text-gray-600">
                  SKU: {product.sku || 'N/A'} • Stock: {product.stock || 0} units
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-base sm:text-lg text-gray-500 italic">
                    Login to view prices
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-600">
                  SKU: {product.sku || 'N/A'} • Stock: {product.stock || 0} units
                </p>
              </div>
            )}

            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600 leading-relaxed">
                {product.description || 'High-quality product designed for professional use. Perfect for office, school, or personal needs. Made with premium materials for durability and performance.'}
              </p>
            </div>

            {/* Quantity Selector */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Quantity {product.items_per_pack && product.items_per_pack > 1 && (
                  <span className="text-sm font-normal text-gray-600">(in boxes/packs)</span>
                )}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={() => handleQuantityChange('decrease')}
                      className="p-3 hover:bg-gray-50 transition-colors"
                      disabled={quantity <= 1}
                    >
                      <FaMinus className="text-gray-500" size={12} />
                    </button>
                    <span className="px-4 py-3 text-gray-800 font-medium min-w-[3rem] text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange('increase')}
                      className="p-3 hover:bg-gray-50 transition-colors"
                    >
                      <FaPlus className="text-gray-500" size={12} />
                    </button>
                  </div>
                  {product.items_per_pack && product.items_per_pack > 1 && (
                    <span className="text-sm text-gray-600">
                      = {quantity * product.items_per_pack} pieces
                    </span>
                  )}
                </div>
                {canSeePrices() && (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">Total Amount:</span>
                      <span className="text-lg font-bold text-[#002D7A]">
                        ₹{((product.price || 0) * quantity * (product.items_per_pack || 1)).toFixed(2)}
                      </span>
                    </div>
                    {product.items_per_pack && product.items_per_pack > 1 && (
                      <p className="text-xs text-gray-600">
                        {quantity} box(es) × {product.items_per_pack} pieces × ₹{product.price} per piece
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <div className="flex gap-3">
                {product.status === 'active' ? (
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 bg-[#002D7A] text-white py-4 px-6 rounded-lg font-semibold hover:bg-[#001C4C] transition-colors flex items-center justify-center gap-2"
                  >
                    <FaShoppingCart size={18} />
                    Add to Cart
                  </button>
                ) : (
                  <div className="flex-1 bg-red-100 border-2 border-red-300 text-red-700 py-4 px-6 rounded-lg font-semibold text-center">
                    Out of Stock
                  </div>
                )}
                <button
                  onClick={handleWishlist}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    isWishlisted
                      ? 'border-red-500 text-red-500 bg-red-50'
                      : 'border-gray-300 text-gray-500 hover:border-red-500 hover:text-red-500'
                  }`}
                >
                  <FaHeart size={18} />
                </button>
                <button
                  onClick={handleShare}
                  className="p-4 rounded-lg border-2 border-gray-300 text-gray-500 hover:border-[#002D7A] hover:text-[#002D7A] transition-colors"
                >
                  <FaShare size={18} />
                </button>
              </div>

              <button
                onClick={handleWhatsAppShare}
                className="w-full bg-green-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
              >
                <FaWhatsapp size={18} />
                Share on WhatsApp
              </button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <FaTruck className="text-blue-600" size={16} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Free Shipping</p>
                  <p className="text-sm text-gray-600">On orders over ₹1,000</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <FaShieldAlt className="text-green-600" size={16} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Quality Guarantee</p>
                  <p className="text-sm text-gray-600">100% authentic products</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <FaUndo className="text-purple-600" size={16} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Easy Returns</p>
                  <p className="text-sm text-gray-600">30-day return policy</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div className="mt-8 sm:mt-12 lg:mt-16">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 lg:mb-8">
              Related <span className="text-[#FE7F06]">Products</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {relatedProducts.map((relatedProduct) => (
                <div
                  key={relatedProduct.id}
                  className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden cursor-pointer group"
                  onClick={() => navigate(`/product/${relatedProduct.id}`)}
                >
                  <div className="relative">
                    {relatedProduct.image && relatedProduct.image.trim() !== '' ? (
                      <img
                        src={relatedProduct.image}
                        alt={relatedProduct.title || relatedProduct.name || 'Product'}
                        className="w-full h-48 object-cover bg-gray-200"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const fallback = e.target.nextElementSibling;
                          if (fallback) fallback.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`${relatedProduct.image && relatedProduct.image.trim() !== '' ? 'hidden' : ''} w-full h-48 bg-gray-200 flex items-center justify-center absolute inset-0`}>
                      <span className="text-gray-400 text-2xl font-bold">{(relatedProduct.title || relatedProduct.name || 'P').charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="absolute top-2 left-2">
                      <span className="bg-[#FE7F06] text-white text-xs font-medium px-2 py-1 rounded">
                        Related
                      </span>
                    </div>
                    <div className="absolute top-2 right-2">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (isInWishlist(relatedProduct.id)) {
                            await removeFromWishlist(null, relatedProduct.id);
                          } else {
                            const result = await addToWishlist(relatedProduct.id);
                            if (result.requiresLogin) {
                              setShowLoginPrompt(true);
                            }
                          }
                        }}
                        className={`p-2 rounded-full shadow-md transition-colors ${
                          isInWishlist(relatedProduct.id)
                            ? 'bg-red-500 text-white'
                            : 'bg-white text-gray-400 hover:text-red-500'
                        }`}
                        title={isInWishlist(relatedProduct.id) ? "Remove from wishlist" : "Add to wishlist"}
                      >
                        <FaHeart size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 text-left">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {relatedProduct.category || relatedProduct.category_name || 'General'}
                    </span>

                    <h3 className="font-semibold text-gray-800 mt-2 line-clamp-2">
                      {relatedProduct.title || relatedProduct.name}
                    </h3>

                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {relatedProduct.description}
                    </p>

                    {canSeePrices() ? (
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-lg font-bold text-[#002D7A]">
                          ₹{relatedProduct.price}
                        </span>
                        {relatedProduct.oldPrice && (
                          <>
                            <span className="text-sm text-gray-400 line-through">
                              ₹{relatedProduct.oldPrice}
                            </span>
                            <span className="text-xs text-green-600 font-medium">
                              {Math.round(
                                ((relatedProduct.oldPrice - relatedProduct.price) /
                                  relatedProduct.oldPrice) *
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
                        navigate(`/product/${relatedProduct.id}`);
                      }}
                      className="mt-4 w-full text-center bg-[#002D7A] hover:bg-[#001C4C] text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Login Prompt */}
      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => {
          setShowLoginPrompt(false);
          if (!getLoggedInCustomer()) {
            navigate(-1); // Go back if still not logged in
          }
        }}
        message="Please login first to view product details"
      />
    </div>
  );
}

export default ProductDetail;