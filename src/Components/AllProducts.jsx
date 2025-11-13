import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { getProducts } from "../services/api"; // <-- API function import

export default function AllProducts() {
  const [products, setProducts] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(true);

  // Fetch products from backend
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const data = await getProducts();
      setProducts(data || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  const handleQuantity = (id, action) => {
    setQuantities((prev) => {
      const current = prev[id] || 1;
      return {
        ...prev,
        [id]: action === "increase" ? current + 1 : Math.max(1, current - 1),
      };
    });
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-600">
        Loading products...
      </div>
    );
  }

  return (
    <div className="p-6 bg-white text-gray-800">
      <h2 className="text-2xl font-bold mb-2 text-blue-700">All Products</h2>
      <p className="text-gray-600 mb-6">
        Browse our complete collection of wholesale stationery supplies
      </p>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full lg:w-1/4 bg-blue-50 rounded-xl p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-orange-600 mb-3">
            Categories
          </h3>
          <ul className="space-y-2 text-sm">
            <li><input type="checkbox" /> Writing Instruments</li>
            <li><input type="checkbox" /> Paper Products</li>
            <li><input type="checkbox" /> Office Supplies</li>
            <li><input type="checkbox" /> Art & Craft</li>
            <li><input type="checkbox" /> School Supplies</li>
            <li><input type="checkbox" /> Cutting Tools</li>
          </ul>

          <h3 className="text-lg font-semibold text-orange-600 mt-6 mb-3">
            Price Range
          </h3>
          <input type="range" min="0" max="1000" className="w-full" />

          <h3 className="text-lg font-semibold text-orange-600 mt-6 mb-3">
            Brands
          </h3>
          <ul className="space-y-2 text-sm">
            <li><input type="checkbox" /> Staedtler</li>
            <li><input type="checkbox" /> Pilot</li>
            <li><input type="checkbox" /> BIC</li>
            <li><input type="checkbox" /> Faber-Castell</li>
            <li><input type="checkbox" /> Pentel</li>
          </ul>
        </div>

        {/* Product Grid */}
        <div className="w-full lg:w-3/4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-600">
              {products.length} products found
            </p>
            <select className="border rounded-lg px-3 py-1">
              <option>Sort by: Featured</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
            </select>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="border rounded-xl p-4 shadow hover:shadow-lg transition"
                >
                  {/* Tag + Rating */}
                  <div className="flex justify-between items-center mb-2">
                    <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                      {product.tag || "Featured"}
                    </span>
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star size={16} fill="currentColor" />
                      <span className="text-sm font-medium">{product.rating || 0}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <p className="text-xs text-gray-500">{product.category}</p>
                  <h3 className="font-semibold text-gray-900">{product.title}</h3>

                  {/* Price */}
                  <div className="mt-2">
                    <span className="text-xl font-bold text-blue-600">
                      ₹{product.price}
                    </span>
                    {product.oldPrice && (
                      <>
                        <span className="line-through text-gray-400 ml-2">
                          ₹{product.oldPrice}
                        </span>
                        <span className="ml-2 text-green-600 text-sm">
                          Save ₹{(product.oldPrice - product.price).toFixed(2)}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Reviews */}
                  {product.reviews && (
                    <p className="text-sm text-gray-500 mt-1">
                      ⭐ {product.reviews} reviews
                    </p>
                  )}

                  {/* Quantity + Cart */}
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={() => handleQuantity(product.id, "decrease")}
                      className="px-2 py-1 border rounded-lg"
                    >
                      -
                    </button>
                    <span>{quantities[product.id] || 1}</span>
                    <button
                      onClick={() => handleQuantity(product.id, "increase")}
                      className="px-2 py-1 border rounded-lg"
                    >
                      +
                    </button>
                    <button className="ml-auto bg-blue-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg transition">
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No products available</p>
          )}
        </div>
      </div>
    </div>
  );
}
