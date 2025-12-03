import React, { useState } from "react";
import { FaMapMarkerAlt, FaPhone, FaEnvelope, FaClock, FaPaperPlane, FaUser, FaComment } from "react-icons/fa";
import { submitMessage } from "../services/api";
import { getLoggedInCustomerId } from "../services/api";

function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ""))) {
      newErrors.phone = "Phone number must be 10 digits";
    }

    if (!formData.subject.trim()) {
      newErrors.subject = "Subject is required";
    }

    if (!formData.message.trim()) {
      newErrors.message = "Message is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      try {
        const customerId = getLoggedInCustomerId();
        const messageData = {
          ...formData,
          customer_id: customerId ? parseInt(customerId) : null
        };

        const result = await submitMessage(messageData);
        
        if (result.ok) {
          setIsSubmitted(true);
          // Reset form
          setFormData({
            name: "",
            email: "",
            phone: "",
            subject: "",
            message: "",
          });
        } else {
          setErrors({ submit: result.error || "Failed to send message. Please try again." });
        }
      } catch (error) {
        // Silently handle error
        setErrors({ submit: "An error occurred. Please try again." });
      }
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#002D7A] to-[#001C4C] text-white py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
              <span className="text-white">Contact</span> <span className="text-[#FE7F06]">Us</span>
            </h1>
            <p className="text-base sm:text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto px-4">
              Get in touch with us for any inquiries, orders, or support
            </p>
          </div>
        </div>
      </div>

      {/* Contact Information & Form */}
      <div className="py-8 sm:py-12 lg:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12">
            {/* Contact Information */}
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold text-[#002D7A] mb-6">Get in Touch</h2>
                <p className="text-gray-600 text-lg leading-relaxed mb-8">
                  We're here to help! Whether you have questions about our products, need assistance with an order, 
                  or want to discuss bulk purchases, don't hesitate to reach out to us.
                </p>
              </div>

              {/* Contact Details */}
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="bg-[#002D7A] text-white rounded-full w-12 h-12 flex items-center justify-center mr-4 mt-1">
                    <FaMapMarkerAlt size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-[#002D7A] mb-2">Visit Our Store</h3>
                    <p className="text-gray-600 leading-relaxed">
                      Basement IDBI Bank, S R Complex<br />
                      Gandhi Pratima, Gondia<br />
                      Maharashtra 441601
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-[#002D7A] text-white rounded-full w-12 h-12 flex items-center justify-center mr-4 mt-1">
                    <FaPhone size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-[#002D7A] mb-2">Call Us</h3>
                    <p className="text-gray-600">
                      <a href="tel:+917304044465" className="hover:text-[#002D7A] transition-colors">
                        +91 7304044465
                      </a>
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-[#002D7A] text-white rounded-full w-12 h-12 flex items-center justify-center mr-4 mt-1">
                    <FaEnvelope size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-[#002D7A] mb-2">Email Us</h3>
                    <p className="text-gray-600">
                      <a href="mailto:Shreeramgeneralstore.20@gmail.com" className="hover:text-[#002D7A] transition-colors">
                        Shreeramgeneralstore.20@gmail.com
                      </a>
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-[#002D7A] text-white rounded-full w-12 h-12 flex items-center justify-center mr-4 mt-1">
                    <FaClock size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-[#002D7A] mb-2">Store Hours</h3>
                    <div className="text-gray-600">
                      <p>Monday - Saturday: 9:00 AM - 8:00 PM</p>
                      <p>Sunday: 10:00 AM - 6:00 PM</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-gray-50 rounded-xl sm:rounded-2xl p-6 sm:p-8">
              <h3 className="text-xl sm:text-2xl font-bold text-[#002D7A] mb-4 sm:mb-6">Send us a Message</h3>
              
              {isSubmitted && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
                  <div className="flex items-center">
                    <FaPaperPlane className="mr-2" />
                    Thank you! Your message has been sent successfully. We'll get back to you soon.
                  </div>
                </div>
              )}

              {errors.submit && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                  {errors.submit}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      <FaUser className="inline mr-2" />
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#002D7A] focus:border-transparent transition-colors ${
                        errors.name ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="Enter your full name"
                    />
                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      <FaEnvelope className="inline mr-2" />
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#002D7A] focus:border-transparent transition-colors ${
                        errors.email ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="Enter your email"
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    <FaPhone className="inline mr-2" />
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#002D7A] focus:border-transparent transition-colors ${
                      errors.phone ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Enter your phone number"
                  />
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#002D7A] focus:border-transparent transition-colors ${
                      errors.subject ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="What is this about?"
                  />
                  {errors.subject && <p className="text-red-500 text-sm mt-1">{errors.subject}</p>}
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    <FaComment className="inline mr-2" />
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    value={formData.message}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#002D7A] focus:border-transparent transition-colors resize-none ${
                      errors.message ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Tell us how we can help you..."
                  />
                  {errors.message && <p className="text-red-500 text-sm mt-1">{errors.message}</p>}
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#002D7A] text-white py-3 px-6 rounded-lg font-medium hover:bg-[#001C4C] transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <FaPaperPlane size={18} />
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#002D7A] mb-4">Find Us</h2>
            <p className="text-gray-600 text-lg">
              Visit our store in the heart of Gondia, easily accessible from all parts of the city
            </p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="bg-gray-200 rounded-lg h-96 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <FaMapMarkerAlt size={48} className="mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Interactive Map</h3>
                <p className="text-sm">
                  Basement IDBI Bank, S R Complex<br />
                  Gandhi Pratima, Gondia, Maharashtra 441601
                </p>
                <p className="text-sm mt-2 text-[#002D7A]">
                  <a href="https://maps.google.com/?q=Gandhi+Pratima,+Gondia,+Maharashtra+441601" 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="hover:underline">
                    View on Google Maps
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Contact;
