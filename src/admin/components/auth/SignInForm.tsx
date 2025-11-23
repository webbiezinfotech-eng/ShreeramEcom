import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
import { adminsAPI } from "../../services/api";

// Simple inline components to replace deleted imports
const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
    {children}
  </label>
);

const Input = ({ type = "text", placeholder, ...props }: any) => (
  <input
    type={type}
    placeholder={placeholder}
    className="w-full px-4 py-3.5 text-base border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
    {...props}
  />
);

const Checkbox = ({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) => (
  <input
    type="checkbox"
    checked={checked}
    onChange={(e) => onChange(e.target.checked)}
    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
  />
);

export default function SignInForm() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password to continue.");
      return;
    }

    setLoading(true);
    try {
      const response: any = await adminsAPI.login(email.trim(), password);
      
      if (response?.ok && response?.admin) {
        // Store admin info in localStorage
        localStorage.setItem('admin_id', response.admin.id);
        localStorage.setItem('admin', JSON.stringify(response.admin));
        localStorage.setItem('admin_logged_in', 'true');
        
        // Redirect to admin dashboard
        navigate("/admin");
      } else {
        // Extract error message from response
        let errorMsg = "Invalid email or password. Please check your credentials and try again.";
        
        if (response?.error) {
          if (typeof response.error === 'string') {
            errorMsg = response.error;
          } else if (response.error?.message) {
            errorMsg = response.error.message;
          }
        }
        
        setError(errorMsg);
      }
    } catch (err: any) {
      // Handle error with professional message
      let errorMsg = "Unable to sign in. Please try again.";
      
      // Check if error response contains structured error info
      if (err?.response) {
        const response = err.response;
        if (typeof response === 'object' && response.error) {
          errorMsg = typeof response.error === 'string' ? response.error : "Invalid credentials";
        }
      }
      
      // Check error message
      if (err?.message) {
        // Try to extract error from JSON string if present
        try {
          const parsed = JSON.parse(err.message);
          if (parsed?.error) {
            errorMsg = typeof parsed.error === 'string' ? parsed.error : "Invalid credentials";
          } else {
            errorMsg = err.message;
          }
        } catch {
          // Not JSON, check if it contains error field pattern
          const errorMatch = err.message.match(/"error":\s*"([^"]+)"/);
          if (errorMatch && errorMatch[1]) {
            errorMsg = errorMatch[1];
          } else {
            errorMsg = err.message;
          }
        }
      }
      
      // Provide user-friendly messages based on status codes
      if (err?.status === 401) {
        errorMsg = "Invalid email or password. Please check your credentials and try again.";
      } else if (err?.status === 403) {
        errorMsg = "Access denied. Please contact your administrator.";
      } else if (err?.status === 404) {
        errorMsg = "Service not found. Please check your connection.";
      } else if (err?.status >= 500) {
        errorMsg = "Server error. Please try again later.";
      } else if (errorMsg.includes('Network') || errorMsg.includes('fetch') || errorMsg.includes('Failed to fetch')) {
        errorMsg = "Network error. Please check your internet connection and try again.";
      }
      
      // Final cleanup - ensure clean message without JSON artifacts
      if (errorMsg.includes('{"ok":false')) {
        errorMsg = "Invalid email or password. Please check your credentials and try again.";
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

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
              Sign In
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-400">
              Welcome back! Please enter your credentials
            </p>
          </div>
          <div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
                {error && (
                  <div className="relative bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-400 rounded-lg p-4 shadow-sm">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-500 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-red-800 dark:text-red-300">
                          {error}
                        </p>
                      </div>
                      <div className="ml-auto pl-3">
                        <button
                          type="button"
                          onClick={() => setError("")}
                          className="inline-flex text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 focus:outline-none"
                        >
                          <span className="sr-only">Dismiss</span>
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <div>
                  <Label>
                    Email <span className="text-error-500">*</span>{" "}
                  </Label>
                  <Input 
                    type="email"
                    placeholder="admin@example.com" 
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>
                    Password <span className="text-error-500">*</span>{" "}
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={isChecked} onChange={setIsChecked} />
                    <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                      Keep me logged in
                    </span>
                  </div>
                </div>
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center w-full px-6 py-4 text-base font-semibold text-white transition-all rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm font-normal text-center text-gray-600 dark:text-gray-400">
                Need to create admin account?{" "}
                <Link
                  to="/admin/signup"
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold"
                >
                  Create Admin
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
