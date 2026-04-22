import React from "react";
import { Navigate } from "react-router-dom";

export default function UserResults() {
  return <Navigate to="/user/profile?tab=history" replace />;
}
