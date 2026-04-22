import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../api/index.js";
import { useAuth } from "../../state/AuthContext.jsx";
import AdminSidebar from "../../components/AdminSidebar.jsx";
import "../../adminVocabulary.css";

const emptyForm = () => ({ name: "" });

export default function AdminTopics() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.listTopics(token);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!ok) return;
    const timer = setTimeout(() => setOk(""), 5000);
    return () => clearTimeout(timer);
  }, [ok]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => item.name?.toLowerCase().includes(term));
  }, [items, search]);

  const onAddNew = () => {
    setEditingId("");
    setForm(emptyForm());
    setShowModal(true);
    setError("");
    setOk("");
  };

  const onEdit = (item) => {
    setEditingId(item._id);
    setForm({ name: item.name || "" });
    setShowModal(true);
    setError("");
    setOk("");
  };

  const onClose = () => {
    if (saving) return;
    setShowModal(false);
    setEditingId("");
    setForm(emptyForm());
  };

  const onSave = async () => {
    setError("");
    setOk("");
    setSaving(true);
    try {
      const payload = { name: form.name };
      if (editingId) {
        await api.updateTopic(token, editingId, payload);
      } else {
        await api.createTopic(token, payload);
      }
      onClose();
      await load();
      setOk(editingId ? "Topic updated successfully." : "New topic added successfully!");
    } catch (err) {
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    if (!confirm("Delete this topic?")) return;
    setError("");
    setOk("");
    try {
      await api.deleteTopic(token, id);
      await load();
      setOk("Topic deleted successfully.");
    } catch (err) {
      setError(err.message || "Delete failed");
    }
  };

  return (
    <div className="adminPageWrap adminQWrap">
      <div className="adminShell adminQShell">
        <AdminSidebar />

        <main className="adminQMain">
          {ok && (
            <div className="adminToast" role="status" aria-live="polite">
              <div className="adminToastItem">
                <span className="material-symbols-outlined">check_circle</span>
                <span>{ok}</span>
                <button
                  type="button"
                  className="adminToastClose"
                  onClick={() => setOk("")}
                  aria-label="Dismiss"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
          )}
          <div className="adminQTopbar">
            <div className="adminQBreadcrumbs">
              <span>Dashboard</span>
              <span className="material-symbols-outlined">chevron_right</span>
              <strong>Topics</strong>
            </div>
            <div className="adminQTopActions">
              <button type="button" className="adminQIconBtn" title="Notifications">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <button type="button" className="adminQIconBtn" title="Help">
                <span className="material-symbols-outlined">help</span>
              </button>
            </div>
          </div>

          <div className="adminQHeader">
            <div>
              <h1>Topic Management</h1>
              <p>Manage topic categories such as Education, Technology, Environment, Health, and Sports.</p>
            </div>
            <button className="adminQPrimary" onClick={onAddNew}>
              <span className="material-symbols-outlined">add</span>
              Add Topic
            </button>
          </div>

          <div className="adminQFilterCard">
            <div className="adminQFilterGrid">
              <div className="adminQField adminQField--search">
                <label>Search Topics</label>
                <div className="adminQSearch">
                  <span className="material-symbols-outlined">search</span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by topic name..."
                  />
                </div>
              </div>
              <button type="button" className="adminQFilterBtn" title="Filter">
                <span className="material-symbols-outlined">tune</span>
              </button>
            </div>
          </div>

          <div className="adminQTableCard">
            {loading && <div className="muted">Loading...</div>}
            {error && <div className="callout error">{error}</div>}
            <div className="adminQTable adminQTable--topics">
              <div className="adminQTableHead">
                <div>TOPIC</div>
                <div>SLUG</div>
                <div>ACTIONS</div>
              </div>
              {filteredItems.map((item) => (
                <div className="adminQTableRow" key={item._id}>
                  <div className="adminQContent">
                    <strong>{item.name}</strong>
                  </div>
                  <div>{item.slug}</div>
                  <div className="adminQActions">
                    <button className="adminQIconBtn" onClick={() => onEdit(item)} title="Edit">
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button
                      className="adminQIconBtn adminQIconBtn--danger"
                      onClick={() => onDelete(item._id)}
                      title="Delete"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              ))}
              {!loading && filteredItems.length === 0 && (
                <div className="muted" style={{ padding: 16 }}>
                  No topics yet.
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {showModal && (
        <div className="adminModalOverlay">
          <div className="adminModal adminModal--question">
            <div className="adminModalHeader">
              <div>
                <div className="adminModalTitle">
                  {editingId ? "Edit Topic" : "Add Topic"}
                </div>
                <div className="adminModalSubtitle">
                  Examples: Education, Technology, Environment, Health, Sports.
                </div>
              </div>
              <button className="iconBtn" onClick={onClose}>
                ✕
              </button>
            </div>
            <div className="adminModalBody">
              <div className="adminModalField">
                <label>Topic Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Enter topic name"
                />
              </div>
              {error && <div className="callout error">{error}</div>}
            </div>
            <div className="adminModalActions">
              <button type="button" className="adminUserProGhost" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="adminUserProPrimary"
                onClick={onSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
