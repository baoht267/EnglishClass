import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api/index.js";
import { useAuth } from "../../state/AuthContext.jsx";

const EyeIcon = ({ open }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    style={{ display: "block" }}
  >
    {open ? (
      <>
        <path
          d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      </>
    ) : (
      <>
        <path
          d="M4 4l16 16"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M10.6 6.2a8.5 8.5 0 0 1 1.4-.2c5.5 0 9 6 9 6a16.3 16.3 0 0 1-3.1 3.7"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M6.2 7.3C4 9.2 3 12 3 12s3.5 6 9 6c1.3 0 2.5-.2 3.5-.6"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </>
    )}
  </svg>
);

export default function ChangePassword() {
  const { token, user, setMustChangePassword } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .me(token)
      .then((data) => {
        if (active) setProfile(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [token]);

  const displayName = profile?.name || user?.name || "User";
  const roleLabel =
    (profile?.role || user?.role) === "ADMIN" ? "Admin Account" : "Student Account";

  const initials = useMemo(() => {
    const value = (displayName || "User").trim();
    if (!value) return "U";
    const parts = value.split(/\s+/).filter(Boolean);
    return (parts[0]?.[0] || "U").toUpperCase();
  }, [displayName]);

  const strength = useMemo(() => {
    const value = newPassword || "";
    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
    if (/\d/.test(value) || /[^A-Za-z0-9]/.test(value)) score += 1;
    const percent = Math.min(100, (score / 3) * 100);
    const label = score >= 3 ? "Strong" : score === 2 ? "Good" : "Weak";
    return { percent, label };
  }, [newPassword]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
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
      await api.changeMyPassword(token, {
        currentPassword,
        newPassword
      });
      setMustChangePassword(false);
      setSuccess("Password updated successfully. Redirecting...");
      const role = user?.role;
      setTimeout(() => {
        navigate(role === "ADMIN" ? "/admin/dashboard" : "/user", { replace: true });
      }, 800);
    } catch (err) {
      setError(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="changeWrap">
      <header className="changeTopbar">
        <div className="changeBrand">
          <img className="changeLogo" src="/logo.png" alt="English Portal" />
          <span>English Portal</span>
        </div>
        <div className="changeUser">
          <div className="changeUserMeta">
            <strong>{displayName}</strong>
            <span>{roleLabel}</span>
          </div>
          <div className="changeAvatar">{initials}</div>
        </div>
      </header>

      <main className="changeMain">
        <div className="changeMainInner">
          <Link className="changeBack" to="/user">
            ← Back to Home
          </Link>

          <div className="changeCard">
            <h2>Change Password</h2>
            <p>
              Ensure your account stays secure with a strong and unique password.
            </p>

            <form onSubmit={onSubmit} noValidate>
              <div className="changeField">
                <label htmlFor="currentPassword">Current Password</label>
                <div className="changeInput">
                  <input
                    id="currentPassword"
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Enter current password"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    className="changeIconBtn"
                    onClick={() => setShowCurrent((prev) => !prev)}
                    aria-label={showCurrent ? "Hide password" : "Show password"}
                  >
                    <EyeIcon open={showCurrent} />
                  </button>
                </div>
              </div>

              <div className="changeField">
                <label htmlFor="newPassword">New Password</label>
                <div className="changeInput">
                  <input
                    id="newPassword"
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Min. 8 characters"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    className="changeIconBtn"
                    onClick={() => setShowNew((prev) => !prev)}
                    aria-label={showNew ? "Hide password" : "Show password"}
                  >
                    <EyeIcon open={showNew} />
                  </button>
                </div>
                <div className="changeStrength">
                  <span>Password Strength</span>
                  <div className="changeStrengthBar">
                    <div style={{ width: `${strength.percent}%` }} />
                  </div>
                  <strong>{strength.label}</strong>
                </div>
              </div>

              <div className="changeField">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <div className="changeInput">
                  <input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Repeat your new password"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    className="changeIconBtn"
                    onClick={() => setShowConfirm((prev) => !prev)}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    <EyeIcon open={showConfirm} />
                  </button>
                </div>
              </div>

              {error && (
                <div className="callout error" role="alert">
                  {error}
                </div>
              )}
              {success && (
                <div className="callout success" role="status">
                  {success}
                </div>
              )}

              <button className="btn primary wide" type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>

            <div className="changeNote">
              A strong password contains at least 8 characters, including a mix of
              letters, numbers, and symbols. Avoid using common words or personal
              information.
            </div>
          </div>

          <div className="changeFooter">
            © 2026 English Portal. All rights reserved.
          </div>
        </div>
      </main>
    </div>
  );
}
