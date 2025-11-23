import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";
import { getLoggedInAdmin } from "../../components/header/UserDropdown";

export default function SignIn() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const admin = getLoggedInAdmin();
    const adminLoggedIn = localStorage.getItem('admin_logged_in') === 'true';
    
    if (admin && adminLoggedIn) {
      setIsAuthenticated(true);
    }
    setIsChecking(false);
  }, []);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <>
      <PageMeta
        title="Admin Sign In | Shreeram Stationery"
        description="Admin login page for Shreeram Stationery"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
