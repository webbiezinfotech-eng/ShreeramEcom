import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaHeart, FaEye, FaShoppingCart, FaPlus, FaMinus } from "react-icons/fa";
import { getProducts, canSeePrices, getLoggedInCustomer } from "../services/api";
import { useWishlist } from "../contexts/WishlistContext";
import { useCart } from "../contexts/CartContext";
import LoginPrompt from "./LoginPrompt";

export default function FeaturedProducts() {
  const [products, setProducts] = useState([]);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [quantities, setQuantities] = useState({});
  const [addingToCart, setAddingToCart] = useState({}); // Track which product is being added
  const [showQuantitySelector, setShowQuantitySelector] = useState({});
  
  // Debounce timer ref for input field
  const inputDebounceTimer = useRef({});
  
  const navigate = useNavigate();
  const { addItemToCart, cartItems, updateItemQuantity } = useCart();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlist();
  
  // Check if product is already in cart and get cart item
  const isInCart = (productId) => {
    return cartItems.some(item => item.product_id === productId || item.id === productId);
  };
  
  // Get cart item for a product
  const getCartItem = (productId) => {
    return cartItems.find(item => item.product_id === productId || item.id === productId);
  };

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
    e.preventDefault();
    e.stopPropagation();
    
    const customer = getLoggedInCustomer();
    if (!customer) {
      setShowLoginPrompt(true);
      return;
    }
    
    // If product is already in cart, show quantity selector to add more
    if (isInCart(productId)) {
      setShowQuantitySelector(prev => {
        const updated = { ...prev, [productId]: true };
        localStorage.setItem('featured_products_quantity_selectors', JSON.stringify(updated));
        return updated;
      });
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

  // Handle add to cart - update if already in cart, otherwise add
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
      
      // Check if product is already in cart
      const cartItem = getCartItem(product.id);
      
      if (cartItem) {
        // Update existing cart item quantity
        const cartItemId = cartItem.cart_id || cartItem.id;
        const result = await updateItemQuantity(cartItemId, quantity);
        if (result.success) {
          // Notification will be updated by CartContext
          // Keep quantity selector visible (don't save to localStorage)
          setShowQuantitySelector(prev => ({ ...prev, [product.id]: true }));
        }
      } else {
        // Add new item to cart
        const result = await addItemToCart(product.id, quantity);
        if (result.success) {
          // Notification will be shown by CartContext
          // Keep quantity selector visible (don't save to localStorage)
          setShowQuantitySelector(prev => ({ ...prev, [product.id]: true }));
        } else if (result.requiresLogin) {
          setShowLoginPrompt(true);
        }
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
                onClick={(e) => {
                  // Only navigate if click is not on interactive elements
                  if (e.target.closest('button, a, input')) {
                    return;
                  }
                  handleProductClick(product.id);
                }}
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
                              handleAddToCart(product, e);
                            }}
                            onTouchStart={(e) => {
                              e.stopPropagation();
                            }}
                            onTouchEnd={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleAddToCart(product, e);
                            }}
                            disabled={addingToCart[product.id]}
                            className="flex-1 bg-[#002D7A] hover:bg-[#001C4C] text-white font-medium py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm sm:text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <FaShoppingCart size={14} />
                            {addingToCart[product.id] ? 'Adding...' : 'Add to Cart'}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAddToCartClick(product.id, e);
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                          }}
                          onTouchEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAddToCartClick(product.id, e);
                          }}
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
