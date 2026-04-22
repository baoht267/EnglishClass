import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/index.js";

export default function AdminSetup() {
  const [adminSecret, setAdminSecret] = useState("");
  const [name, setName] = useState("Admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [promoteEmail, setPromoteEmail] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);
  const [promoting, setPromoting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setOk("");
    setLoading(true);
    try {
      await api.registerAdmin({ adminSecret, name, email, password });
      setOk("Tạo admin thành công. Hãy đăng nhập bằng tài khoản vừa tạo.");
    } catch (err) {
      setError(err.message || "Create admin failed");
    } finally {
      setLoading(false);
    }
  };

  const onPromote = async (e) => {
    e.preventDefault();
    setError("");
    setOk("");
    setPromoting(true);
    try {
      await api.promoteAdmin({ adminSecret, email: promoteEmail });
      setOk("Nâng quyền ADMIN thành công. Hãy đăng xuất và đăng nhập lại để nhận token mới.");
    } catch (err) {
      setError(err.message || "Promote failed");
    } finally {
      setPromoting(false);
    }
  };

  return (
    <div className="card span6 center">
      <h2>Tạo tài khoản admin (dev)</h2>
      <p className="muted">
        Backend yêu cầu <code>ADMIN_SECRET</code> trong <code>backend/.env</code>.
      </p>
      <div className="item" style={{ marginBottom: 12 }}>
        <div className="item-title">Tip</div>
        <div className="muted">
          Nếu bạn đã đăng ký user trước đó, hãy dùng phần “Nâng quyền ADMIN” bên dưới.
        </div>
      </div>
      <form onSubmit={onSubmit}>
        <div className="field">
          <label>ADMIN_SECRET</label>
          <input
            value={adminSecret}
            placeholder="Nhập ADMIN_SECRET"
            onChange={(e) => setAdminSecret(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label>Email</label>
          <input
            value={email}
            type="email"
            autoComplete="email"
            placeholder="admin@email.com"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            value={password}
            type="password"
            autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <div className="callout error">{error}</div>}
        {ok && <div className="callout success">{ok}</div>}
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn primary" disabled={loading}>
            {loading ? "Đang tạo..." : "Tạo admin"}
          </button>
          <Link className="btn" to="/login">
            Đăng nhập
          </Link>
        </div>
      </form>

      <div className="item" style={{ marginTop: 14 }}>
        <div className="item-title">Nâng quyền ADMIN (dev)</div>
        <form onSubmit={onPromote} style={{ marginTop: 10 }}>
          <div className="field">
            <label>Email user cần nâng quyền</label>
            <input
              value={promoteEmail}
              type="email"
              autoComplete="email"
              onChange={(e) => setPromoteEmail(e.target.value)}
              placeholder="user@gmail.com"
              required
            />
          </div>
          <div className="row">
            <button className="btn primary" disabled={promoting}>
              {promoting ? "Đang nâng quyền..." : "Nâng quyền"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
