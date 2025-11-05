import { useEffect, useState } from "react";
import { customersAPI } from "../services/api";

export type Customer = {
  id: number;
  name: string;
  firm?: string;
  address?: string;
  email: string;
  phone?: string;
  status: string;
  created_at?: string;
};

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    vip: 0,
    inactive: 0,
  });

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await customersAPI.getAll(1, 100, { q: search, status });
      if (Array.isArray(data)) {
        setCustomers(data);

        const total = data.length;
        const active = data.filter((c) => c.status === "true").length;
        const inactive = data.filter((c) => c.status === "false").length;
        const vip = data.filter((c) => c.status === "VIP").length;
        setStats({ total, active, vip, inactive });
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  };

  const addCustomer = async (customer: Partial<Customer>) => {
    await customersAPI.create(customer);
    fetchCustomers();
  };

  const updateCustomer = async (id: number, customer: Partial<Customer>) => {
    await customersAPI.update(id, customer);
    fetchCustomers();
  };

  const deleteCustomer = async (id: number) => {
    await customersAPI.delete(id);
    fetchCustomers();
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, status]);

  return {
    customers,
    stats,
    loading,
    error,
    search,
    setSearch,
    status,
    setStatus,
    fetchCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
  };
}
