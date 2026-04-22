import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";

const THEME_KEY = "portal-theme";

export default function Shell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const role = user?.role;
  const isHome = location.pathname === "/" || location.pathname === "/user";
  const isAdminLayout =
    location.pathname.startsWith("/admin") && location.pathname !== "/admin-setup";
  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/admin-setup" ||
    location.pathname === "/forgot-password" ||
    location.pathname === "/reset-password";
  const isChangePassword = location.pathname === "/user/change-password";
  const isUserArea = location.pathname.startsWith("/user");
  const showThemeToggle = !isAuthPage;

  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
    const prefersDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.dataset.theme = theme;
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  const containerClass = isAuthPage || isChangePassword
    ? "container authContainer"
    : isHome
      ? "container homeContainer"
      : isAdminLayout
        ? "container adminContainer"
        : isUserArea
          ? "container portalContainer"
          : "container";

  return (
    <div className={containerClass}>
      <div>{children}</div>
      {showThemeToggle && (
        <button
          type="button"
          className={`themeToggle ${theme === "dark" ? "is-dark" : "is-light"}`}
          onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          <span className="material-symbols-outlined">
            {theme === "dark" ? "light_mode" : "dark_mode"}
          </span>
        </button>
      )}
    </div>
  );
}
