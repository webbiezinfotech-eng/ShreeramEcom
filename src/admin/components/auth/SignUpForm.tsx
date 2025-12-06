import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
import { adminsAPI } from "../../services/api";

// Simple inline components to replace deleted imports
const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
    {children}
  </label>
);

const Input = ({ type = "text", placeholder, id, name, ...props }: any) => (
  <input
    type={type}
    id={id}
    name={name}
    placeholder={placeholder}
    className="w-full px-4 py-3.5 text-base border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
    {...props}
  />
);

const Checkbox = ({ checked, onChange, className = "" }: { checked: boolean; onChange: (checked: boolean) => void; className?: string }) => (
  <input
    type="checkbox"
    checked={checked}
    onChange={(e) => onChange(e.target.checked)}
    className={`w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 ${className}`}
  />
);

export default function SignUpForm() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [adminExists, setAdminExists] = useState(false);

  // Check if admin already exists
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response: any = await adminsAPI.getAll();
        const admins = response?.items || (Array.isArray(response) ? response : []);
        setAdminExists(admins.length > 0);
      } catch (e: any) {
        // If network error, show message
        if (e?.isNetworkError || e?.message?.includes('fetch')) {
          setError(`Cannot connect to server. Please check if API is accessible.`);
        }
        console.error("Error checking admins:", e);
      } finally {
        setCheckingAdmin(false);
      }
    };
    checkAdmin();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError("All fields are required!");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters!");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      setError("Please enter a valid email address!");
      return;
    }

    setLoading(true);
    try {
      const response: any = await adminsAPI.create({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      if (response?.success && response?.admin) {
        // Auto-login after signup
        localStorage.setItem('admin_id', response.admin.id);
        localStorage.setItem('admin', JSON.stringify(response.admin));
        localStorage.setItem('admin_logged_in', 'true');
        
        // Redirect to admin dashboard
        navigate("/admin");
      } else {
        setError(response?.error || "Failed to create admin account");
      }
    } catch (err: any) {
      // Better error messages
      if (err?.isNetworkError || err?.message?.includes('fetch') || err?.message?.includes('network')) {
        setError(`Cannot connect to server. Please check if the API server is running at ${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}`);
      } else if (err?.status === 401) {
        setError("Unauthorized. Please check API key configuration.");
      } else if (err?.status === 403) {
        setError(err?.message || "Admin account already exists. Only one admin is allowed.");
      } else if (err?.status === 409) {
        setError("Email already registered. Please use a different email.");
      } else if (err?.message) {
        setError(err.message);
      } else {
        setError("Failed to create admin account. Please check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingAdmin) {
    return (
      <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar px-4 sm:px-6">
        <div className="flex items-center justify-center flex-1 min-h-screen lg:min-h-0">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Checking...</p>
          </div>
        </div>
      </div>
    );
  }

  if (adminExists) {
    return (
      <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar px-4 sm:px-6">
        <div className="flex items-center justify-center flex-1 min-h-screen lg:min-h-0 py-12">
          <div className="text-center max-w-md p-6">
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Admin Already Exists</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Only one admin account is allowed. Please sign in instead.
            </p>
            <Link
              to="/admin/signin"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar px-6 sm:px-8 lg:px-12 xl:px-16">
      <div className="w-full max-w-lg mx-auto mb-6 pt-8 sm:pt-12 lg:pt-16">
        <Link
          to="/"
          className="inline-flex items-center text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ChevronLeftIcon className="size-5 mr-1" />
          Back to dashboard
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-lg mx-auto pb-8 sm:pb-12">
        <div>
          <div className="mb-8 sm:mb-10">
            <h1 className="mb-3 text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              Sign Up
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-400">
              Create your admin account to get started
            </p>
          </div>
          <div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}
                {/* <!-- Full Name --> */}
                <div>
                  <Label>
                    Full Name<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    id="name"
                    name="name"
                    placeholder="Enter your full name"
                    value={form.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                {/* <!-- Email --> */}
                <div>
                  <Label>
                    Email<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="admin@example.com"
                    value={form.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
                {/* <!-- Password --> */}
                <div>
                  <Label>
                    Password<span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="Enter your password (min 6 characters)"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, password: e.target.value })}
                      required
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      )}
                    </span>
                  </div>
                </div>
                {/* <!-- Confirm Password --> */}
                <div>
                  <Label>
                    Confirm Password<span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="Confirm your password"
                      type={showPassword ? "text" : "password"}
                      value={form.confirmPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                </div>
                {/* <!-- Checkbox --> */}
                <div className="flex items-center gap-3">
                  <Checkbox
                    className="w-5 h-5"
                    checked={isChecked}
                    onChange={setIsChecked}
                  />
                  <p className="inline-block font-normal text-gray-500 dark:text-gray-400">
                    By creating an account means you agree to the{" "}
                    <span className="text-gray-800 dark:text-white/90">
                      Terms and Conditions,
                    </span>{" "}
                    and our{" "}
                    <span className="text-gray-800 dark:text-white">
                      Privacy Policy
                    </span>
                  </p>
                </div>
                {/* <!-- Button --> */}
                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={loading || !isChecked}
                    className="flex items-center justify-center w-full px-6 py-4 text-base font-semibold text-white transition-all rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating Account...
                      </>
                    ) : (
                      "Create Admin Account"
                    )}
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm font-normal text-center text-gray-600 dark:text-gray-400">
                Already have an account?{" "}
                <Link
                  to="/admin/signin"
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
