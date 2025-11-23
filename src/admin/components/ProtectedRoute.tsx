import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getLoggedInAdmin } from "./header/UserDropdown";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [needsFirstAdmin, setNeedsFirstAdmin] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const admin = getLoggedInAdmin();
        const adminLoggedIn = localStorage.getItem('admin_logged_in') === 'true';
        
        if (!admin || !adminLoggedIn) {
          // Check if any admin exists in database
          try {
            const { adminsAPI } = await import("../services/api");
            const response: any = await adminsAPI.getAll();
            const admins = response?.items || (Array.isArray(response) ? response : []);
            
            if (admins.length === 0) {
              setNeedsFirstAdmin(true);
              setIsAuthenticated(false);
              setIsChecking(false);
              return;
            }
          } catch (e) {
            console.error("Error checking admins:", e);
            // If API fails, still show signin
            setIsAuthenticated(false);
            setIsChecking(false);
            return;
          }
          
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setIsAuthenticated(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
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

  if (!isAuthenticated) {
    if (needsFirstAdmin) {
      // Redirect to signup for first admin creation
      return <Navigate to="/admin/signup" replace />;
    }
    return <Navigate to="/admin/signin" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

