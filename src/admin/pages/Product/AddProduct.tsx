import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { productsAPI, categoriesAPI } from "../../services/api";
import Alert from "../../components/Alert";

type Category = {
  id: number;
  name: string;
};

type ProductForm = {
  name: string;
  description: string;
  mrp: string;
  wholesale_rate: string;
  stock: string;
  sku: string;
  brand: string;
  dimensions: string;
  category_id: string;
  status: "active" | "inactive";
  items_per_pack: string;
};

const AddProduct: React.FC = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState<ProductForm>({
    name: "",
    description: "",
    mrp: "",
    wholesale_rate: "",
    stock: "",
    sku: "",
    brand: "",
    dimensions: "",
    category_id: "",
    status: "active",
    items_per_pack: "",
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  
  // Alert states
  const [alert, setAlert] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    isVisible: boolean;
  }>({
    type: 'success',
    message: '',
    isVisible: false
  });
  
  // Category management states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: "", slug: "" });
  const [categoryLoading, setCategoryLoading] = useState(false);
  
  // Show alert function
  const showAlert = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    setAlert({ type, message, isVisible: true });
  };

  const hideAlert = () => {
    setAlert(prev => ({ ...prev, isVisible: false }));
  };

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await categoriesAPI.getAll();
        const categoryList = Array.isArray(response) 
          ? response 
          : Array.isArray(response?.items) 
          ? response.items 
          : [];
        setCategories(categoryList);
      } catch (error) {
        console.error("Failed to load categories:", error);
        setCategories([]);
      }
    };
    loadCategories();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImageFile(e.target.files[0]);
    }
  };

  // Category management functions
  const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCategoryForm(prev => ({ ...prev, [name]: value }));
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;

    setCategoryLoading(true);
    setErrorMessage(""); // Clear previous errors
    
    try {
      const slug = categoryForm.slug || generateSlug(categoryForm.name);
      const response = await categoriesAPI.create({ 
        name: categoryForm.name.trim(), 
        slug: slug 
      });
      
      // Refresh categories list
      const categoryResponse = await categoriesAPI.getAll();
      const categoryList = Array.isArray(categoryResponse) 
        ? categoryResponse 
        : Array.isArray(categoryResponse?.items) 
        ? categoryResponse.items 
        : [];
      setCategories(categoryList);
      
      // Reset form and close modal
      setCategoryForm({ name: "", slug: "" });
      setShowCategoryModal(false);
      showAlert('success', '✅ Category added successfully!');
      
      // Auto-select the newly created category
      if (response?.id) {
        setForm(prev => ({ ...prev, category_id: response.id.toString() }));
      }
    } catch (error: any) {
      console.error('Category creation error:', error);
      let errorMsg = "❌ Failed to add category";
      
      if (error?.message?.includes('Duplicate entry')) {
        errorMsg = "❌ Category with this name already exists";
      } else if (error?.message) {
        errorMsg = `❌ ${error.message}`;
      }
      
      showAlert('error', errorMsg);
    } finally {
      setCategoryLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      mrp: "",
      wholesale_rate: "",
      stock: "",
      sku: "",
      brand: "",
      dimensions: "",
      category_id: "",
      status: "active",
      items_per_pack: "",
    });
    setImageFile(null);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("description", form.description);
      formData.append("mrp", form.mrp);
      formData.append("wholesale_rate", form.wholesale_rate);
      formData.append("stock", form.stock);
      formData.append("sku", form.sku);
      formData.append("brand", form.brand);
      formData.append("dimensions", form.dimensions);
      formData.append("status", form.status);
      formData.append("currency", "INR");
      formData.append("items_per_pack", form.items_per_pack || "");
      
      if (form.category_id) {
        formData.append("category_id", form.category_id);
      }

      if (imageFile) {
        formData.append("image", imageFile);
      }

      await productsAPI.create(formData);
      showAlert('success', 'Product added successfully!');
      resetForm();
      
      setTimeout(() => {
        navigate("/admin/products");
      }, 2000);
    } catch (error: any) {
      showAlert('error', error?.message || "❌ Failed to add product");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Alert Component */}
      <Alert
        type={alert.type}
        message={alert.message}
        isVisible={alert.isVisible}
        onClose={hideAlert}
        duration={4000}
      />
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Add New Product
        </h1>
        <p className="text-gray-600">
          Add a new product to your stationery inventory
        </p>
      </div>

      <div className="mb-6">
        <button
          onClick={() => navigate("/admin/products")}
          className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          ← Back to Products
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {successMessage && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
                {successMessage}
              </div>
            )}
            {errorMessage && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter product name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <div className="flex gap-2">
                  <select
                    name="category_id"
                    value={form.category_id}
                    onChange={handleChange}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(true)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                    title="Manage Categories"
                  >
                    + Add Category
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  MRP (₹)
                </label>
                <input
                  type="number"
                  name="mrp"
                  value={form.mrp}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter MRP"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wholesale Rate (₹)
                </label>
                <input
                  type="number"
                  name="wholesale_rate"
                  value={form.wholesale_rate}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter wholesale rate"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stock Quantity *
                </label>
                <input
                  type="number"
                  name="stock"
                  value={form.stock}
                  onChange={handleChange}
                  required
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter stock quantity"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SKU
                </label>
                <input
                  type="text"
                  name="sku"
                  value={form.sku}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter SKU"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Items per Pack (Box) *
                </label>
                <input
                  type="number"
                  name="items_per_pack"
                  value={form.items_per_pack}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 10 (1 box = 10 packets)"
                />
                <p className="text-xs text-gray-500 mt-1">Enter how many items are in 1 pack/box. If 1 box = 10 packets, enter 10</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand
                </label>
                <input
                  type="text"
                  name="brand"
                  value={form.brand}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter brand name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dimensions
                </label>
                <input
                  type="text"
                  name="dimensions"
                  value={form.dimensions}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 10x15x5 cm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="active">Active</option>
                  <option value="out_of_stock">Out of Stock</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {imageFile && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: {imageFile.name}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter product description"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Adding...
                  </>
                ) : (
                  "Add Product"
                )}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={isLoading}
                className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-medium transition-colors"
              >
                Clear
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Category Management Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add New Category</h3>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setErrorMessage("");
                  setCategoryForm({ name: "", slug: "" });
                }}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✖
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-4">
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {errorMessage}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={categoryForm.name}
                  onChange={handleCategoryChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter category name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slug (optional)
                </label>
                <input
                  type="text"
                  name="slug"
                  value={categoryForm.slug}
                  onChange={handleCategoryChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Auto-generated from name"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to auto-generate from category name
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryModal(false);
                    setErrorMessage("");
                    setCategoryForm({ name: "", slug: "" });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={categoryLoading}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors"
                >
                  {categoryLoading ? "Adding..." : "Add Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddProduct;