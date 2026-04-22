import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";
import { api } from "../api/index.js";

export default function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { token } = useAuth();
  const [profile, setProfile] = useState({ name: "Admin", role: "Administrator" });
  const isActive = (path) => location.pathname === path;

  const onLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    let alive = true;
    if (!token) return;
    api
      .me(token)
      .then((data) => {
        if (!alive) return;
        setProfile({
          name: data?.name || "Admin",
          role: data?.role === "ADMIN" ? "Administrator" : "User"
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [token]);

  const avatarLetter = (profile.name || "A").trim().charAt(0).toUpperCase();

  return (
    <aside className="adminProSidebar">
      <div className="adminProBrand">
        <img className="adminProLogo" src="/logo.png" alt="English Portal" />
        <div>
          <strong>English Portal</strong>
          <span>Admin Console</span>
        </div>
      </div>

      <nav className="adminProNav">
        <Link className={isActive("/admin/dashboard") ? "active" : ""} to="/admin/dashboard">
          <span className="material-symbols-outlined">dashboard</span>
          Dashboard
        </Link>
        <Link className={isActive("/admin/questions") ? "active" : ""} to="/admin/questions">
          <span className="material-symbols-outlined">quiz</span>
          Question Bank
        </Link>
        <Link className={isActive("/admin/vocabularies") ? "active" : ""} to="/admin/vocabularies">
          <span className="material-symbols-outlined">auto_stories</span>
          Vocabulary
        </Link>
        <Link className={isActive("/admin/topics") ? "active" : ""} to="/admin/topics">
          <span className="material-symbols-outlined">category</span>
          Topics
        </Link>
        <Link className={isActive("/admin/exams") ? "active" : ""} to="/admin/exams">
          <span className="material-symbols-outlined">fact_check</span>
          Test Management
        </Link>
        <Link className={isActive("/admin/exam-manager") ? "active" : ""} to="/admin/exam-manager">
          <span className="material-symbols-outlined">assignment</span>
          Exam Management
        </Link>
        <Link className={isActive("/admin/users") ? "active" : ""} to="/admin/users">
          <span className="material-symbols-outlined">group</span>
          User Management
        </Link>
        <Link className={isActive("/admin/messages") ? "active" : ""} to="/admin/messages">
          <span className="material-symbols-outlined">mail</span>
          Messages
        </Link>
        <Link className={isActive("/admin/results") ? "active" : ""} to="/admin/results">
          <span className="material-symbols-outlined">bar_chart</span>
          Reports
        </Link>
        <div className="adminProDivider" />
        <button type="button">
          <span className="material-symbols-outlined">settings</span>
          Settings
        </button>
      </nav>

      <div className="adminProSidebarSpacer" />

      <div className="adminProUserCard">
        <div className="adminProAvatar">{avatarLetter}</div>
        <div>
          <strong>{profile.name}</strong>
          <span>{profile.role}</span>
        </div>
        <button type="button" className="adminProLogoutBtn" onClick={onLogout} title="Logout">
          <span className="material-symbols-outlined">logout</span>
        </button>
      </div>
    </aside>
  );
}
