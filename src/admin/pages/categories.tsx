import React, { useState, useEffect } from "react";
import { categoriesAPI, type Category } from "../services/api";
import Alert from "../components/Alert";

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [form, setForm] = useState<{ name: string; slug: string }>({ name: "", slug: "" });

  // Show alert function
  const showAlert = (type: 'success' | 'error' | 'warning' | 'info', message: string): void => {
    setAlert({ type, message, isVisible: true });
  };

  const hideAlert = () => {
    setAlert(prev => ({ ...prev, isVisible: false }));
  };

  // Fetch categories
  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const response: any = await categoriesAPI.getAll();
      const list: any[] = response?.items || (Array.isArray(response) ? response : []);
      setCategories(list.map((c: any) => ({
        id: Number(c.id || 0),
        name: String(c.name || ""),
        slug: String(c.slug || ""),
        parent_id: c.parent_id != null ? Number(c.parent_id) : null,
      })));
    } catch (e: any) {
      setError(e?.message || "Failed to load categories");
      showAlert('error', 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // Handle Add
  const handleAdd = async () => {
    if (!form.name.trim()) {
      showAlert('error', 'Category name is required!');
      return;
    }

    try {
      const slug = form.slug.trim() || generateSlug(form.name);
      await categoriesAPI.create({ name: form.name.trim(), slug });
      setIsAddOpen(false);
      setForm({ name: "", slug: "" });
      fetchCategories();
      showAlert('success', '✅ Category added successfully!');
    } catch (error: any) {
      showAlert('error', error?.message || '❌ Failed to add category');
    }
  };

  // Handle Edit
  const handleEdit = async () => {
    if (!selectedCategory || !form.name.trim()) {
      showAlert('error', 'Category name is required!');
      return;
    }

    try {
      const slug = form.slug.trim() || generateSlug(form.name);
      await categoriesAPI.update(selectedCategory.id, { name: form.name.trim(), slug });
      setIsEditOpen(false);
      setForm({ name: "", slug: "" });
      setSelectedCategory(null);
      fetchCategories();
      showAlert('success', '✅ Category updated successfully!');
    } catch (error: any) {
      showAlert('error', error?.message || '❌ Failed to update category');
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!selectedCategory) return;
    
    try {
      await categoriesAPI.delete(selectedCategory.id);
      setIsDeleteOpen(false);
      setSelectedCategory(null);
      fetchCategories();
      showAlert('success', '✅ Category deleted successfully!');
    } catch (error: any) {
      showAlert('error', error?.message || '❌ Failed to delete category');
    }
  };

  return (
    <div className="w-full px-4">
      {/* Alert Component */}
      <Alert
        type={alert.type}
        message={alert.message}
        isVisible={alert.isVisible}
        onClose={hideAlert}
        duration={4000}
      />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Category Management</h1>
        <p className="text-gray-600">Manage product categories</p>
      </div>

      {/* Action Button */}
      <div className="mb-6">
        <button
          onClick={() => {
            setForm({ name: "", slug: "" });
            setIsAddOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          + Add New Category
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500">Loading categories...</div>
        ) : error ? (
          <div className="p-10 text-center text-red-600">Error: {error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Category Name</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat, index) => (
                  <tr key={cat.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 font-medium">{index + 1}</td>
                    <td className="px-4 py-3 text-gray-800 font-medium">{cat.name}</td>
                    <td className="px-4 py-3 text-gray-600">{cat.slug || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedCategory(cat);
                            setForm({ name: cat.name, slug: cat.slug || "" });
                            setIsEditOpen(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit Category"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCategory(cat);
                            setIsDeleteOpen(true);
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete Category"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                      No categories found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add New Category</h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✖
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter category name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Slug (optional)</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Auto-generated from name"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to auto-generate</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditOpen && selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Category</h3>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✖
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter category name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Slug (optional)</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Auto-generated from name"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to auto-generate</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Update Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {isDeleteOpen && selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Delete Category</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete <span className="font-medium">{selectedCategory.name}</span>? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;

