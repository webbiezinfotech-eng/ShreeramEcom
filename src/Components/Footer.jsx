import { FaWhatsapp, FaInstagram } from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import { FaPhoneAlt } from "react-icons/fa";
import { FaMapMarkerAlt } from "react-icons/fa";

export default function Footer() {

  return (
    <footer className="mt-12">
      {/* WhatsApp Business Group CTA */}
      <div className="bg-gradient-to-r from-[#002D7A] to-[#001C4C] text-white py-12 px-6 text-center">
        <div className="flex justify-center mb-4">
          <span className="text-4xl text-green-400"><FaWhatsapp size={36} /></span>
        </div>
        <h2 className="text-3xl md:text-5xl font-bold mb-2">
          Join Our <span className="text-[#FE7F06]">Business Group</span>
        </h2>
        <p className="mb-6 max-w-2xl mx-auto">
          Get wholesale deals, product updates, and priority support directly on WhatsApp.
        </p>

        <div className="flex justify-center">
          <a
            href="https://chat.whatsapp.com/your-group-invite"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 px-6 py-3 rounded-md font-semibold text-white"
          >
            <FaWhatsapp size={18} /> Join our business group
          </a>
        </div>
        {/* <p className="text-sm mt-3">
          You will be redirected to WhatsApp to join the group.
        </p> */}
      </div>

      {/* Footer Section */}
      <div className="bg-gray-900 text-white py-10 px-6">
        <div className="max-w-auto mx-5 md:mx-16 grid grid-cols-1 sm:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-white">
              Shreeram Stationery
            </h3>
            <p className="text-sm mb-4">
              Your trusted wholesale partner for premium stationery supplies.
              Serving businesses nationwide with quality products and
              exceptional service.
            </p>
            <div className="flex gap-3">
              <a
                href="https://wa.me/917304044465"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#FE7F06] hover:bg-[#E66F00] text-white p-2 rounded-md transition-colors"
              >
                <FaWhatsapp size={18} />
              </a>
              <a
                href="https://www.instagram.com/shreeram_generalstore/"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#FE7F06] hover:bg-[#E66F00] text-white p-2 rounded-md transition-colors"
              >
                <FaInstagram size={18} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-white">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/about" className="text-white hover:text-[#FE7F06] transition-colors block">About Us</a></li>
              <li><a href="/products" className="text-white hover:text-[#FE7F06] transition-colors block">All Products</a></li>
              <li><a href="/products" className="text-white hover:text-[#FE7F06] transition-colors block">Bulk Products</a></li>
              <li><a href="/contact" className="text-white hover:text-[#FE7F06] transition-colors block">Shipping Info</a></li>
              <li><a href="/contact" className="text-white hover:text-[#FE7F06] transition-colors block">FAQs</a></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-white">Categories</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/category/office-supplies" className="text-white hover:text-[#FE7F06] transition-colors block">Office Supplies</a></li>
              <li><a href="/category/school-supplies" className="text-white hover:text-[#FE7F06] transition-colors block">School Supplies</a></li>
              <li><a href="/category/writing-instruments" className="text-white hover:text-[#FE7F06] transition-colors block">Writing Instruments</a></li>
              <li><a href="/category/paper-products" className="text-white hover:text-[#FE7F06] transition-colors block">Paper Products</a></li>
              <li><a href="/products" className="text-white hover:text-[#FE7F06] transition-colors block">Art & Craft</a></li>
              <li><a href="/products" className="text-white hover:text-[#FE7F06] transition-colors block">Cutting Tools</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-white">Contact Us</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <FaMapMarkerAlt className="mt-1" /> 
                <span>Basement IDBI Bank, S R Complex<br />Gandhi Pratima, Gondia<br />Maharashtra 441601</span>
              </li>
              <li className="flex items-center gap-2">
                <FaPhoneAlt /> 
                <a href="tel:+917304044465" className="hover:text-[#FE7F06] transition-colors">+91 7304044465</a>
              </li>
              <li className="flex items-center gap-2">
                <MdEmail /> 
                <a href="mailto:Shreeramgeneralstore.20@gmail.com" className="hover:text-[#FE7F06] transition-colors">Shreeramgeneralstore.20@gmail.com</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="border-t  mt-8 pt-4 flex flex-col md:flex-row justify-between items-center text-sm ">
          <p>© 2024 Shreeram Stationery. All rights reserved.</p>
          <a href="/contact" className="text-white hover:text-[#FE7F06] transition-colors mt-2 md:mt-0">
            Privacy Policy
          </a>
        </div>
      </div>
    </footer>
  );
}
