import React, { useState, useEffect } from "react";
import { FaCreditCard, FaLock, FaArrowLeft, FaCheckCircle, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaBuilding } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";

function Checkout() {
  const navigate = useNavigate();
  const { cartItems, getCartTotal, loading: cartLoading } = useCart();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Billing Information
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    
    // Shipping Information
    shippingSameAsBilling: true,
    shippingFirstName: "",
    shippingLastName: "",
    shippingAddress: "",
    shippingCity: "",
    shippingState: "",
    shippingPincode: "",
    
    // Payment Information
    paymentMethod: "card",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardName: "",
  });

  const [errors, setErrors] = useState({});

  // ✅ Redirect to cart if empty
  useEffect(() => {
    if (!cartLoading && cartItems.length === 0) {
      navigate('/cart');
    }
  }, [cartItems.length, cartLoading, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      // Billing Information Validation
      if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
      if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
      if (!formData.email) newErrors.email = "Email is required";
      else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Email is invalid";
      if (!formData.phone) newErrors.phone = "Phone number is required";
      if (!formData.address.trim()) newErrors.address = "Address is required";
      if (!formData.city.trim()) newErrors.city = "City is required";
      if (!formData.state.trim()) newErrors.state = "State is required";
      if (!formData.pincode.trim()) newErrors.pincode = "Pincode is required";
    }

    if (step === 2 && !formData.shippingSameAsBilling) {
      // Shipping Information Validation
      if (!formData.shippingFirstName.trim()) newErrors.shippingFirstName = "First name is required";
      if (!formData.shippingLastName.trim()) newErrors.shippingLastName = "Last name is required";
      if (!formData.shippingAddress.trim()) newErrors.shippingAddress = "Address is required";
      if (!formData.shippingCity.trim()) newErrors.shippingCity = "City is required";
      if (!formData.shippingState.trim()) newErrors.shippingState = "State is required";
      if (!formData.shippingPincode.trim()) newErrors.shippingPincode = "Pincode is required";
    }

    if (step === 3) {
      // Payment Information Validation
      if (!formData.cardNumber.trim()) newErrors.cardNumber = "Card number is required";
      if (!formData.expiryDate.trim()) newErrors.expiryDate = "Expiry date is required";
      if (!formData.cvv.trim()) newErrors.cvv = "CVV is required";
      if (!formData.cardName.trim()) newErrors.cardName = "Cardholder name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Enforce ₹5,000 minimum order before placing order
    if (getSubtotal() < 5000) {
      alert("Minimum order amount is ₹5,000. Please add more items to proceed.");
      return;
    }
    if (validateStep(3)) {
      // Handle order submission
      console.log("Order submitted:", formData);
      // Navigate to place order page
      navigate("/place-order");
    }
  };

  const getSubtotal = () => {
    return cartItems.reduce((total, item) => total + ((item.price || 0) * (item.quantity || 1)), 0);
  };

  const getShipping = () => {
    const subtotal = getSubtotal();
    return subtotal >= 5000 ? 0 : 200;
  };

  const getTotal = () => {
    return getSubtotal() + getShipping();
  };

  const steps = [
    { number: 1, title: "Billing Information", icon: FaUser },
    { number: 2, title: "Shipping Information", icon: FaMapMarkerAlt },
    { number: 3, title: "Payment Information", icon: FaCreditCard },
    { number: 4, title: "Order Confirmation", icon: FaCheckCircle }
  ];

  if (currentStep === 4) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center gap-4">
              <Link to="/cart" className="flex items-center gap-2 text-[#002D7A] hover:text-[#001C4C] transition-colors">
                <FaArrowLeft size={20} />
                Back to Cart
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-[#002D7A] mt-4">Order Confirmation</h1>
          </div>
        </div>

        {/* Success Message */}
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="text-center">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaCheckCircle className="text-green-600 text-4xl" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Order Placed Successfully!</h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Thank you for your order. We've received your order and will process it shortly. 
              You'll receive a confirmation email with your order details.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/" 
                className="bg-[#002D7A] text-white px-6 py-3 rounded-lg hover:bg-[#001C4C] transition-colors"
              >
                Continue Shopping
              </Link>
              <Link 
                to="/profile" 
                className="border border-[#002D7A] text-[#002D7A] px-6 py-3 rounded-lg hover:bg-[#002D7A] hover:text-white transition-colors"
              >
                View Order History
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center gap-4">
            <Link to="/cart" className="flex items-center gap-2 text-[#002D7A] hover:text-[#001C4C] transition-colors">
              <FaArrowLeft size={20} />
              Back to Cart
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-[#002D7A] mt-4">Checkout</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              
              return (
                <div key={step.number} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    isCompleted ? 'bg-[#002D7A] border-[#002D7A] text-white' :
                    isActive ? 'border-[#002D7A] text-[#002D7A]' :
                    'border-gray-300 text-gray-400'
                  }`}>
                    {isCompleted ? <FaCheckCircle size={16} /> : <Icon size={16} />}
                  </div>
                  <div className="ml-3 hidden sm:block">
                    <p className={`text-sm font-medium ${
                      isActive ? 'text-[#002D7A]' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`hidden sm:block w-16 h-0.5 mx-4 ${
                      isCompleted ? 'bg-[#002D7A]' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Step 1: Billing Information */}
              {currentStep === 1 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-6">Billing Information</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A] focus:border-transparent ${
                          errors.firstName ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Enter your first name"
                      />
                      {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A] focus:border-transparent ${
                          errors.lastName ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Enter your last name"
                      />
                      {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A] focus:border-transparent ${
                          errors.email ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Enter your email"
                      />
                      {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A] focus:border-transparent ${
                          errors.phone ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Enter your phone number"
                      />
                      {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A] focus:border-transparent"
                      placeholder="Enter your company name"
                    />
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      rows={3}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A] focus:border-transparent ${
                        errors.address ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="Enter your complete address"
                    />
                    {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A] focus:border-transparent ${
                          errors.city ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Enter your city"
                      />
                      {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A] focus:border-transparent ${
                          errors.state ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Enter your state"
                      />
                      {errors.state && <p className="mt-1 text-sm text-red-600">{errors.state}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Pincode *</label>
                      <input
                        type="text"
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A] focus:border-transparent ${
                          errors.pincode ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Enter your pincode"
                      />
                      {errors.pincode && <p className="mt-1 text-sm text-red-600">{errors.pincode}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Shipping Information */}
              {currentStep === 2 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-6">Shipping Information</h2>
                  
                  <div className="mb-6">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="shippingSameAsBilling"
                        checked={formData.shippingSameAsBilling}
                        onChange={handleChange}
                        className="h-4 w-4 text-[#002D7A] focus:ring-[#002D7A] border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Same as billing address</span>
                    </label>
                  </div>

                  {!formData.shippingSameAsBilling && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                          <input
                            type="text"
                            name="shippingFirstName"
                            value={formData.shippingFirstName}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A] focus:border-transparent ${
                              errors.shippingFirstName ? "border-red-500" : "border-gray-300"
                            }`}
                            placeholder="Enter first name"
                          />
                          {errors.shippingFirstName && <p className="mt-1 text-sm text-red-600">{errors.shippingFirstName}</p>}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                          <input
                            type="text"
                            name="shippingLastName"
                            value={formData.shippingLastName}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A] focus:border-transparent ${
                              errors.shippingLastName ? "border-red-500" : "border-gray-300"
                            }`}
                            placeholder="Enter last name"
                          />
                          {errors.shippingLastName && <p className="mt-1 text-sm text-red-600">{errors.shippingLastName}</p>}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                        <textarea
                          name="shippingAddress"
                          value={formData.shippingAddress}
                          onChange={handleChange}
                          rows={3}
                          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A] focus:border-transparent ${
                            errors.shippingAddress ? "border-red-500" : "border-gray-300"
                          }`}
                          placeholder="Enter shipping address"
                        />
                        {errors.shippingAddress && <p className="mt-1 text-sm text-red-600">{errors.shippingAddress}</p>}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                          <input
                            type="text"
                            name="shippingCity"
                            value={formData.shippingCity}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A] focus:border-transparent ${
                              errors.shippingCity ? "border-red-500" : "border-gray-300"
                            }`}
                            placeholder="Enter city"
                          />
                          {errors.shippingCity && <p className="mt-1 text-sm text-red-600">{errors.shippingCity}</p>}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
                          <input
                            type="text"
                            name="shippingState"
                            value={formData.shippingState}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A] focus:border-transparent ${
                              errors.shippingState ? "border-red-500" : "border-gray-300"
                            }`}
                            placeholder="Enter state"
                          />
                          {errors.shippingState && <p className="mt-1 text-sm text-red-600">{errors.shippingState}</p>}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Pincode *</label>
                          <input
                            type="text"
                            name="shippingPincode"
                            value={formData.shippingPincode}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A] focus:border-transparent ${
                              errors.shippingPincode ? "border-red-500" : "border-gray-300"
                            }`}
                            placeholder="Enter pincode"
                          />
                          {errors.shippingPincode && <p className="mt-1 text-sm text-red-600">{errors.shippingPincode}</p>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Payment Information */}
              {currentStep === 3 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-6">Payment Information</h2>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Payment Method</label>
                    <div className="space-y-3">
                      <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="card"
                          checked={formData.paymentMethod === "card"}
                          onChange={handleChange}
                          className="h-4 w-4 text-[#002D7A] focus:ring-[#002D7A] border-gray-300"
                        />
                        <FaCreditCard className="ml-3 text-gray-400" size={20} />
                        <span className="ml-3 text-sm font-medium text-gray-700">Credit/Debit Card</span>
                      </label>
                      
                      <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="upi"
                          checked={formData.paymentMethod === "upi"}
                          onChange={handleChange}
                          className="h-4 w-4 text-[#002D7A] focus:ring-[#002D7A] border-gray-300"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">UPI</span>
                      </label>
                      
                      <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="cod"
                          checked={formData.paymentMethod === "cod"}
                          onChange={handleChange}
                          className="h-4 w-4 text-[#002D7A] focus:ring-[#002D7A] border-gray-300"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">Cash on Delivery</span>
                      </label>
                    </div>
                  </div>

                  {formData.paymentMethod === "card" && (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Card Number *</label>
                        <input
                          type="text"
                          name="cardNumber"
                          value={formData.cardNumber}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A] focus:border-transparent ${
                            errors.cardNumber ? "border-red-500" : "border-gray-300"
                          }`}
                          placeholder="1234 5678 9012 3456"
                        />
                        {errors.cardNumber && <p className="mt-1 text-sm text-red-600">{errors.cardNumber}</p>}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date *</label>
                          <input
                            type="text"
                            name="expiryDate"
                            value={formData.expiryDate}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A] focus:border-transparent ${
                              errors.expiryDate ? "border-red-500" : "border-gray-300"
                            }`}
                            placeholder="MM/YY"
                          />
                          {errors.expiryDate && <p className="mt-1 text-sm text-red-600">{errors.expiryDate}</p>}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">CVV *</label>
                          <input
                            type="text"
                            name="cvv"
                            value={formData.cvv}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A] focus:border-transparent ${
                              errors.cvv ? "border-red-500" : "border-gray-300"
                            }`}
                            placeholder="123"
                          />
                          {errors.cvv && <p className="mt-1 text-sm text-red-600">{errors.cvv}</p>}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Cardholder Name *</label>
                        <input
                          type="text"
                          name="cardName"
                          value={formData.cardName}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002D7A] focus:border-transparent ${
                            errors.cardName ? "border-red-500" : "border-gray-300"
                          }`}
                          placeholder="Enter cardholder name"
                        />
                        {errors.cardName && <p className="mt-1 text-sm text-red-600">{errors.cardName}</p>}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center">
                      <FaLock className="text-green-600 mr-2" />
                      <span className="text-sm text-green-800">Your payment information is secure and encrypted</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Previous
                  </button>
                )}
                
                <div className="ml-auto">
                  {currentStep < 3 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="px-6 py-3 bg-[#002D7A] text-white rounded-lg hover:bg-[#001C4C] transition-colors"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="px-6 py-3 bg-[#002D7A] text-white rounded-lg hover:bg-[#001C4C] transition-colors flex items-center gap-2"
                    >
                      <FaLock size={16} />
                      Place Order
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Order Summary</h2>
              
              {/* Items */}
              <div className="space-y-4 mb-6">
                {cartItems.map((item) => (
                  <div key={item.id || item.product_id} className="flex items-center gap-3">
                    <img 
                      src={item.image || `https://via.placeholder.com/60x60/002D7A/ffffff?text=${item.name?.charAt(0)}`} 
                      alt={item.name} 
                      className="w-12 h-12 object-cover rounded" 
                    />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-800">{item.name}</h3>
                      <p className="text-sm text-gray-600">Qty: {item.quantity || 1}</p>
                    </div>
                    <span className="text-sm font-medium text-[#002D7A]">
                      ₹{((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                    </span>
                  </div>
                ))}
                {cartItems.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No items in cart</p>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-3 border-t border-gray-200 pt-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">₹{getSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">
                    {getShipping() === 0 ? (
                      <span className="text-green-600">FREE</span>
                    ) : (
                      `₹${getShipping().toFixed(2)}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-3">
                  <span>Total</span>
                  <span className="text-[#002D7A]">₹{getTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Checkout;
