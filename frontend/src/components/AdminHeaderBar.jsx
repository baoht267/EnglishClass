import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";

export default function AdminHeaderBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.name || "Admin";

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="adminHeaderBar">
      <div className="adminHeaderBrand">
        <div className="adminBrandIcon">A</div>
        <div>
          <div className="adminBrandTitle">Admin Panel</div>
          <div className="adminBrandSub">Xin chào, {displayName}</div>
        </div>
      </div>
      <button className="adminLogoutBtn" onClick={onLogout}>
        Thoát Admin
      </button>
    </div>
  );
}
