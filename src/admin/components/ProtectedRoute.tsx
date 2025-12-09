import React from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // Temporarily disabled for testing
  return <>{children}</>;
};

export default ProtectedRoute;
