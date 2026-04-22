import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/index.js";

const useQuery = () => {
  return useMemo(() => new URLSearchParams(window.location.search), []);
};

export default function ResetPassword() {
  const query = useQuery();
  const navigate = useNavigate();
  const email = query.get("email") || "";
  const token = query.get("token") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!email || !token) {
      setError("Invalid or missing reset link.");
      return;
    }
    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Confirm password does not match.");
      return;
    }
    setLoading(true);
    try {
      const data = await api.resetPassword({
        email,
        token,
        newPassword
      });
      setSuccess(data?.message || "Password updated. Redirecting to login...");
      setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (err) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="authSimplePage">
      <div className="authSimpleCard">
        <h1>Reset Password</h1>
        <p>Create a new password for your account.</p>

        <form onSubmit={onSubmit} className="authSimpleForm">
          <label htmlFor="newPassword">New Password</label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            disabled={loading}
            required
          />

          <label htmlFor="confirmPassword">Confirm New Password</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat your new password"
            autoComplete="new-password"
            disabled={loading}
            required
          />

          {error && <div className="authSimpleAlert error">{error}</div>}
          {success && <div className="authSimpleAlert success">{success}</div>}

          <button className="authSimpleBtn" type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>

        <div className="authSimpleFooter">
          <Link to="/login">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}
