import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api/index.js";
import { useAuth } from "../../state/AuthContext.jsx";

const CARD_TEMPLATES = [
  {
    key: "grammar",
    title: "Grammar",
    desc: "Perfect your sentence structure, tenses, and complex clauses with guided exercises.",
    tone: "purple",
    icon: "spellcheck",
    level: "Intermediate",
    cta: "Start Grammar Practice →"
  },
  {
    key: "vocabulary",
    title: "Vocabulary ",
    desc: "Expand your lexicon with high-frequency academic and professional words.",
    tone: "emerald",
    icon: "auto_stories",
    level: "Expert",
    cta: "Open Flashcards →"
  },
  {
    key: "listening",
    title: "Listening Lab",
    desc: "Improve your comprehension with diverse accents and real-world audio scenarios.",
    tone: "orange",
    icon: "headphones",
    level: "Beginner",
    cta: "Start Listening →"
  },
  {
    key: "reading",
    title: "Reading Intensive",
    desc: "Master skimming, scanning, and deep analysis of academic passages.",
    tone: "blue",
    icon: "menu_book",
    level: "Mixed",
    cta: "Browse Passages →"
  }
];

const TUTOR_FEATURES = [
  {
    icon: "edit_note",
    title: "Writing & Correction",
    desc: "Check spelling, grammar and suggest more natural phrasing."
  },
  {
    icon: "question_answer",
    title: "Q&A Support",
    desc: "Get instant answers to grammar questions with specific examples."
  },
  {
    icon: "fact_check",
    title: "Answer Explanations",
    desc: "Analyze sentence structure and clarify why answers are correct or wrong."
  },
  {
    icon: "insights",
    title: "Performance Analysis",
    desc: "Based on your exam history, discover your strengths and weaknesses."
  },
  {
    icon: "translate",
    title: "Translation & Vocabulary",
    desc: "Translate meanings, examples, and pronunciations for highlighted text."
  }
];

const TUTOR_ACTIONS = [
  "Explain Answer",
  "Translate Text",
  "Give Examples",
  "Correct My Writing"
];

const TUTOR_ACTION_PROMPTS = {
  "Explain Answer": "Explain this answer and clarify what is correct or wrong in this sentence: ",
  "Translate Text": "Translate the following text and explain the key vocabulary: ",
  "Give Examples": "Provide more clear examples about this grammar point: ",
  "Correct My Writing": "Correct this sentence for better natural English and explain the errors: "
};

const formatDuration = (seconds) => {
  if (!seconds && seconds !== 0) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (!mins) return `${secs}s`;
  return `${mins}m ${secs}s`;
};

export default function Practice() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tutorOpen, setTutorOpen] = useState(false);
  const tutorInputRef = useRef(null);
  const [tutorMessages, setTutorMessages] = useState(() => [
    {
      role: "assistant",
      content:
        "Xin chào! Tôi có thể giúp bạn sửa câu, giải thích ngữ pháp, dịch nghĩa và gợi ý cách học phù hợp."
    }
  ]);
  const [tutorInput, setTutorInput] = useState("");
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorError, setTutorError] = useState("");
  const [tutorHydratedKey, setTutorHydratedKey] = useState("");
  const tutorChatEndRef = useRef(null);

  const tutorStorageKey = useMemo(() => {
    const userKey = user?._id || user?.id || user?.email || "guest";
    return `ai_tutor_history_${userKey}`;
  }, [user]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [cats, res] = await Promise.all([
          api.listCategories(token),
          api.getMyResults(token)
        ]);
        if (!alive) return;
        setCategories(cats || []);
        setResults(res || []);
      } catch (err) {
        if (alive) setError(err.message || "Unable to load practice data.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  useEffect(() => {
    if (!tutorStorageKey) return;
    try {
      const raw = localStorage.getItem(tutorStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        const sanitized = parsed
          .filter((item) => item && (item.role === "user" || item.role === "assistant"))
          .map((item) => ({ role: item.role, content: String(item.content || "") }))
          .slice(-30);
        if (sanitized.length) {
          setTutorMessages(sanitized);
        }
      }
    } catch {
      // ignore storage parsing errors
    } finally {
      setTutorHydratedKey(tutorStorageKey);
    }
  }, [tutorStorageKey]);

  useEffect(() => {
    if (!tutorStorageKey || tutorHydratedKey !== tutorStorageKey) return;
    try {
      const trimmed = tutorMessages.slice(-30);
      localStorage.setItem(tutorStorageKey, JSON.stringify(trimmed));
    } catch {
      // ignore storage write errors
    }
  }, [tutorMessages, tutorStorageKey, tutorHydratedKey]);

  useEffect(() => {
    if (!tutorOpen) return;
    requestAnimationFrame(() => {
      tutorChatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }, [tutorOpen, tutorMessages, tutorLoading]);

  const resultsByCategory = useMemo(() => {
    return results.reduce((acc, item) => {
      const key = (item.examCategoryName || "General").toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [results]);

  const tutorInsight = useMemo(() => {
    const entries = Object.entries(resultsByCategory);
    if (!entries.length) return null;
    const sorted = [...entries].sort((a, b) => a[1] - b[1]);
    const weakestKey = sorted[0]?.[0];
    const strongestKey = sorted[sorted.length - 1]?.[0];
    const resolveName = (key) => {
      if (!key) return "";
      const match = categories.find(
        (cat) => (cat.name || "").toLowerCase() === String(key).toLowerCase()
      );
      if (match?.name) return match.name;
      return String(key).replace(/\b\w/g, (letter) => letter.toUpperCase());
    };
    const weakest = resolveName(weakestKey);
    const strongest = resolveName(strongestKey);
    const weakMatch = categories.find(
      (cat) => (cat.name || "").toLowerCase() === String(weakestKey).toLowerCase()
    );
    return {
      weakest,
      strongest,
      weakId: weakMatch?._id
    };
  }, [categories, resultsByCategory]);

  const recentResults = useMemo(() => {
    return [...results]
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      .slice(0, 3);
  }, [results]);

  const cards = useMemo(() => {
    const lowered = categories.map((cat) => ({
      ...cat,
      key: cat.name?.toLowerCase() || ""
    }));
    return CARD_TEMPLATES.map((template) => {
      const match = lowered.find((cat) => {
        if (!cat.key) return false;
        return (
          cat.key === template.key ||
          cat.key.includes(template.key) ||
          template.key.includes(cat.key)
        );
      });
      const displayTitle = template.title;
      const categoryName = match?.name || template.key;
      const countKey = categoryName.toLowerCase();
      const total = results.length || 0;
      const hit = resultsByCategory[countKey] || 0;
      const progress = total ? Math.min(100, Math.round((hit / total) * 100)) : 0;
      return {
        ...template,
        id: match?._id || template.key,
        displayTitle,
        categoryName,
        progress,
        attemptText: hit ? `${hit} sessions` : "No sessions yet"
      };
    });
  }, [categories, resultsByCategory, results.length]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const startPractice = (categoryHint) => {
    const params = new URLSearchParams();
    params.set("mode", "practice");
    if (categoryHint) {
      const hint = String(categoryHint).toLowerCase();
      const match = categories.find((cat) => {
        const name = (cat?.name || "").toLowerCase();
        return cat?._id === categoryHint || name === hint || name.includes(hint) || hint.includes(name);
      });
      if (match?._id) {
        params.set("categoryId", match._id);
      } else {
        params.set("categoryName", String(categoryHint));
      }
    }
    navigate(`/user/exams?${params.toString()}`);
  };

  const openGrammarPractice = () => {
    startPractice("grammar");
  };

  const openVocabularyFlashcards = () => {
    navigate("/user/vocabulary-flashcards");
  };

  const buildTutorHistory = (nextMessage) => {
    const history = nextMessage ? [...tutorMessages, nextMessage] : [...tutorMessages];
    return history
      .filter((item) => item && (item.role === "user" || item.role === "assistant"))
      .slice(-8)
      .map((item) => ({ role: item.role, content: item.content }));
  };

  const sendTutorMessage = async (rawMessage, action) => {
    if (tutorLoading) return;
    const message = (rawMessage || "").toString().trim();
    if (!message) return;
    const userMessage = { role: "user", content: message };
    setTutorMessages((prev) => [...prev, userMessage]);
    setTutorInput("");
    setTutorError("");
    setTutorLoading(true);
    try {
      const payload = {
        message,
        action: action || undefined,
        history: buildTutorHistory(userMessage),
        insight: tutorInsight
          ? { strongest: tutorInsight.strongest, weakest: tutorInsight.weakest }
          : undefined
      };
      const data = await api.askTutor(token, payload);
      const reply =
        data?.reply ||
        "AI không trả về nội dung. Vui lòng thử lại.";
      setTutorMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      const fallback =
        "AI đang gặp sự cố. Vui lòng kiểm tra cấu hình backend và thử lại.";
      setTutorError(err.message || fallback);
      setTutorMessages((prev) => [...prev, { role: "assistant", content: fallback }]);
    } finally {
      setTutorLoading(false);
    }
  };

  const handleTutorSubmit = () => {
    sendTutorMessage(tutorInput);
  };

  const handleTutorAction = (action) => {
    const prompt = TUTOR_ACTION_PROMPTS[action] || `${action}: `;
    setTutorInput(prompt);
    setTutorOpen(true);
    setTutorError("");
    requestAnimationFrame(() => tutorInputRef.current?.focus());
  };

  return (
    <div className="practicePage">
      <header className="portalTopbar">
        <div className="portalShell portalTopbarInner">
          <div className="portalBrand">
            <span className="portalLogo">
              <img className="portalLogoImg" src="/logo.png" alt="English Portal" />
            </span>
            <span>English Portal</span>
          </div>
          <nav className="portalNav">
            <button type="button" onClick={() => navigate("/user")}>
              Home
            </button>
            <button type="button" className="is-active" onClick={() => navigate("/user/practice")}>
              Practice
            </button>
            <button type="button" onClick={() => navigate("/user/exams")}>
              Exams
            </button>
            <button type="button" onClick={() => navigate("/user/profile?tab=history")}>
              History
            </button>
          </nav>
          <div className="portalActions">
            <label className="portalSearch">
              <span className="material-symbols-outlined portalIcon">search</span>
              <input type="search" placeholder="Search courses or exams..." />
            </label>
            <span className="material-symbols-outlined portalIcon">notifications</span>
            <button className="portalBtn" onClick={() => navigate("/user/profile")}>
              {user?.name || "Profile"}
            </button>
            <button
              className="portalBtn portalBtnDanger"
              onClick={handleLogout}
              style={{ background: "#ef4444", borderColor: "#ef4444", color: "#fff" }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="practiceMain">
        <div className="portalShell">
          <div className="practiceIntro">
            <h1>Select Your Practice Mode</h1>
            <p>Choose a specific skill to focus on today and track your progress in real-time.</p>
          </div>

          {error && <div className="practiceError">{error}</div>}

          <div className="practiceLayout">
            <section className="practiceGrid">
              {cards.map((card) => (
                <article className="practiceCard" key={card.key}>
                  <div className="practiceCardTop">
                    <span className={`practiceIcon practiceIcon--${card.tone}`}>
                      <span className="material-symbols-outlined">{card.icon}</span>
                    </span>
                    <span className={`practiceLevel practiceLevel--${card.tone}`}>
                      {card.level}
                    </span>
                  </div>
                  <h3>{card.displayTitle}</h3>
                  <p>{card.desc}</p>
                  <div className="practiceProgressRow">
                    <span>Monthly Progress</span>
                    <strong>{card.progress}%</strong>
                  </div>
                  <div className="practiceProgressBar">
                    <span style={{ width: `${card.progress}%` }} />
                  </div>
                  <div className="practiceMeta">{card.attemptText}</div>
                  <button
                    type="button"
                    onClick={() =>
                      card.key === "grammar"
                        ? openGrammarPractice()
                        : card.key === "vocabulary"
                          ? openVocabularyFlashcards()
                          : startPractice(card.categoryName || card.id)
                    }
                  >
                    {card.cta}
                  </button>
                </article>
              ))}
            </section>

            <aside className="practiceAside">
              <div className="practiceSideCard">
                <div className="practiceSideHeader">
                  <div>
                    <span className="material-symbols-outlined">bolt</span>
                    <h4>Quick Start</h4>
                    <p>Recommended for you</p>
                  </div>
                </div>
                <div className="practiceQuickList">
                  {loading && <span className="practiceMuted">Loading latest activity…</span>}
                  {!loading && recentResults.length === 0 && (
                    <span className="practiceMuted">No recent practice yet.</span>
                  )}
                  {!loading &&
                    recentResults.map((item) => (
                      <button
                        type="button"
                        key={item._id}
                        className="practiceQuickItem"
                        onClick={() => startPractice(item.examCategoryId)}
                      >
                        <span className="material-symbols-outlined">play_circle</span>
                        <div>
                          <h5>{item.examTitle || "Practice Session"}</h5>
                          <p>
                            {item.examCategoryName || "General"} ·{" "}
                            {formatDuration(item.timeSpent)}
                          </p>
                        </div>
                        <span className="material-symbols-outlined">arrow_forward</span>
                      </button>
                    ))}
                </div>
              </div>

              <div className="practiceSideCard practiceTip">
                <div className="practiceTipHeader">
                  <span className="material-symbols-outlined">tips_and_updates</span>
                  <h4>Pro Tip</h4>
                </div>
                <p>Consistent practice of 15 minutes daily improves retention by up to 40%.</p>
              </div>

              <div className="practiceSideCard practiceHelp">
                <button type="button" onClick={() => setTutorOpen((open) => !open)}>
                  <span className="material-symbols-outlined">smart_toy</span>
                  {tutorOpen ? "Hide AI Tutor" : "AI Tutor Help"}
                </button>
                <p>
                  {tutorOpen
                    ? "Your tutor is ready to explain, translate, and recommend practice."
                    : "Open your tutor for instant help when you get stuck."}
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {tutorOpen && (
        <div className="practiceTutorPanel" role="dialog" aria-label="AI Tutor Help">
          <div className="practiceTutorPanelHeader">
            <div className="practiceTutorPanelTitle">
              <div className="practiceTutorAvatar">
                <span className="material-symbols-outlined">smart_toy</span>
              </div>
              <div>
                <h4>Your AI English Tutor</h4>
                <p>
                  <span className="practiceTutorStatusDot" />
                  Always online
                </p>
              </div>
            </div>
            <button
              type="button"
              className="practiceTutorClose"
              onClick={() => setTutorOpen(false)}
              aria-label="Close AI Tutor"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="practiceTutorPanelBody">
            <div className="practiceTutorIntro">
              <p>
                Personalize your learning with an intelligent virtual tutor: correct your writing, explain answers, and remind you of areas to improve.
              </p>
            </div>

            <div className="practiceTutorFeatures">
              {TUTOR_FEATURES.map((feature) => (
                <div className="practiceTutorFeature" key={feature.title}>
                  <span className="practiceTutorFeatureIcon">
                    <span className="material-symbols-outlined">{feature.icon}</span>
                  </span>
                  <div>
                    <h5>{feature.title}</h5>
                    <p>{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="practiceTutorChat">
              {tutorMessages.map((msg, index) => (
                <div
                  key={`${msg.role}-${index}`}
                  className={`practiceTutorBubble ${
                    msg.role === "user" ? "practiceTutorBubble--user" : "practiceTutorBubble--ai"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {tutorLoading && (
                <div className="practiceTutorBubble practiceTutorBubble--ai">
                  Composing answer...
                </div>
              )}
              <div ref={tutorChatEndRef} />
            </div>
            {tutorError && <div className="practiceTutorError">{tutorError}</div>}

            <div className="practiceTutorInsight">
              <span className="material-symbols-outlined">insights</span>
              <div>
                <h5>AI Insight</h5>
                {tutorInsight ? (
                  <>
                    <p>
                      {tutorInsight.strongest === tutorInsight.weakest
                        ? `You're practicing most in ${tutorInsight.strongest}. Try other skills to maintain balance.`
                        : `You're strong in ${tutorInsight.strongest} but weak in ${tutorInsight.weakest}. Let's practice ${tutorInsight.weakest} more.`}
                    </p>
                    {tutorInsight.weakest && (
                      <button
                        type="button"
                        className="practiceTutorLink"
                        onClick={() =>
                          startPractice(tutorInsight.weakId || tutorInsight.weakest)
                        }
                      >
                        Practice {tutorInsight.weakest}
                        <span className="material-symbols-outlined">arrow_forward</span>
                      </button>
                    )}
                  </>
                ) : (
                  <p>Complete more exams for AI to analyze your strengths and weaknesses.</p>
                )}
              </div>
            </div>

            <div className="practiceTutorActions">
              {TUTOR_ACTIONS.map((action) => (
                <button
                  type="button"
                  key={action}
                  className="practiceTutorAction"
                  onClick={() => handleTutorAction(action)}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>

          <div className="practiceTutorInputRow">
            <input
              ref={tutorInputRef}
              type="text"
              placeholder="Ask your tutor anything..."
              value={tutorInput}
              onChange={(event) => setTutorInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleTutorSubmit();
                }
              }}
              disabled={tutorLoading}
            />
            <button type="button" aria-label="Send" onClick={handleTutorSubmit} disabled={tutorLoading}>
              <span className="material-symbols-outlined">send</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
