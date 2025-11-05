import React, { useState } from "react";
import { useCustomers, Customer } from "../hooks/useCustomers";
import Alert from "../components/Alert";

const CustomerPage: React.FC = () => {
  const {
    customers,
    stats,
    loading,
    search,
    setSearch,
    status,
    setStatus,
    addCustomer,
    updateCustomer,
    deleteCustomer,
  } = useCustomers();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [selected, setSelected] = useState<Customer | null>(null);
  const [form, setForm] = useState<Partial<Customer>>({});
  
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
  
  // Show alert function
  const showAlert = (type: 'success' | 'error' | 'warning' | 'info', message: string): void => {
    setAlert({ type, message, isVisible: true });
  };

  const hideAlert = () => {
    setAlert(prev => ({ ...prev, isVisible: false }));
  };

  // ✅ Add
  const handleAdd = async () => {
    // Validate required fields
    if (!form.name || !form.name.trim()) {
      showAlert('error', '❌ Name is required!');
      return;
    }
    if (!form.email || !form.email.trim()) {
      showAlert('error', '❌ Email is required!');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      showAlert('error', '❌ Please enter a valid email address!');
      return;
    }

    try {
      await addCustomer(form);
      setIsAddOpen(false);
      setForm({});
      showAlert('success', ' Customer added successfully!');
    } catch (error) {
      showAlert('error', ' Failed to add customer');
    }
  };

  // ✅ Edit
  const handleEdit = async () => {
    if (!selected) return;
    
    // Validate required fields
    if (!form.name || !form.name.trim()) {
      showAlert('error', 'Name is required!');
      return;
    }
    if (!form.email || !form.email.trim()) {
      showAlert('error', 'Email is required!');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      showAlert('error', ' Please enter a valid email address!');
      return;
    }

    try {
      await updateCustomer(selected.id, form);
      setIsEditOpen(false);
      setForm({});
      showAlert('success', 'Customer updated successfully!');
    } catch (error) {
      showAlert('error', 'Failed to update customer');
    }
  };

  // ✅ Delete Confirmed
  const handleDelete = async () => {
    if (!selected) return;
    try {
      await deleteCustomer(selected.id);
      setIsDeleteOpen(false);
      setSelected(null);
      showAlert('success', 'Customer deleted successfully!');
    } catch (error) {
      showAlert('error', 'Failed to delete customer');
    }
  };

  // ✅ Export Customers (CSV)
  const handleExport = () => {
    if (!customers.length) {
      showAlert('warning', "⚠️ No customers to export");
      return;
    }

    const header = ["ID", "Name", "Firm", "Email", "Phone", "Address", "Status"];
    const rows = customers.map((c) => [
      `CUST-${c.id.toString().padStart(3, "0")}`,
      c.name,
      c.firm || "",
      c.email,
      c.phone,
      c.address,
      c.status === "true"
        ? "Active"
        : c.status === "false"
        ? "Inactive" 
        : ""
    ]);

    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "customers.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Alert Component */}
      <Alert
        type={alert.type}
        message={alert.message}
        isVisible={alert.isVisible}
        onClose={hideAlert}
        duration={4000}
      />
      <h2 className="text-2xl font-bold">Customer Management</h2>
      <p className="text-gray-500 mb-4">
        Manage your stationery business customers
      </p>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card title="Total Customers" value={stats.total} color="blue" />
        <Card title="Active" value={stats.active} color="green" />
        <Card title="Inactive" value={stats.inactive} color="red" />
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>

        </select>

        <input
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-3 py-2 rounded w-64"
        />
      </div>

      {/* Table */}
      <div className="bg-white shadow rounded overflow-x-auto">
        {loading ? (
          <p className="p-4">Loading...</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2 border">Customer ID</th>
                <th className="p-2 border">Name</th>
                <th className="p-2 border">Firm</th>
                <th className="p-2 border">Email</th>
                <th className="p-2 border">Phone</th>
                <th className="p-2 border">Address</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td className="p-2 border">
                    CUST-{c.id.toString().padStart(3, "0")}
                  </td>
                  <td className="p-2 border">{c.name}</td>
                  <td className="p-2 border">{c.firm}</td>
                  <td className="p-2 border">{c.email}</td>
                  <td className="p-2 border">{c.phone}</td>
                  <td className="p-2 border">{c.address}</td>
                  <td className="p-2 border">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        c.status === "true"
                          ? "bg-green-100 text-green-700"
                          : c.status === "false"
                          ? "bg-red-100 text-red-700"
                          : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {c.status === "true"
                        ? "Active"
                        : c.status === "false"
                        ? "Inactive"
                        : ""}
                    </span>
                  </td>
                  <td className="p-2 border space-x-2">
                    <button
                      onClick={() => {
                        setSelected(c);
                        setIsViewOpen(true);
                      }}
                      className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                    >
                      👁
                    </button>
                    <button
                      onClick={() => {
                        setSelected(c);
                        setForm(c);
                        setIsEditOpen(true);
                      }}
                      className="px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded text-blue-600"
                    >
                      ✏️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Bottom Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setIsAddOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Add New Customer
        </button>
        <button
          onClick={handleExport}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Export Customers
        </button>
        <button
          onClick={() => showAlert('info', "ℹ️ Newsletter feature coming soon!")}
          className="bg-orange-600 text-white px-4 py-2 rounded"
        >
          Send Newsletter
        </button>
      </div>

      {/* Modals */}
      {isAddOpen && (
        <FormModal
          title="Add Customer"
          form={form}
          setForm={setForm}
          onClose={() => setIsAddOpen(false)}
          onSubmit={handleAdd}
        />
      )}
      {isEditOpen && selected && (
        <FormModal
          title="Edit Customer"
          form={form}
          setForm={setForm}
          onClose={() => setIsEditOpen(false)}
          onSubmit={handleEdit}
        />
      )}
      {isViewOpen && selected && (
        <ViewModal
          customer={selected}
          onClose={() => setIsViewOpen(false)}
        />
      )}
      {isDeleteOpen && selected && (
        <DeleteConfirmModal
          customer={selected}
          onClose={() => setIsDeleteOpen(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
};

export default CustomerPage;

// ---------------- Card ----------------
const Card = ({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: string;
}) => (
  <div className="bg-white shadow rounded p-4 text-center">
    <div className={`text-2xl font-bold text-${color}-600`}>{value}</div>
    <div>{title}</div>
  </div>
);

// ---------------- Form Modal ----------------
const FormModal = ({
  title,
  form,
  setForm,
  onClose,
  onSubmit,
}: {
  title: string;
  form: Partial<Customer>;
  setForm: React.Dispatch<React.SetStateAction<Partial<Customer>>>;
  onClose: () => void;
  onSubmit: () => void;
}) => (
  <div 
    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
    style={{ top: 0, left: 0, right: 0, bottom: 0 }}
    onClick={onClose}
  >
    <div 
      className="bg-white rounded-lg shadow-xl p-6 w-[500px] max-h-[90vh] overflow-y-auto relative"
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="text-lg font-bold mb-4">{title}</h3>
      <div className="space-y-3">
        <div>
          <input
            placeholder="name *"
            value={form.name || ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>
        <div>
          <input
            placeholder="email *"
            type="email"
            value={form.email || ""}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>
        <div>
          <input
            placeholder="firm"
            value={form.firm || ""}
            onChange={(e) => setForm({ ...form, firm: e.target.value })}
            className="w-full border px-3 py-2 rounded"
          />
        </div>
        <div>
          <input
            placeholder="phone"
            value={form.phone || ""}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full border px-3 py-2 rounded"
          />
        </div>
        <div>
          <input
            placeholder="address"
            value={form.address || ""}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full border px-3 py-2 rounded"
          />
        </div>
        <select
          value={form.status || "true"}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="w-full border px-3 py-2 rounded"
        >
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-2 rounded border">
          Cancel
        </button>
        <button
          onClick={onSubmit}
          className="px-4 py-2 rounded bg-blue-600 text-white"
        >
          Save
        </button>
      </div>
    </div>
  </div>
);

// ---------------- View Modal ----------------
const ViewModal = ({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}) => (
  <div 
    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
    style={{ top: 0, left: 0, right: 0, bottom: 0 }}
    onClick={onClose}
  >
    <div 
      className="bg-white rounded-lg shadow-xl p-6 w-[500px] relative"
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="text-lg font-bold mb-4">Customer Details</h3>
      <div className="space-y-2">
        <p><strong>Name:</strong> {customer.name}</p>
        <p><strong>Firm:</strong> {customer.firm}</p>
        <p><strong>Email:</strong> {customer.email}</p>
        <p><strong>Phone:</strong> {customer.phone}</p>
        <p><strong>Address:</strong> {customer.address}</p>
        <p><strong>Status:</strong> {customer.status}</p>
      </div>
      <div className="flex justify-end mt-4">
        <button onClick={onClose} className="px-4 py-2 rounded border">
          Close
        </button>
      </div>
    </div>
  </div>
);

// ---------------- Delete Confirm Modal ----------------
const DeleteConfirmModal = ({
  customer,
  onClose,
  onConfirm,
}: {
  customer: Customer;
  onClose: () => void;
  onConfirm: () => void;
}) => (
  <div 
    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
    style={{ top: 0, left: 0, right: 0, bottom: 0 }}
    onClick={onClose}
  >
    <div 
      className="bg-white rounded-lg shadow-xl p-6 w-[500px] relative"
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="text-lg font-bold mb-4">Confirm Delete Customer</h3>
      <div className="mb-6 space-y-2 text-left">
        <p className="text-red-600 font-semibold mb-3">
          Are you sure you want to delete this customer? This action cannot be undone.
        </p>
        <div className="border rounded-lg p-4 bg-gray-50 space-y-2">
          <p><strong>Customer ID:</strong> CUST-{customer.id.toString().padStart(3, "0")}</p>
          <p><strong>Name:</strong> {customer.name}</p>
          {customer.firm && <p><strong>Firm:</strong> {customer.firm}</p>}
          <p><strong>Email:</strong> {customer.email}</p>
          {customer.phone && <p><strong>Phone:</strong> {customer.phone}</p>}
          {customer.address && <p><strong>Address:</strong> {customer.address}</p>}
          <p><strong>Status:</strong> 
            <span className={`ml-2 px-2 py-1 rounded text-xs ${
              customer.status === "true"
                ? "bg-green-100 text-green-700"
                : customer.status === "false"
                ? "bg-red-100 text-red-700"
                : "bg-purple-100 text-purple-700"
            }`}>
              {customer.status === "true"
                ? "Active"
                : customer.status === "false"
                ? "Inactive"
                : customer.status}
            </span>
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded border hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
        >
          Delete Customer
        </button>
      </div>
    </div>
  </div>
);
