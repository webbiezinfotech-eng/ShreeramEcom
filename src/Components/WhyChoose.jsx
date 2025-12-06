import { useState } from "react";
import { FaCarSide, FaCheckCircle, FaRegClock, FaUsers, FaDollarSign, FaTimes } from "react-icons/fa";
import { FaHeadphones } from "react-icons/fa6";

export default function WhyChoose() {
  const [selectedFeature, setSelectedFeature] = useState(null);

  const features = [
    {
      icon: <FaCarSide className="text-3xl text-blue-500" />,
      title: "Fast & Free shipping",
      description:
        "Free shipping on orders over ₹1,000. Express delivery available nationwide.",
      popupMessage: "Experience lightning-fast delivery with our comprehensive shipping network. Orders above ₹1,000 qualify for free shipping, ensuring your business operations never slow down. Our express delivery service covers all major cities, with real-time tracking so you always know where your order is. Partner with us for reliable, cost-effective logistics that keep your inventory stocked and your customers satisfied.",
    },
    {
      icon: <FaCheckCircle className="text-3xl text-green-500" />,
      title: "Quality Guarantee",
      description:
        "100% authentic products with manufacturer warranty and quality assurance.",
      popupMessage: "We stand behind every product we sell with our comprehensive quality guarantee. All items are sourced directly from authorized manufacturers, ensuring 100% authenticity. Each product comes with full manufacturer warranty coverage, and our quality assurance team conducts rigorous checks before dispatch. Your trust is our priority - if you're not satisfied, we'll make it right. Quality isn't just a promise, it's our commitment to your business success.",
    },
    {
      icon: <FaHeadphones className="text-3xl text-purple-500" />,
      title: "24/7 Customer Support",
      description:
        "Dedicated support team ready to help you with orders and inquiries.",
      popupMessage: "Our customer support team is available around the clock to assist you with any questions, concerns, or special requests. Whether you need help placing an order, tracking a shipment, or resolving an issue, our dedicated professionals are just a call or message away. We understand that business doesn't stop, and neither do we. Experience personalized service that puts your needs first, anytime, anywhere.",
    },
    {
      icon: <FaUsers className="text-3xl text-pink-500" />,
      title: "Trusted by 10,000+ Businesses",
      description:
        "Join thousands of satisfied customers who trust us for their stationery needs.",
      popupMessage: "Join a thriving community of over 10,000 businesses that rely on Shreeram Stationery for their daily operations. From small startups to large enterprises, we've built lasting partnerships based on trust, reliability, and exceptional service. Our growing network of satisfied customers is a testament to our commitment to excellence. When you choose us, you're choosing a partner trusted by thousands of successful businesses nationwide.",
    },
    {
      icon: <FaRegClock className="text-3xl text-orange-500" />,
      title: "Quick Order Processing",
      description:
        "Orders processed within 24 hours. Track your shipment in real-time.",
      popupMessage: "Time is money, and we respect yours. Our streamlined order processing system ensures that your orders are confirmed, packed, and dispatched within 24 hours of placement. With our advanced tracking system, you can monitor your shipment's journey in real-time, from our warehouse to your doorstep. No delays, no excuses - just efficient, transparent order fulfillment that keeps your business running smoothly.",
    },
    {
      icon: <FaDollarSign className="text-3xl text-red-500" />,
      title: "Competitive Wholesale Prices",
      description:
        "Best wholesale prices with volume discounts and flexible payment terms.",
      popupMessage: "Get the best value for your money with our competitive wholesale pricing structure. We offer attractive volume discounts that increase with your order quantity, helping you maximize your profit margins. Our flexible payment terms accommodate businesses of all sizes, with options for credit terms, partial payments, and customized billing cycles. We believe in building long-term partnerships, and our pricing reflects our commitment to your success.",
    },
  ];

  const handleCardClick = (feature) => {
    setSelectedFeature(feature);
  };

  const handleClosePopup = () => {
    setSelectedFeature(null);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClosePopup();
    }
  };

  return (
    <section className="py-8 sm:py-10 md:py-12 bg-white">
      {/* Heading */}
      <div className="text-center mb-6 sm:mb-8 md:mb-10 px-4">
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
          Why Choose <span className="text-[#FE7F06]">Shreeram Stationery?</span>
        </h2>
        <p className="mt-3 sm:mt-4 text-sm sm:text-base max-w-2xl mx-auto text-gray-600">
          We're committed to provide the best wholesale stationery experience
          with unmatched service and quality
        </p>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
        {features.map((feature, index) => (
          <div
            key={index}
            onClick={() => handleCardClick(feature)}
            className="group border-[#003fad32] bg-white border rounded-lg sm:rounded-xl shadow-md p-4 sm:p-5 md:p-6 flex flex-col items-center text-center transition-all transform hover:scale-105 hover:shadow-lg cursor-pointer active:scale-95"
          >
            <div className="mb-3 sm:mb-4">{feature.icon}</div>
            <h3 className="text-base sm:text-lg font-semibold mb-2">
              {feature.title}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600">{feature.description}</p>
            <p className="text-xs text-[#002D7A] font-medium mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              Click to learn more →
            </p>
          </div>
        ))}
      </div>

      {/* Popup Modal */}
      {selectedFeature && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleBackdropClick}
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-[#002D7A] to-[#001C4C] text-white p-4 sm:p-6 rounded-t-xl flex items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="text-2xl sm:text-3xl">
                  {selectedFeature.icon}
                </div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold">
                  {selectedFeature.title}
                </h3>
              </div>
              <button
                onClick={handleClosePopup}
                className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white hover:bg-opacity-20 rounded-full"
                aria-label="Close"
              >
                <FaTimes size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 md:p-8">
              <div className="mb-4">
                <p className="text-sm sm:text-base text-gray-600 mb-4">
                  {selectedFeature.description}
                </p>
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                    {selectedFeature.popupMessage}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={handleClosePopup}
                  className="w-full sm:w-auto bg-[#002D7A] hover:bg-[#001C4C] text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Got it, thanks!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
