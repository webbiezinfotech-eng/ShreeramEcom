import React, { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useProducts, Product } from "../../hooks/useProducts";
import { categoriesAPI, productsAPI } from "../../services/api";
import Alert from "../../components/Alert";
import * as XLSX from "xlsx";

type Category = { id: number; name: string };

const INR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
    .format(Number(n || 0));

const pickArray = (res: any): any[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  for (const v of Object.values(res || {})) if (Array.isArray(v)) return v;
  return [];
};

const ProductList: React.FC = () => {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const pageSize = 20;

  const {
    products,
    loading,
    error,
    deleteProduct,
    updateProduct,
    fetchProducts,
    createProduct,
    totalPages,
    totalItems,
    currentPage,
    setCurrentPage,
  } = useProducts(1, pageSize, searchTerm);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  
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

  const [categories, setCategories] = useState<Category[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Show alert function
  const showAlert = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    setAlert({ type, message, isVisible: true });
  };

  const hideAlert = () => {
    setAlert(prev => ({ ...prev, isVisible: false }));
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await categoriesAPI.getAll();
        setCategories(pickArray(res) as Category[]);
      } catch (e) {
        console.warn("Failed to load categories", e);
        setCategories([]);
      }
    })();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      const next = searchInput.trim();

      setCurrentPage((prev) => (prev === 1 ? prev : 1));
      setSearchTerm((prev) => (prev === next ? prev : next));
    }, 400);

    return () => clearTimeout(handler);
  }, [searchInput, setCurrentPage, setSearchTerm]);

  const paginationRange = useMemo(() => {
    const pages: number[] = [];
    const maxButtons = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }, [currentPage, totalPages]);

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem =
    totalItems === 0 ? 0 : Math.min((currentPage - 1) * pageSize + products.length, totalItems);
  const showPagination = totalItems > 0;

  // Export to Excel (.xlsx)
  const exportExcel = () => {
    const worksheetData = [
      ["Name", "SKU", "Category", "MRP", "Wholesale Rate", "Stock", "Status", "Description", "Brand", "Dimensions"],
      ...products.map((p) => [
        p.name ?? "",
        p.sku ?? "",
        p.category_name ?? "",
        String(p.mrp ?? 0),
        String(p.wholesale_rate ?? 0),
        String(p.stock ?? 0),
        p.status ?? "active",
        p.description ?? "",
        p.brand ?? "",
        p.dimensions ?? "",
      ]),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    
    // Auto-size columns
    const maxWidths = worksheetData[0].map((_, colIndex) => {
      return Math.max(
        ...worksheetData.map(row => String(row[colIndex] || "").length)
      );
    });
    worksheet['!cols'] = maxWidths.map(w => ({ wch: Math.min(w + 2, 50) }));
    
    XLSX.writeFile(workbook, "products.xlsx");
    showAlert('success', '✅ Products exported to Excel successfully!');
  };

  // Bulk upload handler
  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls' && ext !== 'csv') {
      showAlert('error', '❌ Please upload a valid Excel file (.xlsx, .xls, or .csv)');
      return;
    }

    setUploading(true);
    try {
      const fileData = await file.arrayBuffer();
      const workbook = XLSX.read(fileData, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        showAlert('error', '❌ Excel file is empty or invalid format');
        setUploading(false);
        return;
      }

      // Get headers (first row)
      const headers = jsonData[0].map((h: any) => String(h || "").toLowerCase().trim());
      
      // Find column indices
      const nameIdx = headers.findIndex(h => h.includes('name'));
      const skuIdx = headers.findIndex(h => h.includes('sku'));
      const categoryIdx = headers.findIndex(h => h.includes('category'));
      const mrpIdx = headers.findIndex(h => h.includes('mrp'));
      const wholesaleIdx = headers.findIndex(h => h.includes('wholesale'));
      const stockIdx = headers.findIndex(h => h.includes('stock'));
      const statusIdx = headers.findIndex(h => h.includes('status'));
      const descIdx = headers.findIndex(h => h.includes('description'));
      const brandIdx = headers.findIndex(h => h.includes('brand'));
      const dimIdx = headers.findIndex(h => h.includes('dimension'));

      if (nameIdx === -1) {
        showAlert('error', '❌ "Name" column not found in Excel file');
        setUploading(false);
        return;
      }

      // Process rows (skip header)
      const productsToImport = [];
      const seenProductNames = new Set<string>(); // Track duplicates in this batch
      
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;

        const name = String(row[nameIdx] || "").trim();
        if (!name) continue; // Skip empty rows

        // Check for duplicate product name in this batch (case-insensitive)
        const nameLower = name.toLowerCase();
        if (seenProductNames.has(nameLower)) {
          console.warn(`Row ${i + 1}: Skipping duplicate product "${name}" in Excel file`);
          continue; // Skip duplicate in same file
        }
        seenProductNames.add(nameLower);

        // Find category by name (case-insensitive matching)
        let categoryId = null;
        let categoryName = "";
        if (categoryIdx >= 0) {
          categoryName = String(row[categoryIdx] || "").trim();
          if (categoryName) {
            // Case-insensitive match with existing categories
            const category = categories.find(c => c.name.toLowerCase().trim() === categoryName.toLowerCase().trim());
            if (category) {
              categoryId = category.id;
            }
          }
        }

        const productData: any = {
          name: name,
          sku: skuIdx >= 0 ? String(row[skuIdx] || "").trim() : "",
          category_id: categoryId,
          category_name: categoryName || undefined, // Also send category name for backend matching
          mrp: mrpIdx >= 0 ? parseFloat(String(row[mrpIdx] || "0")) || null : null,
          wholesale_rate: wholesaleIdx >= 0 ? parseFloat(String(row[wholesaleIdx] || "0")) || null : null,
          stock: stockIdx >= 0 ? parseInt(String(row[stockIdx] || "0")) || 0 : 0,
          status: statusIdx >= 0 ? String(row[statusIdx] || "active").trim().toLowerCase() : "active",
          description: descIdx >= 0 ? String(row[descIdx] || "").trim() : "",
          brand: brandIdx >= 0 ? String(row[brandIdx] || "").trim() : "",
          dimensions: dimIdx >= 0 ? String(row[dimIdx] || "").trim() : "",
          currency: "INR"
        };

        productsToImport.push(productData);
      }

      if (productsToImport.length === 0) {
        showAlert('error', '❌ No valid products found in Excel file');
        setUploading(false);
        return;
      }

      showAlert('info', `⏳ Importing ${productsToImport.length} products, please wait...`);

      let successCount = 0;
      let totalCount = productsToImport.length;
      let resultErrors: string[] = [];

      try {
        const result = await productsAPI.bulkImport(productsToImport);
        successCount = Number(result?.imported || 0);
        totalCount = Number(result?.total || productsToImport.length);
        resultErrors = Array.isArray(result?.errors) ? result.errors.filter(Boolean) : [];
      } catch (bulkError: any) {
        console.warn('Bulk import endpoint failed, falling back to single create calls.', bulkError);
        resultErrors = [];

        for (let i = 0; i < productsToImport.length; i++) {
          try {
            await createProduct(productsToImport[i]);
            successCount++;

            if ((i + 1) % 5 === 0 || i === productsToImport.length - 1) {
              showAlert('info', `⏳ Imported ${successCount}/${productsToImport.length} products...`);
            }
          } catch (rowError: any) {
            const message = rowError?.message || 'Failed to import';
            resultErrors.push(`Row ${i + 2}: ${message}`);
            console.error(`Failed to import product at row ${i + 1}:`, rowError);
          }
        }
      }

      if (resultErrors.length > 0) {
        console.error('Import errors:', resultErrors);
      }

      // Refresh products list
      await fetchProducts();

      // Show final result
      if (successCount > 0) {
        const failedCount = Math.max(totalCount - successCount, resultErrors.length);
        const message = failedCount > 0
          ? `✅ Imported ${successCount}/${totalCount} products. ${failedCount} failed.`
          : `✅ Successfully imported ${successCount} products!`;
        showAlert('success', message);
      } else {
        const errorPreview = resultErrors.slice(0, 3).join('; ') || 'Unknown error';
        showAlert('error', `❌ Failed to import products. ${errorPreview}`);
      }
      

    } catch (error: any) {
      console.error('Bulk upload error:', error);
      showAlert('error', `❌ Error importing products: ${error.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDelete = async (id: number) => {
    try { 
      await deleteProduct(id); 
      showAlert('success', '✅ Product deactivated successfully!');
    } catch (err) { 
      showAlert('error', '❌ Error deactivating product');
    }
  };
  const handleUpdate = async (id: number, data: Partial<Product>) => {
    try { 
      await updateProduct(id, data); 
      setEditingProduct(null);
      showAlert('success', '✅ Product updated successfully!');
    }
    catch (err) { 
      showAlert('error', '❌ Error updating product');
      console.error(err); 
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
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Product Management</h1>
        <p className="text-gray-600">Manage your stationery products</p>
      </div>

      {/* Search + Actions */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative">
            <input
              type="text"
              placeholder="Search products..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
          </div>
          <div className="flex gap-4">
            <button onClick={() => navigate("/admin/products/add")} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">📦 Add New Product</button>
            <button onClick={exportExcel} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">📊 Export Products</button>
            <button 
              onClick={handleUploadClick} 
              disabled={uploading}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {uploading ? "⏳ Uploading..." : "📥 Bulk Upload"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleBulkUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500">Loading products...</div>
        ) : error ? (
          <div className="p-10 text-center text-red-600">Error: {error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3 w-16">#</th>
                  <th className="px-4 py-3 w-64">Product</th>
                  <th className="px-4 py-3 w-32">SKU</th>
                  <th className="px-4 py-3 w-40">Category</th>
                  <th className="px-4 py-3 w-32">MRP</th>
                  <th className="px-4 py-3 w-32">Wholesale</th>
                  <th className="px-4 py-3 w-20">Stock</th>
                  <th className="px-4 py-3 w-28">Status</th>
                  <th className="px-4 py-3 w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product, index) => (
                  <tr key={product.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 font-medium">
                      {startItem + index}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-800 truncate">{product.name}</p>
                        <p className="text-sm text-gray-500 truncate">
                          {(product.description || "").slice(0, 50)}
                          {product.description && product.description.length > 50 ? "…" : ""}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 truncate">{product.sku || "-"}</td>
                    <td className="px-4 py-3 text-gray-600 truncate">{product.category_name || "-"}</td>
                    <td className="px-4 py-3 font-semibold text-green-600">{INR(product.mrp || 0)}</td>
                    <td className="px-4 py-3 font-semibold text-blue-600">{INR(product.wholesale_rate || 0)}</td>
                    <td className="px-4 py-3 text-gray-600">{product.stock ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        product.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}>
                        {product.status || "inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingProduct(product)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit Product"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>

                        {product.status === "active" ? (
                          <button
                            onClick={() => setDeletingProduct(product)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Deactivate Product"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={() => updateProduct(product.id, { status: "active" })}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Activate Product"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-10 text-center text-gray-500">
                      No products found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showPagination && (
        <div className="mt-4 bg-white rounded-xl shadow-lg border border-gray-100">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-4 py-3 text-sm text-gray-600">
            <div>
              {totalItems === 0
                ? "Showing 0 products"
                : `Showing ${startItem}-${endItem} of ${totalItems} products`}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded border border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {paginationRange.map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 rounded border transition-colors ${
                      page === currentPage
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-gray-300 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded border border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Modals --- */}
      {editingProduct && (
        <EditProductModal
          key={editingProduct.id}
          product={editingProduct}
          categories={categories}
          onClose={() => setEditingProduct(null)}
          onSave={(data) => handleUpdate(editingProduct.id, data)}
          onSuccess={async () => {
            setEditingProduct(null);
            showAlert('success', ' Product updated successfully!');
            // Refresh products list
            await fetchProducts();
          }}
        />
      )}

      {deletingProduct && (
        <DeleteConfirm
          product={deletingProduct}
          onClose={() => setDeletingProduct(null)}
          onDelete={() => handleDelete(deletingProduct.id)}
        />
      )}
    </div>
  );
};

export default ProductList;

/* ------------------ Modals ------------------ */

type EditForm = {
  name: string;
  sku?: string;
  mrp: number;
  wholesale_rate: number;
  stock: number;
  status: "active" | "inactive";
  description?: string;
  brand?: string;
  dimensions?: string;
  category_id?: number | "";
};

const EditProductModal: React.FC<{
  product: Product;
  categories: Category[];
  onClose: () => void;
  onSave: (data: Partial<Product>) => void;
  onSuccess?: () => void;
}> = ({ product, categories, onClose, onSave, onSuccess }) => {
  const [form, setForm] = useState<EditForm>({
    name: product.name || "",
    sku: product.sku || "",
    mrp: Number(product.mrp || 0),
    wholesale_rate: Number(product.wholesale_rate || 0),
    stock: Number(product.stock || 0),
    status: (product.status as "active" | "inactive") || "active",
    description: product.description || "",
    brand: product.brand || "",
    dimensions: product.dimensions || "",
    category_id: product.category_id ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const change = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]:
        name === "mrp" || name === "wholesale_rate" || name === "stock"
          ? Number(value)
          : name === "category_id"
            ? (value === "" ? "" : Number(value))
            : value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImageFile(e.target.files[0]);
    }
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const { productsAPI } = await import("../../services/api");
      
      // ✅ Use FormData if image is being uploaded, otherwise JSON
      if (imageFile) {
        const formData = new FormData();
        formData.append("name", form.name);
        formData.append("sku", form.sku || "");
        formData.append("mrp", String(form.mrp || 0));
        formData.append("wholesale_rate", String(form.wholesale_rate || 0));
        formData.append("stock", String(form.stock || 0));
        formData.append("status", form.status);
        formData.append("description", form.description || "");
        formData.append("brand", form.brand || "");
        formData.append("dimensions", form.dimensions || "");
        formData.append("currency", "INR");
        if (form.category_id !== "" && form.category_id !== null) {
          formData.append("category_id", String(form.category_id));
        }
        formData.append("image", imageFile);
        
        const response = await productsAPI.update(product.id, formData);
        // ✅ Show success message
        if (response?.ok || response?.updated) {
          onClose();
          // Trigger success callback if provided
          if (onSuccess) {
            onSuccess();
          } else {
            // Fallback: trigger parent's onSave to refresh
            onSave({});
          }
        } else {
          throw new Error(response?.error || "Update failed");
        }
      } else {
        // empty string -> null (no category)
        const payload: any = { ...form, category_id: form.category_id === "" ? null : form.category_id };
        await onSave(payload);
        onClose();
      }
    } catch (e: any) {
      setError(e?.message || "Failed to save");
      console.error("Update error:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Edit Product</h3>
          <button className="text-gray-500" onClick={onClose}>✖</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">Name</label>
            <input name="name" value={form.name} onChange={change} className="mt-1 w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="text-sm text-gray-600">SKU</label>
            <input name="sku" value={form.sku} onChange={change} className="mt-1 w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Category</label>
            <select
              name="category_id"
              value={form.category_id}
              onChange={change}
              className="mt-1 w-full border rounded-lg px-3 py-2"
            >
              <option value="">— No Category —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600">MRP (₹)</label>
            <input type="number" name="mrp" value={form.mrp} onChange={change} className="mt-1 w-full border rounded-lg px-3 py-2" min={0}/>
          </div>
          <div>
            <label className="text-sm text-gray-600">Wholesale Rate (₹)</label>
            <input type="number" name="wholesale_rate" value={form.wholesale_rate} onChange={change} className="mt-1 w-full border rounded-lg px-3 py-2" min={0}/>
          </div>
          <div>
            <label className="text-sm text-gray-600">Stock</label>
            <input type="number" name="stock" value={form.stock} onChange={change} className="mt-1 w-full border rounded-lg px-3 py-2" min={0}/>
          </div>
          <div>
            <label className="text-sm text-gray-600">Status</label>
            <select name="status" value={form.status} onChange={change} className="mt-1 w-full border rounded-lg px-3 py-2">
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm text-gray-600">Description</label>
            <textarea name="description" value={form.description} onChange={change} className="mt-1 w-full border rounded-lg px-3 py-2" rows={3}/>
          </div>
          <div>
            <label className="text-sm text-gray-600">Brand</label>
            <input name="brand" value={form.brand} onChange={change} className="mt-1 w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Dimensions</label>
            <input name="dimensions" value={form.dimensions} onChange={change} className="mt-1 w-full border rounded-lg px-3 py-2" />
          </div>
          
          {/* ✅ Product Image Upload */}
          <div className="sm:col-span-2">
            <label className="text-sm text-gray-600 mb-2 block">Product Image</label>
            
            {/* New Image Preview */}
            {imageFile && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-2">New Image Preview:</p>
                <img 
                  src={URL.createObjectURL(imageFile)} 
                  alt="Preview" 
                  className="w-32 h-32 object-cover border border-gray-300 rounded-lg"
                />
              </div>
            )}
            
            {/* Image Input */}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {imageFile && (
              <p className="mt-2 text-xs text-gray-600">
                Selected: {imageFile.name}
              </p>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button className="px-4 py-2 rounded-lg border" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50" onClick={submit} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

const DeleteConfirm: React.FC<{
  product: Product;
  onClose: () => void;
  onDelete: () => void;
}> = ({ product, onClose, onDelete }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try { await onDelete(); onClose(); }
    catch (e: any) { setError(e?.message || "Failed to deactivate"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-6">
        <h3 className="text-lg font-semibold mb-2">Deactivate Product</h3>
        <p className="text-sm text-gray-600">
          Are you sure you want to deactivate <span className="font-medium">{product.name}</span>?
        </p>
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button className="px-4 py-2 rounded-lg border" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="px-4 py-2 rounded-lg bg-red-600 text-white disabled:opacity-50" onClick={submit} disabled={busy}>
            {busy ? "Deactivating..." : "Deactivate"}
          </button>
        </div>
      </div>
    </div>
  );
};
