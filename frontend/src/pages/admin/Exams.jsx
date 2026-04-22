import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api/index.js";
import { getApiBaseUrl } from "../../api/http.js";
import { useAuth } from "../../state/AuthContext.jsx";
import AdminSidebar from "../../components/AdminSidebar.jsx";

export default function AdminExams({ managerType = "practice" }) {
  const { token } = useAuth();
  const [exams, setExams] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [levels, setLevels] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState({});
  const [timeLimit, setTimeLimit] = useState("");
  const [passMark, setPassMark] = useState("");
  const [questionSearch, setQuestionSearch] = useState("");
  const [questionCategory, setQuestionCategory] = useState("");
  const [questionLevel, setQuestionLevel] = useState("");
  const [examStatus, setExamStatus] = useState("draft");
  const [audioUrl, setAudioUrl] = useState("");
  const [audioName, setAudioName] = useState("");
  const [audioChanged, setAudioChanged] = useState(false);
  const audioInputRef = useRef(null);
  const apiBaseUrl = getApiBaseUrl();
  const normalizedManagerType =
    (managerType || "").toString().toLowerCase() === "exam" ? "exam" : "practice";
  const managerLabel = normalizedManagerType === "exam" ? "Exam" : "Test";
  const managerLabelPlural = normalizedManagerType === "exam" ? "Exams" : "Tests";
  const apiHandlers = useMemo(() => {
    if (normalizedManagerType === "exam") {
      return {
        list: api.listExams,
        get: api.getExam,
        create: api.createExam,
        update: api.updateExam,
        remove: api.deleteExam
      };
    }
    return {
      list: api.listPractices,
      get: api.getPractice,
      create: api.createPractice,
      update: api.updatePractice,
      remove: api.deletePractice
    };
  }, [normalizedManagerType]);

  const availableCategories = useMemo(() => {
    if (categories.length) return categories;
    const map = new Map();
    questions.forEach((q) => {
      const cat = q?.categoryId;
      if (cat && cat._id && !map.has(cat._id)) {
        map.set(cat._id, { _id: cat._id, name: cat.name || "General" });
      }
    });
    return Array.from(map.values());
  }, [categories, questions]);

  const selectedCategory = useMemo(
    () => availableCategories.find((c) => c._id === categoryId),
    [availableCategories, categoryId]
  );
  const isListeningCategory = useMemo(() => {
    const label = (selectedCategory?.name || "").toLowerCase();
    return label.includes("listen") || label.includes("nghe");
  }, [selectedCategory]);

  useEffect(() => {
    if (isListeningCategory) return;
    if (audioUrl || audioName) {
      setAudioUrl("");
      setAudioName("");
      setAudioChanged(true);
    }
  }, [isListeningCategory, audioUrl, audioName]);

  const selectedIdsArr = useMemo(
    () => Object.entries(selectedQuestionIds).filter(([, v]) => v).map(([k]) => k),
    [selectedQuestionIds]
  );

  const filteredQuestions = useMemo(() => {
    const term = questionSearch.trim().toLowerCase();
    return questions.filter((q) => {
      const matchesSearch = term
        ? `${q.content || ""} ${q.questionId || ""}`.toLowerCase().includes(term)
        : true;
      const matchesCategory = questionCategory
        ? q.categoryId?._id === questionCategory
        : true;
      const matchesLevel = questionLevel ? q.levelId?._id === questionLevel : true;
      return matchesSearch && matchesCategory && matchesLevel;
    });
  }, [questions, questionSearch, questionCategory, questionLevel]);

  const selectedQuestions = useMemo(() => {
    const selectedSet = new Set(selectedIdsArr);
    return questions.filter((q) => selectedSet.has(q._id));
  }, [questions, selectedIdsArr]);

  const estimatedMinutes = Math.max(1, selectedQuestions.length * 2);

  const decoratedExams = useMemo(
    () =>
      exams.map((e) => {
        const status = (e.status || "draft").toLowerCase();
        const parsedTime = Number(e.timeLimit);
        const duration =
          Number.isFinite(parsedTime) && parsedTime > 0
            ? parsedTime
            : Math.max(10, Math.round((e.questionCount || 0) * 2));
        const attempts = e.attempts || 0;
        return { ...e, status, duration, attempts };
      }),
    [exams]
  );

  const activeSearch = search.trim().toLowerCase();
  const filteredExams = useMemo(() => {
    return decoratedExams.filter((e) => {
      const matchesTab =
        tab === "all" ? true : tab === "published" ? e.status === "published" : e.status === "draft";
      const haystack = `${e.title || ""} ${e.description || ""} ${e.category?.name || ""}`.toLowerCase();
      const matchesSearch = activeSearch ? haystack.includes(activeSearch) : true;
      return matchesTab && matchesSearch;
    });
  }, [decoratedExams, tab, activeSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredExams.length / pageSize));
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredExams.slice(start, start + pageSize);
  }, [filteredExams, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [tab, activeSearch]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const totalTests = decoratedExams.length;
  const publishedCount = decoratedExams.filter((e) => e.status === "published").length;
  const draftCount = decoratedExams.filter((e) => e.status === "draft").length;
  const totalTakes = decoratedExams.reduce((sum, e) => sum + (e.attempts || 0), 0);
  const stripHtml = (text) => (text || "").replace(/<[^>]+>/g, "");

  const hydrateFormFromExam = (exam, { duplicate = false } = {}) => {
    setTitle(duplicate ? `${exam.title || "Untitled"} (Copy)` : exam.title || "");
    setDescription(exam.description || "");
    setCategoryId(exam.categoryId?._id || "");
    setLevelId(exam.levelId?._id || "");
    setExamStatus((exam.status || "draft").toLowerCase());
    setTimeLimit(exam.timeLimit ?? "");
    setPassMark(exam.passMark ?? "");
    const nextSelected = {};
    (exam.questions || []).forEach((q) => {
      const id = q._id || q;
      if (id) nextSelected[id] = true;
    });
    setSelectedQuestionIds(nextSelected);
    setEditingId(duplicate ? "" : exam._id);
    setAudioUrl(exam.audioUrl || "");
    setAudioName(exam.audioName || "");
    setAudioChanged(false);
    setShowCreate(true);
  };

  const slugify = (value) =>
    (value || "")
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const addQuestion = (id) => {
    setSelectedQuestionIds((s) => ({ ...s, [id]: true }));
  };

  const removeQuestion = (id) => {
    setSelectedQuestionIds((s) => {
      const next = { ...s };
      delete next[id];
      return next;
    });
  };

  const clearAllQuestions = () => {
    setSelectedQuestionIds({});
  };

  const randomizeSelection = () => {
    const pool = [...filteredQuestions];
    if (!pool.length) return;
    pool.sort(() => Math.random() - 0.5);
    const pick = pool.slice(0, Math.min(5, pool.length));
    const next = {};
    pick.forEach((q) => {
      next[q._id] = true;
    });
    setSelectedQuestionIds(next);
  };

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        apiHandlers.list(token),
        api.listQuestions(token),
        api.listCategories(token),
        api.listLevels(token)
      ]);
      const [exRes, qsRes, catRes, levRes] = results;
      if (exRes.status === "fulfilled") setExams(exRes.value);
      if (qsRes.status === "fulfilled") setQuestions(qsRes.value);
      if (catRes.status === "fulfilled") setCategories(catRes.value);
      if (levRes.status === "fulfilled") setLevels(levRes.value);
      const firstError = results.find((r) => r.status === "rejected");
      if (firstError?.status === "rejected") {
        setError(firstError.reason?.message || "Load failed");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, normalizedManagerType]);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(""), 5000);
    return () => clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(""), 5000);
    return () => clearTimeout(timer);
  }, [error]);

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
    setAudioUrl(dataUrl);
    setAudioName(file.name);
    setAudioChanged(true);
  };

  const onRemoveAudio = () => {
    setAudioUrl("");
    setAudioName("");
    setAudioChanged(true);
  };

  const onCreate = async () => {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const isEdit = Boolean(editingId);
      const parsedTimeLimit =
        timeLimit === "" || timeLimit === null ? null : Number(timeLimit);
      const parsedPassMark =
        passMark === "" || passMark === null ? null : Number(passMark);
      const payload = {
        title,
        description,
        questions: selectedIdsArr,
        categoryId: categoryId || null,
        levelId: levelId || null,
        status: examStatus,
        timeLimit: parsedTimeLimit,
        passMark: parsedPassMark
      };
      if (audioChanged) {
        if (isListeningCategory) {
          if (audioUrl && audioUrl.startsWith("data:")) {
            payload.audioDataUrl = audioUrl;
            payload.audioName = audioName || "audio";
          } else {
            payload.audioUrl = audioUrl || "";
            payload.audioName = audioName || "";
          }
        } else {
          payload.audioUrl = "";
          payload.audioName = "";
        }
      }
      if (editingId) {
        await apiHandlers.update(token, editingId, payload);
      } else {
        await apiHandlers.create(token, payload);
      }
      setTitle("");
      setDescription("");
      setCategoryId("");
      setLevelId("");
      setSelectedQuestionIds({});
      setEditingId("");
      setExamStatus("draft");
      setTimeLimit("");
      setPassMark("");
      setAudioUrl("");
      setAudioName("");
      setAudioChanged(false);
      await load();
      setShowCreate(false);
      setSuccess(isEdit ? "Test updated successfully." : "Test created successfully.");
    } catch (err) {
      setError(err.message || "Create failed");
    } finally {
      setSaving(false);
    }
  };

  const onUpdateStatus = async (examId, nextStatus) => {
    setError("");
    try {
      await apiHandlers.update(token, examId, { status: nextStatus });
      await load();
    } catch (err) {
      setError(err.message || "Update status failed");
    }
  };

  const onEditExam = async (examId) => {
    setError("");
    try {
      const exam = await apiHandlers.get(token, examId);
      hydrateFormFromExam(exam);
    } catch (err) {
      setError(err.message || "Load failed");
    }
  };

  const onDuplicateExam = async (examId) => {
    setError("");
    setSaving(true);
    try {
      const exam = await apiHandlers.get(token, examId);
      const questionsArr = (exam.questions || []).map((q) => q._id || q).filter(Boolean);
      await apiHandlers.create(token, {
        title: `${exam.title || "Untitled"} (Copy)`,
        description: exam.description || "",
        questions: questionsArr,
        categoryId: exam.categoryId?._id || null,
        levelId: exam.levelId?._id || null
      });
      await load();
    } catch (err) {
      setError(err.message || "Duplicate failed");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    if (!confirm("Xóa đề thi này?")) return;
    setError("");
    try {
      await apiHandlers.remove(token, id);
      await load();
    } catch (err) {
      setError(err.message || "Delete failed");
    }
  };

  return (
    <div className="adminPageWrap adminTestWrap">
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
      <div className="adminShell adminTestShell">
        <AdminSidebar />
        <main className="adminTestMain">
          {showCreate ? (
            <div className="adminTestCreatePage">
              <div className="adminTestCreateTopbar">
                <div className="adminTestCreateBreadcrumbs">
                  <span>Admin</span>
                  <span className="adminTestSlash">/</span>
                  <button type="button" onClick={() => setShowCreate(false)}>
                    {managerLabelPlural}
                  </button>
                  <span className="adminTestSlash">/</span>
                  <strong>{editingId ? `Edit ${managerLabel}` : `Create New ${managerLabel}`}</strong>
                </div>
                <div className="adminTestCreateActions">
                  <label className="adminTestCreateStatus">
                    <span>Status</span>
                    <select value={examStatus} onChange={(e) => setExamStatus(e.target.value)}>
                      <option value="draft">DRAFT</option>
                      <option value="published">PUBLISHED</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    className="adminTestPrimary"
                    disabled={saving}
                    onClick={onCreate}
                  >
                    <span className="material-symbols-outlined">upload</span>
                    {saving ? "Saving..." : `Save ${managerLabel}`}
                  </button>
                </div>
              </div>

              <div className="adminTestDetailCard">
                <div className="adminTestDetailHeader">
                  <span className="material-symbols-outlined">info</span>
                  <strong>{managerLabel} Details</strong>
                </div>
                <div className="adminTestDetailGrid">
                  <div className="field">
                    <label>TEST TITLE</label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. IELTS Academic Mock Test - Spring 2024"
                    />
                  </div>
                  <div className="field">
                    <label>CATEGORY</label>
                    <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                      <option value="">Select Category</option>
                      {availableCategories.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>TIME LIMIT</label>
                    <input
                      type="number"
                      placeholder="e.g. 60"
                      value={timeLimit}
                      onChange={(e) =>
                        setTimeLimit(e.target.value === "" ? "" : Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>PASS MARK (%)</label>
                    <input
                      type="number"
                      value={passMark}
                      onChange={(e) =>
                        setPassMark(e.target.value === "" ? "" : Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="field adminTestSpan2">
                    <label>INSTRUCTIONS</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter test instructions for candidates..."
                    />
                  </div>
                </div>
                <div className="adminTestAudio">
                  <div className="adminTestAudioHeader">
                    <strong>Listening Audio</strong>
                    <span>Enable when category is Listening (MP3/WAV/AAC).</span>
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
                        className="adminTestUpload"
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
                        <div className="adminTestUploadIcon">
                          <span className="material-symbols-outlined">audio_file</span>
                        </div>
                        <p>{audioName || "Click to upload or drag and drop"}</p>
                        <small>Maximum file size: 10MB</small>
                      </div>
                      {audioUrl && (
                        <div className="adminTestAudioPreview">
                          <audio
                            controls
                            src={
                              audioUrl.startsWith("data:")
                                ? audioUrl
                                : audioUrl.startsWith("http")
                                ? audioUrl
                                : `${apiBaseUrl}${audioUrl}`
                            }
                          />
                          <button type="button" className="adminTestAudioRemove" onClick={onRemoveAudio}>
                            Remove audio
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="adminTestUpload adminTestUpload--disabled">
                      <div className="adminTestUploadIcon">
                        <span className="material-symbols-outlined">lock</span>
                      </div>
                      <p>Select “Listening” category to enable audio upload.</p>
                      <small>Audio is only required for Listening exams.</small>
                    </div>
                  )}
                </div>
              </div>

              <div className="adminTestBuilderHeader">
              <div className="adminTestBuilderTitle">
                <span className="material-symbols-outlined">add_box</span>
                <strong>Questions Builder</strong>
              </div>
                <button type="button" className="adminTestGhost" onClick={randomizeSelection}>
                  <span className="material-symbols-outlined">shuffle</span>
                  Randomize Selection
                </button>
              </div>

              <div className="adminTestBuilderGrid">
                <div className="adminTestBankCard">
                  <div className="adminTestBankTitle">QUESTION BANK</div>
                  <div className="adminTestBankFilters">
                    <div className="adminTestBankSearch">
                      <span className="material-symbols-outlined">search</span>
                      <input
                        value={questionSearch}
                        onChange={(e) => setQuestionSearch(e.target.value)}
                        placeholder="Search questions..."
                      />
                    </div>
                    <select
                      value={questionCategory}
                      onChange={(e) => setQuestionCategory(e.target.value)}
                    >
                      <option value="">All Types</option>
                      {availableCategories.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={questionLevel}
                      onChange={(e) => setQuestionLevel(e.target.value)}
                    >
                      <option value="">All Levels</option>
                      {levels.map((l) => (
                        <option key={l._id} value={l._id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="adminTestBankList">
                    {filteredQuestions.map((q) => (
                      <div
                        key={q._id}
                        className={`adminTestBankItem ${
                          selectedQuestionIds[q._id] ? "is-selected" : ""
                        }`}
                      >
                        <div className="adminTestBankMeta">
                          <span className={`adminTestPill adminTestPill--${slugify(q.categoryId?.name || "general")}`}>
                            {q.categoryId?.name || "General"}
                          </span>
                          <span className="adminTestBankId">ID: #{q.questionId || "N/A"}</span>
                        </div>
                        <div className="adminTestBankText">{stripHtml(q.content)}</div>
                        <button
                          type="button"
                          className="adminTestBankAdd"
                          onClick={() => addQuestion(q._id)}
                          disabled={!!selectedQuestionIds[q._id]}
                        >
                          <span className="material-symbols-outlined">add</span>
                        </button>
                      </div>
                    ))}
                    {!loading && filteredQuestions.length === 0 && (
                      <div className="muted">No questions found.</div>
                    )}
                  </div>
                </div>

                <div className="adminTestContentCard">
                  <div className="adminTestContentHeader">
                    <div>
                      <div className="adminTestContentTitle">{managerLabel.toUpperCase()} CONTENT</div>
                      <div className="adminTestContentMeta">
                        {selectedQuestions.length} Question Added • Est. {estimatedMinutes} mins
                      </div>
                    </div>
                    <button type="button" className="adminTestClear" onClick={clearAllQuestions}>
                      Clear All
                    </button>
                  </div>
                  <div className="adminTestContentList">
                    {selectedQuestions.map((q, idx) => (
                      <div key={q._id} className="adminTestContentItem">
                        <div className="adminTestContentIndex">{idx + 1}</div>
                        <div className="adminTestContentBody">
                          <div className="adminTestContentTag">
                            <span className={`adminTestPill adminTestPill--${slugify(q.categoryId?.name || "general")}`}>
                              {q.categoryId?.name || "General"}
                            </span>
                            <span className="adminTestBankId">ID: #{q.questionId || "N/A"}</span>
                          </div>
                          <div className="adminTestContentText">{stripHtml(q.content)}</div>
                          <div className="adminTestContentFooter">
                            <span>POINTS:</span>
                            <input type="number" value={1} readOnly />
                            <button type="button" onClick={() => removeQuestion(q._id)}>
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!selectedQuestions.length && (
                      <div className="muted">No questions selected yet.</div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <>
              <div className="adminTestHeader">
                <div>
                  <h1>{managerLabel} Management</h1>
                  <p>Create and oversee all certification and mock exams.</p>
                </div>
                <button
                  className="adminTestPrimary"
                  onClick={() => setShowCreate(true)}
                >
                  <span className="material-symbols-outlined">add</span>
                  Create New {managerLabel}
                </button>
              </div>

              <div className="adminTestStatGrid">
                <div className="adminTestStatCard">
                  <div className="adminTestStatIcon is-blue">
                    <span className="material-symbols-outlined">description</span>
                  </div>
                  <div>
                    <div className="adminTestStatLabel">TOTAL {managerLabelPlural.toUpperCase()}</div>
                    <div className="adminTestStatValue">{totalTests}</div>
                  </div>
                </div>
                <div className="adminTestStatCard">
                  <div className="adminTestStatIcon is-green">
                    <span className="material-symbols-outlined">verified</span>
                  </div>
                  <div>
                    <div className="adminTestStatLabel">PUBLISHED</div>
                    <div className="adminTestStatValue">{publishedCount}</div>
                  </div>
                </div>
                <div className="adminTestStatCard">
                  <div className="adminTestStatIcon is-amber">
                    <span className="material-symbols-outlined">edit_square</span>
                  </div>
                  <div>
                    <div className="adminTestStatLabel">DRAFTS</div>
                    <div className="adminTestStatValue">{draftCount}</div>
                  </div>
                </div>
                <div className="adminTestStatCard">
                  <div className="adminTestStatIcon is-purple">
                    <span className="material-symbols-outlined">trending_up</span>
                  </div>
                  <div>
                    <div className="adminTestStatLabel">TOTAL TAKES</div>
                    <div className="adminTestStatValue">{totalTakes}</div>
                  </div>
                </div>
              </div>

              <div className="adminTestTableCard">
              <div className="adminTestTableTop">
              <div className="adminTestTabs">
                <button
                  type="button"
                  className={tab === "all" ? "is-active" : ""}
                  onClick={() => setTab("all")}
                >
                  All {managerLabelPlural}
                </button>
                <button
                  type="button"
                  className={tab === "published" ? "is-active" : ""}
                  onClick={() => setTab("published")}
                >
                  Published
                </button>
                <button
                  type="button"
                  className={tab === "draft" ? "is-active" : ""}
                  onClick={() => setTab("draft")}
                >
                  Drafts
                </button>
              </div>
            </div>

            <div className="adminTestTable">
              <div className="adminTestTableHead">
                <div>{managerLabel.toUpperCase()} TITLE</div>
                <div>CATEGORY</div>
                <div>QNS</div>
                <div>DURATION</div>
                <div>ATTEMPTS</div>
                <div>STATUS</div>
                <div>ACTIONS</div>
              </div>
              {pageItems.map((e) => (
                <div key={e._id} className="adminTestRow">
                  <div className="adminTestTitleBlock">
                    <div className="adminTestTitle">{e.title}</div>
                    <div className="adminTestMeta">
                      {e.description || "No description"}
                    </div>
                  </div>
                  <div>
                    <span className={`adminTestPill adminTestPill--${slugify(e.category?.name || "general")}`}>
                      {e.category?.name || "General"}
                    </span>
                  </div>
                  <div>{e.questionCount || 0}</div>
                  <div>{e.duration}m</div>
                  <div>{e.attempts || 0}</div>
                  <div>
                    <select
                      className={`adminTestStatusSelect ${
                        e.status === "published" ? "is-published" : "is-draft"
                      }`}
                      value={e.status === "published" ? "published" : "draft"}
                      onChange={(ev) => onUpdateStatus(e._id, ev.target.value)}
                    >
                      <option value="published">PUBLISHED</option>
                      <option value="draft">DRAFT</option>
                    </select>
                  </div>
                  <div className="adminTestActions">
                    <button
                      type="button"
                      className="adminTestIconBtn"
                      title="Edit"
                      onClick={() => onEditExam(e._id)}
                    >
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button
                      type="button"
                      className="adminTestIconBtn"
                      title="Duplicate"
                      onClick={() => onDuplicateExam(e._id)}
                    >
                      <span className="material-symbols-outlined">content_copy</span>
                    </button>
                    <button
                      type="button"
                      className="adminTestIconBtn danger"
                      title="Delete"
                      onClick={() => onDelete(e._id)}
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              ))}
              {!loading && pageItems.length === 0 && (
                <div className="muted" style={{ padding: 16 }}>
                  Chưa có đề thi.
                </div>
              )}
            </div>

            <div className="adminTestTableFooter">
              <span>
                Showing {filteredExams.length === 0 ? 0 : (page - 1) * pageSize + 1} to{" "}
                {Math.min(page * pageSize, filteredExams.length)} of {filteredExams.length} results
              </span>
              <div className="adminTestPagination">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <span className="is-active">{page}</span>
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
            </>
          )}
        </main>
      </div>
    </div>
  );
}
