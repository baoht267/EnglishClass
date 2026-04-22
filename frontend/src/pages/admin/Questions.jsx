import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/index.js";
import { getApiBaseUrl } from "../../api/http.js";
import { useAuth } from "../../state/AuthContext.jsx";
import AdminSidebar from "../../components/AdminSidebar.jsx";

const baseOptionKeys = ["A", "B", "C", "D"];

const emptyForm = () => ({
  content: "",
  options: { A: "", B: "", C: "", D: "" },
  correctKey: "A",
  explanation: "",
  categoryId: "",
  levelId: "",
  audioUrl: "",
  audioName: ""
});

export default function AdminQuestions() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.fullName || user?.name || user?.email || "Admin";
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importNote, setImportNote] = useState("");
  const [optionKeys, setOptionKeys] = useState(baseOptionKeys);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const importInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const questionTextRef = useRef(null);
  const [audioChanged, setAudioChanged] = useState(false);
  const apiBaseUrl = getApiBaseUrl();
  const selectedCategory = useMemo(
    () => categories.find((c) => c._id === form.categoryId),
    [categories, form.categoryId]
  );
  const isListeningCategory = useMemo(() => {
    const label = (selectedCategory?.name || "").toLowerCase();
    return label.includes("listen") || label.includes("nghe");
  }, [selectedCategory]);

  useEffect(() => {
    if (isListeningCategory) return;
    if (form.audioUrl || form.audioName) {
      setForm((f) => ({ ...f, audioUrl: "", audioName: "" }));
      setAudioChanged(true);
    }
  }, [isListeningCategory, form.audioUrl, form.audioName]);

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const [qs, cats, levs] = await Promise.all([
        api.listQuestions(token),
        api.listCategories(token),
        api.listLevels(token)
      ]);
      setItems(qs);
      setCategories(cats);
      setLevels(levs);
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
    if (!success) return;
    const timer = setTimeout(() => setSuccess(""), 5000);
    return () => clearTimeout(timer);
  }, [success]);

  const setOpt = (key, value) => {
    setForm((f) => ({ ...f, options: { ...f.options, [key]: value } }));
  };

  const syncEditorContent = () => {
    if (!questionTextRef.current) return;
    setForm((f) => ({ ...f, content: questionTextRef.current.innerHTML }));
  };

  const execCommand = (command, value) => {
    if (!questionTextRef.current) return;
    questionTextRef.current.focus();
    document.execCommand(command, false, value);
    syncEditorContent();
  };

  const insertImage = () => {
    const url = prompt("Image URL");
    if (!url) return;
    execCommand("insertImage", url);
  };

  const addOptionKey = () => {
    setOptionKeys((prev) => {
      const last = prev[prev.length - 1] || "D";
      const nextCode = last.charCodeAt(0) + 1;
      if (nextCode > 90) return prev;
      const nextKey = String.fromCharCode(nextCode);
      if (prev.includes(nextKey)) return prev;
      setForm((f) => ({
        ...f,
        options: { ...f.options, [nextKey]: "" }
      }));
      return [...prev, nextKey];
    });
  };

  const removeOptionKey = (key) => {
    setOptionKeys((prev) => {
      if (prev.length <= 1) return prev;
      const nextKeys = prev.filter((k) => k !== key);
      setForm((f) => {
        const nextOptions = { ...f.options };
        delete nextOptions[key];
        const nextCorrectKey =
          f.correctKey === key ? nextKeys[0] || "A" : f.correctKey;
        return {
          ...f,
          options: nextOptions,
          correctKey: nextCorrectKey
        };
      });
      return nextKeys;
    });
  };

  const onEdit = (q) => {
    setEditingId(q._id);
    const keys = Object.keys(q.options || {});
    const nextKeys = keys.length ? keys.sort() : baseOptionKeys;
    setOptionKeys(nextKeys);
    setForm({
      content: q.content || "",
      options: q.options || { A: "", B: "", C: "", D: "" },
      correctKey: q.correctKey || (nextKeys[0] || "A"),
      explanation: q.explanation || "",
      categoryId: q.categoryId?._id || "",
      levelId: q.levelId?._id || "",
      audioUrl: q.audioUrl || "",
      audioName: q.audioName || ""
    });
    setAudioChanged(false);
    setShowModal(true);
  };

  const onCancel = () => {
    setEditingId("");
    setForm(emptyForm());
    setImportNote("");
    setOptionKeys(baseOptionKeys);
    setAudioChanged(false);
    setShowModal(false);
  };

  const parseCsv = (text) => {
    const rows = [];
    let row = [];
    let value = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      const next = text[i + 1];
      if (ch === "\"") {
        if (inQuotes && next === "\"") {
          value += "\"";
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (!inQuotes && (ch === "\n" || ch === "\r")) {
        if (ch === "\r" && next === "\n") i += 1;
        row.push(value);
        value = "";
        if (row.some((cell) => cell.trim() !== "")) rows.push(row);
        row = [];
        continue;
      }
      if (!inQuotes && ch === ",") {
        row.push(value);
        value = "";
        continue;
      }
      value += ch;
    }
    row.push(value);
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
    return rows;
  };

  const resolveIdByName = (list, value) => {
    const raw = (value || "").trim();
    if (!raw) return "";
    const byId = list.find((item) => item._id === raw);
    if (byId) return byId._id;
    const byName = list.find(
      (item) => (item.name || "").trim().toLowerCase() === raw.toLowerCase()
    );
    return byName ? byName._id : "";
  };

  const onImportClick = () => {
    setImportNote("");
    if (importInputRef.current) importInputRef.current.click();
  };

  const onImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setImportNote("");
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) {
        throw new Error("File CSV trống hoặc không đúng định dạng.");
      }

      const header = rows[0].map((h) => (h || "").trim().toLowerCase());
      const hasHeader =
        header.includes("content") ||
        header.includes("question") ||
        header.includes("correctkey") ||
        header.includes("answer");
      const dataRows = hasHeader ? rows.slice(1) : rows;

      const colIndex = (names, fallback) => {
        if (!hasHeader) return fallback;
        for (let i = 0; i < names.length; i += 1) {
          const idx = header.indexOf(names[i]);
          if (idx !== -1) return idx;
        }
        return fallback;
      };

      const idxContent = colIndex(["content", "question", "question_text"], 0);
      const idxA = colIndex(["a", "option_a", "option1"], 1);
      const idxB = colIndex(["b", "option_b", "option2"], 2);
      const idxC = colIndex(["c", "option_c", "option3"], 3);
      const idxD = colIndex(["d", "option_d", "option4"], 4);
      const idxCorrect = colIndex(["correctkey", "answer", "correct"], 5);
      const idxExplanation = colIndex(["explanation", "feedback"], 6);
      const idxCategory = colIndex(["category", "categoryname"], 7);
      const idxLevel = colIndex(["level", "difficulty", "levelname"], 8);

      let imported = 0;
      let failed = 0;

      for (const row of dataRows) {
        const content = (row[idxContent] || "").trim();
        if (!content) continue;
        let correctKey = (row[idxCorrect] || "").trim().toUpperCase();
        if (["1", "2", "3", "4"].includes(correctKey)) {
          correctKey = String.fromCharCode(64 + Number(correctKey));
        }
        if (!["A", "B", "C", "D"].includes(correctKey)) correctKey = "A";

        const payload = {
          content,
          options: {
            A: (row[idxA] || "").trim(),
            B: (row[idxB] || "").trim(),
            C: (row[idxC] || "").trim(),
            D: (row[idxD] || "").trim()
          },
          correctKey,
          explanation: (row[idxExplanation] || "").trim(),
          categoryId: resolveIdByName(categories, row[idxCategory]),
          levelId: resolveIdByName(levels, row[idxLevel])
        };

        try {
          await api.createQuestion(token, payload);
          imported += 1;
        } catch (err) {
          failed += 1;
        }
      }

      await load();
      if (imported === 0) {
        throw new Error("Không có dòng hợp lệ để import.");
      }
      setImportNote(`Imported ${imported} question(s).${failed ? ` Failed: ${failed}.` : ""}`);
    } catch (err) {
      setError(err.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const onPickAudio = () => {
    if (audioInputRef.current) audioInputRef.current.click();
  };

  const onAudioFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    if (!file.type.startsWith("audio/")) {
      setError("Audio file không hợp lệ. Chỉ hỗ trợ MP3/WAV/AAC.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File audio quá lớn (tối đa 10MB).");
      return;
    }
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Không đọc được file audio."));
      reader.readAsDataURL(file);
    });
    setForm((f) => ({
      ...f,
      audioUrl: dataUrl,
      audioName: file.name
    }));
    setAudioChanged(true);
  };

  const onRemoveAudio = () => {
    setForm((f) => ({ ...f, audioUrl: "", audioName: "" }));
    setAudioChanged(true);
  };

  const onSave = async () => {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const payload = {
        content: form.content,
        options: form.options,
        correctKey: form.correctKey,
        explanation: form.explanation,
        categoryId: form.categoryId,
        levelId: form.levelId
      };

      if (audioChanged) {
        if (isListeningCategory) {
          if (form.audioUrl && form.audioUrl.startsWith("data:")) {
            payload.audioDataUrl = form.audioUrl;
            payload.audioName = form.audioName || "audio";
          } else {
            payload.audioUrl = form.audioUrl || "";
            payload.audioName = form.audioName || "";
          }
        } else {
          payload.audioUrl = "";
          payload.audioName = "";
        }
      }

      if (editingId) {
        await api.updateQuestion(token, editingId, payload);
      } else {
        await api.createQuestion(token, payload);
      }
      onCancel();
      await load();
      setSuccess(editingId ? "Question updated successfully." : "Question added successfully.");
    } catch (err) {
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    if (!confirm("Xóa câu hỏi này?")) return;
    setError("");
    try {
      await api.deleteQuestion(token, id);
      await load();
    } catch (err) {
      setError(err.message || "Delete failed");
    }
  };

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((q) => {
      const matchesSearch = term
        ? q.content?.toLowerCase().includes(term)
        : true;
      const matchesCategory = filterCategory
        ? q.categoryId?._id === filterCategory
        : true;
      const matchesLevel = filterLevel ? q.levelId?._id === filterLevel : true;
      return matchesSearch && matchesCategory && matchesLevel;
    });
  }, [items, search, filterCategory, filterLevel]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [search, filterCategory, filterLevel]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  const startIndex =
    filteredItems.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex =
    filteredItems.length === 0 ? 0 : Math.min(page * pageSize, filteredItems.length);

  const buildSnippet = (q) => {
    const opts = q?.options || {};
    const parts = ["A", "B", "C", "D"]
      .map((k) => opts[k])
      .filter(Boolean)
      .map((text, idx) => `${String.fromCharCode(65 + idx)}) ${text}`);
    const raw = parts.length ? parts.join(", ") : q?.explanation || "";
    if (!raw) return "";
    const plain = raw.replace(/<[^>]+>/g, "");
    return plain.length > 80 ? `${plain.slice(0, 77)}...` : plain;
  };

  const slugify = (value) =>
    (value || "")
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const buildPageList = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    return [1, 2, 3, "ellipsis", totalPages];
  };

  const onAddNew = () => {
    setEditingId("");
    setForm(emptyForm());
    setImportNote("");
    setOptionKeys(baseOptionKeys);
    setAudioChanged(false);
    setShowModal(true);
  };

  useEffect(() => {
    if (!showModal || !questionTextRef.current) return;
    questionTextRef.current.innerHTML = form.content || "";
  }, [showModal, editingId]);

  if (showModal) {
    return (
      <div className="adminModalOverlay--page adminQAddPage">
        {success && (
          <div className="adminToast adminToast--success" role="status">
            <span className="material-symbols-outlined">check_circle</span>
            <div className="adminToastBody">
              <strong>Success</strong>
              <p>{success}</p>
            </div>
            <button type="button" className="adminToastClose" onClick={() => setSuccess("")}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        )}
        {error && (
          <div className="adminToast adminToast--error" role="alert">
            <span className="material-symbols-outlined">error</span>
            <div className="adminToastBody">
              <strong>Something went wrong</strong>
              <p>{error}</p>
            </div>
            <button type="button" className="adminToastClose" onClick={() => setError("")}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        )}
        <div className="adminQAddTopbar">
          <div className="adminQAddBrand">
            <span className="adminQAddBrandIcon">
              <span className="material-symbols-outlined">school</span>
            </span>
            <span>English Exam Admin</span>
          </div>
          <div className="adminQAddUser">
            <button type="button" className="adminQAddIconBtn" title="Notifications">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="adminQAddUserInfo">
              <strong>{displayName}</strong>
              <span>{user?.role === "ADMIN" ? "Administrator" : user?.role || "User"}</span>
            </div>
            <div className="adminQAddAvatar">
              <span className="material-symbols-outlined">person</span>
            </div>
          </div>
        </div>

        <div className="adminQAddWrap">
          <div className="adminModal adminModal--question">
            <div className="adminQAddTop">
              <div className="adminQAddBreadcrumbs">
                <button
                  type="button"
                  className="adminQAddCrumb"
                  onClick={() => navigate("/admin/dashboard")}
                >
                  Dashboard
                </button>
                <span className="material-symbols-outlined">chevron_right</span>
                <button
                  type="button"
                  className="adminQAddCrumb"
                  onClick={() => navigate("/admin/questions")}
                >
                  Question Bank
                </button>
                <span className="material-symbols-outlined">chevron_right</span>
                <strong>{editingId ? "Edit Question" : "Add Question"}</strong>
              </div>
            </div>

            <div className="adminQAddHeader">
              <div>
                <h2>{editingId ? "Edit Question" : "Add New Question"}</h2>
                <p>Configure question details, answers, and explanations.</p>
              </div>
              <div className="adminQAddHeaderActions">
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={onImportFile}
                  style={{ display: "none" }}
                />
                {importNote && <span className="adminQAddImportNote">{importNote}</span>}
                <button
                  type="button"
                  className="adminQAddGhost"
                  onClick={onImportClick}
                  disabled={importing}
                >
                <span className="material-symbols-outlined">upload</span>
                  {importing ? "Importing..." : "Import CSV"}
                </button>
              </div>
            </div>

            <div className="adminQAddCard">
              <div className="adminQAddSection adminQAddSection--top">
                <div className="adminQAddGrid">
                  <div className="adminQAddField">
                    <label>Question Type</label>
                    <select defaultValue="multiple">
                      <option value="multiple">Multiple Choice</option>
                    </select>
                  </div>
                  <div className="adminQAddField">
                    <label>Difficulty Level</label>
                    <select
                      value={form.levelId}
                      onChange={(e) => setForm((f) => ({ ...f, levelId: e.target.value }))}
                    >
                      <option value="">All Levels</option>
                      {levels.map((l) => (
                        <option key={l._id} value={l._id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="adminQAddField">
                    <label>Category</label>
                    <select
                      value={form.categoryId}
                      onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                    >
                      <option value="">All Categories</option>
                      {categories.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="adminQAddSection">
                <div className="adminQAddSectionHead">
                  <strong>Audio Resources</strong>
                  <span>Upload the audio clip required for listening questions (MP3, WAV, or AAC).</span>
                </div>
                {isListeningCategory ? (
                  <>
                    <input
                      ref={audioInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={onAudioFile}
                      style={{ display: "none" }}
                    />
                    <div
                      className="adminQAddUpload"
                      role="button"
                      tabIndex={0}
                      onClick={onPickAudio}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onPickAudio();
                        }
                      }}
                    >
                      <div className="adminQAddUploadIcon">
                        <span className="material-symbols-outlined">audio_file</span>
                      </div>
                      <p>{form.audioName || "Click to upload or drag and drop"}</p>
                      <small>Maximum file size: 10MB</small>
                    </div>
                    {form.audioUrl && (
                      <div className="adminQAddAudioPreview">
                        <audio
                          controls
                          src={
                            form.audioUrl.startsWith("data:")
                              ? form.audioUrl
                              : form.audioUrl.startsWith("http")
                              ? form.audioUrl
                              : `${apiBaseUrl}${form.audioUrl}`
                          }
                        />
                        <button
                          type="button"
                          className="adminQAddAudioRemove"
                          onClick={onRemoveAudio}
                        >
                          Remove audio
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="adminQAddUpload adminQAddUpload--disabled">
                    <div className="adminQAddUploadIcon">
                      <span className="material-symbols-outlined">lock</span>
                    </div>
                    <p>Select “Listening” category to enable audio upload.</p>
                    <small>Audio is only required for Listening questions.</small>
                  </div>
                )}
              </div>

              <div className="adminQAddSection">
                <div className="adminQAddSectionHead">
                  <strong>Question Text</strong>
                </div>
                <div className="adminQAddEditor">
                  <div className="adminQAddToolbar">
                    <button type="button" onClick={() => execCommand("bold")}>
                      <strong>B</strong>
                    </button>
                    <button type="button" onClick={() => execCommand("italic")}>
                      <em>I</em>
                    </button>
                    <button type="button" onClick={() => execCommand("underline")}>
                      <span style={{ textDecoration: "underline" }}>U</span>
                    </button>
                    <span className="adminQAddToolbarDivider" />
                    <button type="button" onClick={() => execCommand("insertUnorderedList")}>
                      <span className="material-symbols-outlined">format_list_bulleted</span>
                    </button>
                    <button type="button" onClick={() => execCommand("insertOrderedList")}>
                      <span className="material-symbols-outlined">format_list_numbered</span>
                    </button>
                    <button type="button" onClick={insertImage}>
                      <span className="material-symbols-outlined">image</span>
                    </button>
                  </div>
                  <div
                    className="adminQAddEditorArea"
                    contentEditable
                    ref={questionTextRef}
                    onInput={syncEditorContent}
                    onBlur={syncEditorContent}
                    data-placeholder="Enter your question here..."
                    suppressContentEditableWarning
                  />
                </div>
              </div>

              <div className="adminQAddSection">
                <div className="adminQAddSectionHead">
                  <strong>Answer Options</strong>
                  <span>Select the radio button to mark the correct answer.</span>
                </div>
                <div className="adminQAddOptions">
                  {optionKeys.map((k) => (
                    <label
                      key={k}
                      className={`adminQAddOption ${form.correctKey === k ? "is-active" : ""}`}
                    >
                      <input
                        type="radio"
                        name="correctKey"
                        value={k}
                        checked={form.correctKey === k}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, correctKey: e.target.value }))
                        }
                      />
                      <span className="adminQAddOptionKey">{k}</span>
                      <input
                        type="text"
                        value={form.options[k] || ""}
                        onChange={(e) => setOpt(k, e.target.value)}
                        placeholder={`Option ${k}`}
                      />
                      <button
                        type="button"
                        className="adminQAddOptionDelete"
                        onClick={() => removeOptionKey(k)}
                        title="Clear"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </label>
                  ))}
                </div>
                <button type="button" className="adminQAddLink" onClick={addOptionKey}>
                  <span className="material-symbols-outlined">add_circle</span>
                  Add Option
                </button>
              </div>

              <div className="adminQAddSection">
                <div className="adminQAddSectionHead">
                  <strong>Explanation / Feedback</strong>
                  <span>This text will be shown to the student after they answer or when reviewing the exam.</span>
                </div>
                <textarea
                  rows={3}
                  value={form.explanation}
                  onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
                  placeholder="Explain why the correct answer is correct..."
                />
              </div>

              <div className="adminQAddActions">
                {error && <div className="callout error">{error}</div>}
                <div>
                  <button className="adminQAddCancel" onClick={onCancel}>
                    Cancel
                  </button>
                  <button className="adminQAddSave" disabled={saving} onClick={onSave}>
                    {saving ? "Saving..." : "Save Question"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="adminPageWrap adminQWrap">
      {success && (
        <div className="adminToast adminToast--success" role="status">
          <span className="material-symbols-outlined">check_circle</span>
          <div className="adminToastBody">
            <strong>Success</strong>
            <p>{success}</p>
          </div>
          <button type="button" className="adminToastClose" onClick={() => setSuccess("")}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}
      {error && (
        <div className="adminToast adminToast--error" role="alert">
          <span className="material-symbols-outlined">error</span>
          <div className="adminToastBody">
            <strong>Something went wrong</strong>
            <p>{error}</p>
          </div>
          <button type="button" className="adminToastClose" onClick={() => setError("")}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}
      <div className="adminShell adminQShell">
        <AdminSidebar />

        <main className="adminQMain">
          <div className="adminQTopbar">
            <div className="adminQBreadcrumbs">
              <span>Dashboard</span>
              <span className="material-symbols-outlined">chevron_right</span>
              <strong>Question Bank</strong>
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
              <h1>Question Bank Management</h1>
              <p>Manage, review, and categorize examination questions.</p>
            </div>
            <button className="adminQPrimary" onClick={onAddNew}>
              <span className="material-symbols-outlined">add</span>
              Add New Question
            </button>
          </div>

          <div className="adminQFilterCard">
            <div className="adminQFilterGrid">
              <div className="adminQField adminQField--search">
                <label>Search Questions</label>
                <div className="adminQSearch">
                  <span className="material-symbols-outlined">search</span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by ID, content or tag..."
                  />
                </div>
              </div>
              <div className="adminQField">
                <label>Category</label>
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="adminQField">
                <label>Difficulty</label>
                <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
                  <option value="">All Levels</option>
                  {levels.map((l) => (
                    <option key={l._id} value={l._id}>
                      {l.name}
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
            <div className="adminQTable">
              <div className="adminQTableHead">
                <div>STT</div>
                <div>CONTENT</div>
                <div>CATEGORY</div>
                <div>DIFFICULTY</div>
                <div>ĐÁP ÁN ĐÚNG</div>
                <div>ACTIONS</div>
              </div>
              {pageItems.map((q, idx) => {
                const rowIndex = (page - 1) * pageSize + idx + 1;
                const catName = q.categoryId?.name || "Uncategorized";
                const levelName = q.levelId?.name || "Unknown";
                const levelClass = slugify(levelName);
                return (
                  <div className="adminQTableRow" key={q._id}>
                    <div className="adminQIndex">{rowIndex}</div>
                    <div className="adminQContent">
                      <strong>{(q.content || "").replace(/<[^>]+>/g, "")}</strong>
                      <span>{buildSnippet(q)}</span>
                    </div>
                    <div>
                      <span className={`adminQBadge adminQBadge--${slugify(catName)}`}>
                        {catName}
                      </span>
                    </div>
                    <div>
                      <span className={`adminQDifficulty adminQDifficulty--${levelClass}`}>
                        {levelName}
                      </span>
                    </div>
                    <div className="adminQAnswer">{q.correctKey || "-"}</div>
                    <div className="adminQActions">
                      <button className="adminQIconBtn" onClick={() => onEdit(q)} title="Edit">
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                      <button
                        className="adminQIconBtn adminQIconBtn--danger"
                        onClick={() => onDelete(q._id)}
                        title="Delete"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
              {!loading && filteredItems.length === 0 && (
                <div className="muted" style={{ padding: 16 }}>
                  Chưa có câu hỏi.
                </div>
              )}
            </div>

            <div className="adminQTableFooter">
              <span>
                Showing {startIndex} to {endIndex} of {filteredItems.length} results
              </span>
              <div className="adminQPagination">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                {buildPageList().map((p, index) =>
                  p === "ellipsis" ? (
                    <span key={`ellipsis-${index}`} className="adminQEllipsis">
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      className={page === p ? "is-active" : ""}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  )
                )}
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

          <div className="adminQFooter">
            <span>© 2026 English Admin Platform. All rights reserved.</span>
            <div>
              <button type="button">Privacy Policy</button>
              <button type="button">Terms of Service</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
