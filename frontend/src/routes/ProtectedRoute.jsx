import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";

export default function ProtectedRoute({ children }) {
  const { token, mustChangePassword } = useAuth();
  const location = useLocation();
  if (!token) return <Navigate to="/login" replace />;
  if (mustChangePassword && location.pathname !== "/user/change-password") {
    return <Navigate to="/user/change-password" replace />;
  }
  return children;
}
