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
import { getProductById } from "../services/api";
import { useCart } from "../contexts/CartContext";
import { useWishlist } from "../contexts/WishlistContext";
import LoginPrompt from "./LoginPrompt";

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItemToCart } = useCart();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlist();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Fetch product details
  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);
        const data = await getProductById(id);
        if (data && data.item) {
          setProduct(data.item);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002D7A] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product details...</p>
        </div>
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

  const productImages = product.image ? [product.image] : [];

  const discountPercentage = product.oldPrice 
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-[#002D7A] hover:text-[#001C4C] transition-colors"
            >
              <FaArrowLeft size={18} />
              Back
            </button>
            <div className="text-sm text-gray-500">
              <Link to="/" className="hover:text-[#002D7A]">Home</Link>
              <span className="mx-2">/</span>
              <Link to="/products" className="hover:text-[#002D7A]">Products</Link>
              <span className="mx-2">/</span>
              <span className="text-gray-800">{product.name || product.title}</span>
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
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
              <img
                src={productImages[selectedImage]}
                alt={product.name || product.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Thumbnail Images */}
            <div className="flex gap-3">
              {productImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`w-20 h-20 rounded-lg overflow-hidden border-2 ${
                    selectedImage === index ? 'border-[#002D7A]' : 'border-gray-200'
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Product Title & Category */}
            <div>
              <span className="text-sm text-[#002D7A] font-medium uppercase tracking-wide">
                {product.category_name || 'General'}
              </span>
              <h1 className="text-3xl font-bold text-gray-900 mt-2">
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
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-[#002D7A]">
                  ₹{product.price}
                </span>
                {product.oldPrice && (
                  <>
                    <span className="text-xl text-gray-400 line-through">
                      ₹{product.oldPrice}
                    </span>
                    <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-sm font-medium">
                      {discountPercentage}% OFF
                    </span>
                  </>
                )}
              </div>
              <p className="text-sm text-gray-600">
                SKU: {product.sku || 'N/A'} • Stock: {product.stock || 0} units
              </p>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600 leading-relaxed">
                {product.description || 'High-quality product designed for professional use. Perfect for office, school, or personal needs. Made with premium materials for durability and performance.'}
              </p>
            </div>

            {/* Quantity Selector */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Quantity</h3>
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
                <span className="text-sm text-gray-600">
                  Total: ₹{(product.price * quantity).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 bg-[#002D7A] text-white py-4 px-6 rounded-lg font-semibold hover:bg-[#001C4C] transition-colors flex items-center justify-center gap-2"
                >
                  <FaShoppingCart size={18} />
                  Add to Cart
                </button>
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <FaTruck className="text-blue-600" size={16} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Free Shipping</p>
                  <p className="text-sm text-gray-600">On orders over ₹5,000</p>
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
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Related Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* This would be populated with related products from API */}
            <div className="bg-gray-100 rounded-lg p-4 text-center">
              <p className="text-gray-500">Related products will be loaded here</p>
            </div>
          </div>
        </div>
      </div>

      {/* Login Prompt */}
      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        message="Please login first to add products to your wishlist"
      />
    </div>
  );
}

export default ProductDetail;