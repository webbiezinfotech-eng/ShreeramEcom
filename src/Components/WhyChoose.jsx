import { FaCarSide } from "react-icons/fa";
import { FaHeadphones } from "react-icons/fa6";
import { FaCheckCircle, FaRegClock } from "react-icons/fa";
import { FaUsers } from "react-icons/fa";
import { FaDollarSign } from "react-icons/fa";

export default function WhyChoose() {
  const features = [
    {
      icon: <FaCarSide className="text-3xl text-blue-500" />,
      title: "Fast & Free shipping",
      description:
        "Free shipping on orders over ₹5000. Express delivery available nationwide.",
    },
    {
      icon: <FaCheckCircle className="text-3xl text-green-500" />,
      title: "Quality Guarantee",
      description:
        "100% authentic products with manufacturer warranty and quality assurance.",
    },
    {
      icon: <FaHeadphones className="text-3xl text-purple-500" />,
      title: "24/7 Customer Support",
      description:
        "Dedicated support team ready to help you with orders and inquiries.",
    },
    {
      icon: <FaUsers className="text-3xl text-pink-500" />,
      title: "Trusted by 10,000+ Businesses",
      description:
        "Join thousands of satisfied customers who trust us for their stationery needs.",
    },
    {
      icon: <FaRegClock className="text-3xl text-orange-500" />,
      title: "Quick Order Processing",
      description:
        "Orders processed within 24 hours. Track your shipment in real-time.",
    },
    {
      icon: <FaDollarSign className="text-3xl text-red-500" />,
      title: "Competitive Wholesale Prices",
      description:
        "Best wholesale prices with volume discounts and flexible payment terms.",
    },
  ];

  return (
    <section className="py-12 bg-white">
      {/* Heading */}
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-5xl font-bold leading-tight">
          Why Choose <span className="text-[#FE7F06]">Shreeram Stationery?</span>
        </h2>
        <p className="mt-4 max-w-2xl mx-auto">
          We’re committed to provide the best wholesale stationery experience
          with unmatched service and quality
        </p>
      </div>

      {/* Grid */}
      <div className=" max-w-7xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <div
            key={index}
            className="md:mt-8 border-[#003fad32] bg-white border rounded-xl shadow-md p-6 flex flex-col items-center text-center transition scale-100 hover:scale-105"
          >
            <div className="mb-4">{feature.icon}</div>
            <h3 className="text-lg font-semibold   mb-2">
              {feature.title}
            </h3>
            <p className=" text-sm">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
