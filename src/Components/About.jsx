import React from "react";
import { FaAward, FaUsers, FaShippingFast, FaHeadset, FaShieldAlt, FaTruck } from "react-icons/fa";

function About() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#002D7A] to-[#001C4C] text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-white">About Shreeram</span> <span className="text-[#FE7F06]">General Store</span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto">
              Your trusted partner for quality stationery and office supplies in Gondia, Maharashtra
            </p>
          </div>
        </div>
      </div>

      {/* Company Story */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-[#002D7A] mb-6">Our Story</h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                Shreeram General Store has been serving the community of Gondia, Maharashtra for years, 
                providing high-quality stationery and office supplies to businesses, schools, and individuals. 
                Located in the heart of the city near Gandhi Pratima, we have built a reputation for 
                reliability, quality, and excellent customer service.
              </p>
              <p className="text-gray-600 text-lg leading-relaxed">
                Our commitment to excellence and customer satisfaction has made us the go-to destination 
                for all your stationery needs. We understand the importance of quality supplies in 
                education and business, and we're proud to support our community's growth and success.
              </p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="bg-[#002D7A] text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <FaAward size={24} />
                  </div>
                  <h3 className="font-semibold text-[#002D7A] mb-2">Quality Products</h3>
                  <p className="text-sm text-gray-600">Premium stationery supplies</p>
                </div>
                <div className="text-center">
                  <div className="bg-[#002D7A] text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <FaUsers size={24} />
                  </div>
                  <h3 className="font-semibold text-[#002D7A] mb-2">Trusted Service</h3>
                  <p className="text-sm text-gray-600">Years of customer satisfaction</p>
                </div>
                <div className="text-center">
                  <div className="bg-[#002D7A] text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <FaShippingFast size={24} />
                  </div>
                  <h3 className="font-semibold text-[#002D7A] mb-2">Fast Delivery</h3>
                  <p className="text-sm text-gray-600">Quick and reliable shipping</p>
                </div>
                <div className="text-center">
                  <div className="bg-[#002D7A] text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <FaHeadset size={24} />
                  </div>
                  <h3 className="font-semibold text-[#002D7A] mb-2">24/7 Support</h3>
                  <p className="text-sm text-gray-600">Always here to help</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mission & Vision */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#002D7A] mb-4">Our Mission & Vision</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              We are committed to providing exceptional service and quality products to support education and business growth in our community.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex items-center mb-6">
                <div className="bg-[#002D7A] text-white rounded-full w-12 h-12 flex items-center justify-center mr-4">
                  <FaShieldAlt size={20} />
                </div>
                <h3 className="text-2xl font-bold text-[#002D7A]">Our Mission</h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                To provide high-quality stationery and office supplies at competitive prices, 
                ensuring that every customer receives exceptional service and products that meet 
                their educational and business needs. We strive to be the most trusted and 
                reliable stationery supplier in Gondia and surrounding areas.
              </p>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex items-center mb-6">
                <div className="bg-[#002D7A] text-white rounded-full w-12 h-12 flex items-center justify-center mr-4">
                  <FaTruck size={20} />
                </div>
                <h3 className="text-2xl font-bold text-[#002D7A]">Our Vision</h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                To become the leading stationery and office supplies provider in Maharashtra, 
                known for our commitment to quality, innovation, and customer satisfaction. 
                We envision expanding our reach while maintaining the personal touch and 
                community focus that has made us successful.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Location & Contact Info */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#002D7A] mb-4">Visit Our Store</h2>
            <p className="text-gray-600 text-lg">
              Located in the heart of Gondia, we're easily accessible and ready to serve you
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="bg-gray-50 rounded-xl p-8">
              <h3 className="text-2xl font-bold text-[#002D7A] mb-6">Store Information</h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="bg-[#002D7A] text-white rounded-full w-8 h-8 flex items-center justify-center mr-4 mt-1">
                    <FaTruck size={14} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Address</h4>
                    <p className="text-gray-600">
                      Basement IDBI Bank, S R Complex<br />
                      Gandhi Pratima, Gondia<br />
                      Maharashtra 441601
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-[#002D7A] text-white rounded-full w-8 h-8 flex items-center justify-center mr-4 mt-1">
                    <FaHeadset size={14} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Contact</h4>
                    <p className="text-gray-600">Phone: +91 7304044465</p>
                    <p className="text-gray-600">Email: Shreeramgeneralstore.20@gmail.com</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-[#002D7A] to-[#001C4C] rounded-xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-6">Why Choose Us?</h3>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                  <span>Wide selection of quality stationery products</span>
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                  <span>Competitive pricing for all products</span>
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                  <span>Fast and reliable delivery service</span>
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                  <span>Expert customer support</span>
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                  <span>Bulk order discounts available</span>
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                  <span>Convenient location in Gondia</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default About;
