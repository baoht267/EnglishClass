import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/index.js";
import { useAuth } from "../../state/AuthContext.jsx";
import AdminSidebar from "../../components/AdminSidebar.jsx";
import "../../adminVocabulary.css";

const emptyForm = () => ({
  word: "",
  meaning: "",
  phonetic: "",
  example: "",
  partOfSpeech: "noun",
  level: "Intermediate",
  topic: "Academic Essentials",
  status: "published"
});

export default function AdminVocabularies() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [form, setForm] = useState(emptyForm());
  const [topicMode, setTopicMode] = useState("select");
  const [customTopic, setCustomTopic] = useState("");
  const [editingId, setEditingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [data, topicList] = await Promise.all([
        api.listVocabulary(token),
        api.listTopics(token)
      ]);
      setItems(Array.isArray(data) ? data : []);
      setTopics(Array.isArray(topicList) ? topicList : []);
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
    return items.filter((item) => {
      const itemTopic = (item.topic || "").toLowerCase();
      const matchesTerm = term
        ? item.word?.toLowerCase().includes(term) ||
          item.meaning?.toLowerCase().includes(term) ||
          itemTopic.includes(term) ||
          item.partOfSpeech?.toLowerCase().includes(term)
        : true;
      const status = item.status || "published";
      const matchesStatus = statusFilter === "all" ? true : status === statusFilter;
      const matchesTopic = topicFilter === "all" ? true : itemTopic === topicFilter;
      return matchesTerm && matchesStatus && matchesTopic;
    });
  }, [items, search, statusFilter, topicFilter]);

  const topicOptions = useMemo(() => {
    const map = new Map();
    topics.forEach((topic) => {
      if (!topic?.name) return;
      const label = topic.name.trim();
      if (!label) return;
      const value = label.toLowerCase();
      if (!map.has(value)) map.set(value, label);
    });
    items.forEach((item) => {
      if (!item?.topic) return;
      const label = item.topic.trim();
      if (!label) return;
      const value = label.toLowerCase();
      if (!map.has(value)) map.set(value, label);
    });
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [topics, items]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, topicFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const onAddNew = () => {
    setEditingId("");
    const base = emptyForm();
    if (topics.length) {
      base.topic = topics[0].name || base.topic;
    }
    setForm(base);
    setTopicMode("select");
    setCustomTopic("");
    setShowModal(true);
    setError("");
    setOk("");
  };

  const onEdit = (item) => {
    setEditingId(item._id);
    const topicValue = item.topic || "";
    const hasTopicMatch = topics.some(
      (t) => (t.name || "").toLowerCase() === topicValue.toLowerCase()
    );
    setForm({
      word: item.word || "",
      meaning: item.meaning || "",
      phonetic: item.phonetic || "",
      example: item.example || "",
      partOfSpeech: item.partOfSpeech || "other",
      level: item.level || "Intermediate",
      topic: topicValue || "Academic Essentials",
      status: item.status || "published"
    });
    setTopicMode(hasTopicMatch ? "select" : "custom");
    setCustomTopic(hasTopicMatch ? "" : topicValue);
    setShowModal(true);
    setError("");
    setOk("");
  };

  const onClose = () => {
    if (saving) return;
    setShowModal(false);
    setEditingId("");
    setForm(emptyForm());
    setTopicMode("select");
    setCustomTopic("");
  };

  const onSave = async () => {
    setError("");
    setOk("");
    setSaving(true);
    try {
      const payload = {
        word: form.word,
        meaning: form.meaning,
        phonetic: form.phonetic,
        example: form.example,
        partOfSpeech: form.partOfSpeech,
        level: form.level,
        topic: form.topic,
        status: form.status
      };
      if (editingId) {
        await api.updateVocabulary(token, editingId, payload);
      } else {
        await api.createVocabulary(token, payload);
      }
      onClose();
      await load();
      setOk(editingId ? "Vocabulary updated successfully." : "New word added successfully!");
    } catch (err) {
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    if (!confirm("Xóa từ vựng này?")) return;
    setError("");
    setOk("");
    try {
      await api.deleteVocabulary(token, id);
      await load();
      setOk("Vocabulary deleted successfully.");
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
              <strong>Vocabulary</strong>
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
              <h1>Vocabulary Management</h1>
              <p>Admin thêm mới, chỉnh sửa và quản lý bộ từ vựng cho flashcards.</p>
            </div>
            <button className="adminQPrimary" onClick={onAddNew}>
              <span className="material-symbols-outlined">add</span>
              Add New Word
            </button>
          </div>

          <div className="adminQFilterCard">
            <div className="adminQFilterGrid">
              <div className="adminQField adminQField--search">
                <label>Search Vocabulary</label>
                <div className="adminQSearch">
                  <span className="material-symbols-outlined">search</span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by word, meaning or topic..."
                  />
                </div>
              </div>
              <div className="adminQField">
                <label>Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
              <div className="adminQField">
                <label>Topic</label>
                <select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)}>
                  <option value="all">All topics</option>
                  {topicOptions.map((topic) => (
                    <option key={topic.value} value={topic.value}>
                      {topic.label}
                    </option>
                  ))}
                </select>
              </div>
              <button type="button" className="adminQFilterBtn" title="Filter">
                <span className="material-symbols-outlined">tune</span>
              </button>
            </div>
          </div>

          <div className="adminQTableCard">
            {loading && <div className="muted">Đang tải...</div>}
            {error && <div className="callout error">{error}</div>}
            <div className="adminQTable adminQTable--vocab">
              <div className="adminQTableHead">
                <div>WORD</div>
                <div>MEANING</div>
                <div>POS</div>
                <div>LEVEL</div>
                <div>TOPIC</div>
                <div>STATUS</div>
                <div>ACTIONS</div>
              </div>
              {pageItems.map((item) => (
                <div className="adminQTableRow" key={item._id}>
                  <div className="adminQContent">
                    <strong>{item.word}</strong>
                    <span>{item.phonetic || "-"}</span>
                  </div>
                  <div className="adminQContent">
                    <strong>{item.meaning}</strong>
                    <span>{item.example || "No example"}</span>
                  </div>
                  <div>{(item.partOfSpeech || "other").toUpperCase()}</div>
                  <div>{item.level || "General"}</div>
                  <div>{item.topic || "General"}</div>
                  <div>
                    <span
                      className={`adminQDifficulty adminQDifficulty--${(item.status || "published")}`}
                    >
                      {item.status || "published"}
                    </span>
                  </div>
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
                  Chưa có từ vựng.
                </div>
              )}
            </div>

            <div className="adminQTableFooter">
              <span>
                Showing {filteredItems.length === 0 ? 0 : (page - 1) * pageSize + 1} to{" "}
                {Math.min(page * pageSize, filteredItems.length)} of {filteredItems.length} results
              </span>
              <div className="adminQPagination">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button type="button" className="is-active">
                  {page}
                </button>
                <button
                  type="button"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
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
                  {editingId ? "Edit Vocabulary" : "Add Vocabulary"}
                </div>
                <div className="adminModalSubtitle">
                  Manage vocabulary items used in flashcards.
                </div>
              </div>
              <button className="iconBtn" onClick={onClose}>
                ✕
              </button>
            </div>
            <div className="adminModalBody">
              <div className="adminModalField">
                <label>Word *</label>
                <input
                  value={form.word}
                  onChange={(e) => setForm((f) => ({ ...f, word: e.target.value }))}
                  placeholder="e.g. Perseverance"
                />
              </div>
              <div className="adminModalField">
                <label>Meaning *</label>
                <input
                  value={form.meaning}
                  onChange={(e) => setForm((f) => ({ ...f, meaning: e.target.value }))}
                  placeholder="e.g. Sự kiên trì"
                />
              </div>
              <div className="adminModalField">
                <label>Phonetic</label>
                <input
                  value={form.phonetic}
                  onChange={(e) => setForm((f) => ({ ...f, phonetic: e.target.value }))}
                  placeholder="/ˌpɜːsɪˈvɪərəns/"
                />
              </div>
              <div className="adminModalField">
                <label>Example</label>
                <textarea
                  rows={3}
                  value={form.example}
                  onChange={(e) => setForm((f) => ({ ...f, example: e.target.value }))}
                  placeholder="Example sentence using this word."
                />
              </div>
              <div className="adminModalField">
                <label>Part of Speech</label>
                <select
                  value={form.partOfSpeech}
                  onChange={(e) => setForm((f) => ({ ...f, partOfSpeech: e.target.value }))}
                >
                  <option value="noun">Noun</option>
                  <option value="verb">Verb</option>
                  <option value="adjective">Adjective</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="adminModalField">
                <label>Level</label>
                <select
                  value={form.level}
                  onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>
              <div className="adminModalField">
                <label>Topic</label>
                <select
                  value={topicMode === "select" ? form.topic : "__custom__"}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "__custom__") {
                      setTopicMode("custom");
                      setForm((f) => ({ ...f, topic: customTopic || "" }));
                      return;
                    }
                    setTopicMode("select");
                    setCustomTopic("");
                    setForm((f) => ({ ...f, topic: value }));
                  }}
                >
                  {topics.length === 0 && (
                    <option value="General">General</option>
                  )}
                  {topics.map((t) => (
                    <option key={t._id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                  <option value="__custom__">Custom topic...</option>
                </select>
                {topicMode === "custom" && (
                  <input
                    value={customTopic}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCustomTopic(value);
                      setForm((f) => ({ ...f, topic: value }));
                    }}
                    placeholder="Enter custom topic"
                    style={{ marginTop: 8 }}
                  />
                )}
              </div>
              <div className="adminModalField">
                <label>Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
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
