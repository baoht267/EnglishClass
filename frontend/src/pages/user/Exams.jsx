import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../../api/index.js";
import { useAuth } from "../../state/AuthContext.jsx";
import "../../grammarExam.css";
import "../../examSelection.css";

export default function UserExams() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [exams, setExams] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    weeklySessions: 0,
    weeklyAccuracy: 0,
    streak: 0,
    track: "Beginner"
  });
  const [statsLoading, setStatsLoading] = useState(false);
  const [listPage, setListPage] = useState(1);
  const listPageSize = 4;
  const mode = searchParams.get("mode");
  const levelId = searchParams.get("levelId");
  const categoryId = searchParams.get("categoryId");
  const categoryName = searchParams.get("categoryName");
  const grammarTopic = searchParams.get("grammarTopic");
  const isPracticeView = mode === "practice";

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = isPracticeView
          ? await api.listPractices(token)
          : await api.listExams(token);
        if (alive) setExams(data);
      } catch (err) {
        if (alive) setError(err.message || "Load failed");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, isPracticeView]);
  const isGrammarView =
    isPracticeView &&
    ((categoryName || "").toLowerCase().includes("grammar") || Boolean(grammarTopic));

  const filteredExams = useMemo(() => {
    let list = exams.filter((e) => (e.status || "").toLowerCase() === "published");
    if (mode === "practice") {
      if (levelId) list = list.filter((e) => e.level?._id === levelId);
      if (categoryId) {
        list = list.filter((e) => e.category?._id === categoryId);
      } else if (categoryName) {
        const needle = categoryName.toLowerCase();
        list = list.filter((e) => (e.category?.name || "").toLowerCase().includes(needle));
      }
    }
    if (grammarTopic) {
      const needle = grammarTopic.toLowerCase();
      const filteredByTopic = list.filter(
        (e) =>
          (e.title || "").toLowerCase().includes(needle) ||
          (e.description || "").toLowerCase().includes(needle)
      );
      if (filteredByTopic.length) {
        list = filteredByTopic;
      }
    }
    return list;
  }, [exams, mode, levelId, categoryId, categoryName, grammarTopic]);

  useEffect(() => {
    setListPage(1);
  }, [filteredExams.length, mode, levelId, categoryId, categoryName, grammarTopic]);

  const totalPages = Math.max(1, Math.ceil(filteredExams.length / listPageSize));
  const currentPage = Math.min(listPage, totalPages);
  const pagedExams = filteredExams.slice(
    (currentPage - 1) * listPageSize,
    currentPage * listPageSize
  );
  const pageButtons = Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1);
  const showingStart = filteredExams.length ? (currentPage - 1) * listPageSize + 1 : 0;
  const showingEnd = Math.min(currentPage * listPageSize, filteredExams.length);

  useEffect(() => {
    if (!isPracticeView) return;
    let alive = true;
    setStatsLoading(true);
    (async () => {
      try {
        const results = await api.getMyResults(token);
        if (!alive) return;
        let filtered = results || [];
        if (categoryId) {
          filtered = filtered.filter(
            (item) => String(item.examCategoryId) === String(categoryId)
          );
        } else if (categoryName) {
          const needle = categoryName.toLowerCase();
          filtered = filtered.filter((item) =>
            (item.examCategoryName || "").toLowerCase().includes(needle)
          );
        }
        if (!filtered.length) {
          setStats({ weeklySessions: 0, weeklyAccuracy: 0, streak: 0, track: "Beginner" });
          return;
        }

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const msPerDay = 24 * 60 * 60 * 1000;

        const dayKey = (date) => {
          const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          return local.toISOString().slice(0, 10);
        };

        const resultDates = filtered.map((item) => new Date(item.submittedAt || item.createdAt));
        const daySet = new Set(resultDates.map((date) => dayKey(date)));

        let streak = 0;
        while (true) {
          const checkDate = new Date(todayStart.getTime() - streak * msPerDay);
          if (!daySet.has(dayKey(checkDate))) break;
          streak += 1;
        }

        const weeklyResults = filtered.filter((item) => {
          const date = new Date(item.submittedAt || item.createdAt);
          const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const diffDays = Math.floor((todayStart - dateStart) / msPerDay);
          return diffDays >= 0 && diffDays < 7;
        });

        const weeklyTotals = weeklyResults.reduce(
          (acc, item) => {
            acc.score += Number(item.score || 0);
            acc.total += Number(item.total || 0);
            return acc;
          },
          { score: 0, total: 0 }
        );

        const weeklyAccuracy = weeklyTotals.total
          ? Math.round((weeklyTotals.score / weeklyTotals.total) * 100)
          : 0;

        const overallTotals = filtered.reduce(
          (acc, item) => {
            acc.score += Number(item.score || 0);
            acc.total += Number(item.total || 0);
            return acc;
          },
          { score: 0, total: 0 }
        );
        const overallAccuracy = overallTotals.total
          ? Math.round((overallTotals.score / overallTotals.total) * 100)
          : 0;

        const track =
          overallAccuracy >= 80 ? "Advanced" : overallAccuracy >= 60 ? "Intermediate" : "Beginner";

        setStats({
          weeklySessions: weeklyResults.length,
          weeklyAccuracy,
          streak,
          track
        });
      } catch {
        if (alive) {
          setStats({ weeklySessions: 0, weeklyAccuracy: 0, streak: 0, track: "Beginner" });
        }
      } finally {
        if (alive) setStatsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, isGrammarView, categoryId, categoryName]);

  const categoryLabel =
    (categoryName || "").trim() ||
    (filteredExams[0]?.category?.name || "").trim();
  const topicLabel = grammarTopic
    ? grammarTopic
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : categoryLabel || "Practice";
  const heroBadgeLabel = isGrammarView ? "Grammar Mastery" : "Practice Exams";
  const heroBadgeIcon = isGrammarView ? "auto_stories" : "school";
  const heroDescription = isGrammarView
    ? "Select a practice exam to improve your command over English verb forms. Each test focuses on specific tense structures with detailed feedback."
    : "Select a practice exam to strengthen your skills and track real-time progress across categories.";

  const getLevelColor = (levelName) => {
    if (!levelName) return "muted";
    const lower = levelName.toLowerCase();
    if (lower.includes("easy") || lower.includes("dễ")) return "ok";
    if (lower.includes("medium") || lower.includes("trung")) return "warn";
    if (lower.includes("hard") || lower.includes("khó")) return "danger";
    return "muted";
  };

  const getLevelTone = (levelName) => {
    if (!levelName) return "neutral";
    const lower = levelName.toLowerCase();
    if (lower.includes("beginner") || lower.includes("easy") || lower.includes("dễ")) return "beginner";
    if (lower.includes("intermediate") || lower.includes("medium") || lower.includes("trung")) return "intermediate";
    if (lower.includes("advanced") || lower.includes("hard") || lower.includes("khó")) return "advanced";
    return "neutral";
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const timeForExam = (exam) => {
    const timeLimit = Number(exam.timeLimit);
    if (Number.isFinite(timeLimit) && timeLimit > 0) return `${timeLimit} minutes`;
    return `${Math.max(10, (exam.questionCount || 0) * 2)} minutes`;
  };

  const totalExams = filteredExams.length;
  const totalQuestions = filteredExams.reduce(
    (acc, exam) => acc + Number(exam.questionCount || 0),
    0
  );
  const totalMinutes = filteredExams.reduce((acc, exam) => {
    const timeLimit = Number(exam.timeLimit);
    const minutes = Number.isFinite(timeLimit) && timeLimit > 0
      ? timeLimit
      : Math.max(10, (exam.questionCount || 0) * 2);
    return acc + minutes;
  }, 0);
  const avgMinutes = totalExams ? Math.round(totalMinutes / totalExams) : 0;

  if (isPracticeView) {
    const sideExam = filteredExams[1] || filteredExams[0];
    return (
      <div className="grammarExamPage">
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
              <button
                type="button"
                className="is-active"
                onClick={() => navigate("/user/practice")}
              >
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
                <input type="search" placeholder="Search grammar topics..." />
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

        <main className="grammarExamMain">
          <div className="portalShell">
            <section className="grammarExamHero">
              <div className="grammarExamIntro">
                <span className="grammarExamBadge">
                  <span className="material-symbols-outlined">{heroBadgeIcon}</span>
                  {heroBadgeLabel}
                </span>
                <h1>Available Tests for {topicLabel}</h1>
                <p>{heroDescription}</p>
              </div>
                <div className="grammarExamStatsCard">
                  <div>
                    <span className="grammarExamStatsLabel">Weekly Accuracy</span>
                    <div
                      className="grammarExamRing"
                      style={{
                        "--percent": stats.weeklyAccuracy,
                        "--ring-color":
                          stats.weeklyAccuracy >= 70
                            ? "#22c55e"
                            : stats.weeklyAccuracy >= 40
                            ? "#f59e0b"
                            : "#ef4444"
                      }}
                    >
                      <div className="grammarExamRingInner">
                        <strong>{stats.weeklyAccuracy}%</strong>
                        <span>{stats.weeklySessions} sessions</span>
                      </div>
                    </div>
                  {statsLoading && <p className="grammarExamHint">Syncing results…</p>}
                </div>
                <div className="grammarExamStatsMeta">
                  <div>
                    <span className="material-symbols-outlined">local_fire_department</span>
                    {stats.streak} Day Streak
                  </div>
                  <div>
                    <span className="material-symbols-outlined">workspace_premium</span>
                    {stats.track} Track
                  </div>
                </div>
              </div>
            </section>

            {loading && (
              <div className="grammarExamLoading">
                <span className="muted">Loading exams...</span>
              </div>
            )}

            {error && <div className="callout error">{error}</div>}

            {!loading && filteredExams.length === 0 && (
              <div className="grammarExamEmpty">
                <div className="grammarExamEmptyIcon">📭</div>
                <div className="grammarExamEmptyTitle">No matching exams</div>
                <div className="muted">Try selecting a different grammar topic.</div>
              </div>
            )}

            {!loading && filteredExams.length > 0 && (
              <div className="grammarExamLayout">
                <section className="grammarExamList">
                  {pagedExams.map((exam) => (
                    <article className="grammarExamCard" key={exam._id}>
                      <div className="grammarExamCardBody">
                        <div className="grammarExamCardTags">
                          {exam.level?.name && (
                            <span
                              className={`grammarExamTag grammarExamTag--${getLevelTone(
                                exam.level.name
                              )}`}
                            >
                              {exam.level.name}
                            </span>
                          )}
                          {exam.category?.name && (
                            <span className="grammarExamTag grammarExamTag--ghost">
                              {exam.category.name}
                            </span>
                          )}
                        </div>
                        <h3>{exam.title}</h3>
                        <p>{exam.description || "Grammar practice exam."}</p>
                        <div className="grammarExamMeta">
                          <span>
                            <span className="material-symbols-outlined">library_books</span>
                            {exam.questionCount || 0} Questions
                          </span>
                          <span>
                            <span className="material-symbols-outlined">schedule</span>
                            {timeForExam(exam)}
                          </span>
                        </div>
                      </div>
                      <div className="grammarExamCardAction">
                        <Link className="grammarExamBtn" to={`/user/exams/${exam._id}?mode=practice`}>
                          Start Practice
                          <span className="material-symbols-outlined">arrow_forward</span>
                        </Link>
                      </div>
                    </article>
                  ))}

                  {filteredExams.length > listPageSize && (
                    <div className="grammarExamPagination">
                      <p>
                        Showing {showingStart}-{showingEnd} of {filteredExams.length} exams
                      </p>
                      <div className="grammarExamPager">
                        <button
                          type="button"
                          className="grammarExamPageBtn"
                          disabled={currentPage === 1}
                          onClick={() => setListPage((p) => Math.max(1, p - 1))}
                        >
                          <span className="material-symbols-outlined">chevron_left</span>
                        </button>
                        {pageButtons.map((num) => (
                          <button
                            key={num}
                            type="button"
                            className={`grammarExamPageBtn ${
                              num === currentPage ? "is-active" : ""
                            }`}
                            onClick={() => setListPage(num)}
                          >
                            {num}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="grammarExamPageBtn"
                          disabled={currentPage === totalPages}
                          onClick={() => setListPage((p) => Math.min(totalPages, p + 1))}
                        >
                          <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                      </div>
                    </div>
                  )}
                </section>

                <aside className="grammarExamSidebar">
                  {sideExam && (
                    <div className="grammarExamSideCard">
                      <div className="grammarExamSideHeader">
                        <span className="material-symbols-outlined">hub</span>
                        <span className="grammarExamTag grammarExamTag--intermediate">
                          {sideExam.level?.name || "Intermediate"}
                        </span>
                      </div>
                      <h4>{sideExam.title}</h4>
                      <p>{sideExam.description || "Focused grammar drills."}</p>
                      <div className="grammarExamSideMeta">
                        <span>{sideExam.questionCount || 0} Questions</span>
                        <span>0% progress</span>
                      </div>
                      <button
                        type="button"
                        className="grammarExamSideBtn"
                        onClick={() => navigate("/user/profile?tab=history")}
                      >
                        Start Review
                        <span className="material-symbols-outlined">play_arrow</span>
                      </button>
                    </div>
                  )}
                  <div className="grammarExamTip">
                    <div className="grammarExamTipHeader">
                      <span className="material-symbols-outlined">tips_and_updates</span>
                      <h4>Study Tip</h4>
                    </div>
                    <p>
                      Consistency beats intensity. Try to complete at least one 15-minute practice
                      session every day to maintain your streak and memory retention.
                    </p>
                  </div>
                </aside>
              </div>
            )}
          </div>
        </main>

        <footer className="portalFooter">
          <div className="portalShell portalFooterGrid">
            <div>
              <h4>English Portal</h4>
              <p>
                Empowering students worldwide to achieve their English language goals through
                interactive learning.
              </p>
            </div>
            <div>
              <h4>Platform</h4>
              <a href="#home">About Us</a>
              <a href="#pricing">Pricing</a>
              <a href="#schools">For Schools</a>
            </div>
            <div>
              <h4>Support</h4>
              <a href="#help">Help Center</a>
              <a href="#contact">Contact Us</a>
              <a href="#terms">Terms of Service</a>
            </div>
            <div>
              <h4>Connect</h4>
              <div className="portalSocial">
                <span>🌐</span>
                <span>✉️</span>
                <span>📷</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="examSelectionPage">
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
            <button type="button" onClick={() => navigate("/user/practice")}>
              Practice
            </button>
            <button type="button" className="is-active" onClick={() => navigate("/user/exams")}>
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

      <main className="examSelectionMain">
        <div className="portalShell">
          <section className="examSelectionHero">
            <div className="examSelectionHeroContent">
              <span className="examSelectionBadge">
                <span className="material-symbols-outlined">auto_stories</span>
                Practice Exams
              </span>
              <h1>Exam Selection</h1>
              <p>Please select an exam to begin your practice session and track your progress.</p>
              <div className="examSelectionHeroActions">
                <Link className="examSelectionGhostBtn" to="/user/practice">
                  ← Back to Practice
                </Link>
                <button
                  type="button"
                  className="examSelectionPrimaryBtn"
                  onClick={() => navigate("/user/profile?tab=history")}
                >
                  View History
                </button>
              </div>
            </div>
            <div className="examSelectionSummary">
              <h3>Overview</h3>
              <div className="examSelectionSummaryGrid">
                <div>
                  <span>Total Exams</span>
                  <strong>{totalExams}</strong>
                </div>
                <div>
                  <span>Total Questions</span>
                  <strong>{totalQuestions}</strong>
                </div>
                <div>
                  <span>Avg. Duration</span>
                  <strong>{avgMinutes} min</strong>
                </div>
              </div>
              <div className="examSelectionSummaryBar">
                <span style={{ width: `${Math.min(100, totalExams * 12)}%` }} />
              </div>
              <p>Choose an exam below to start your next practice run.</p>
            </div>
          </section>

          {loading && <div className="examSelectionState">Loading exams...</div>}
          {error && <div className="examSelectionError">{error}</div>}

          {!loading && !filteredExams.length && (
            <div className="examSelectionEmpty">
              <div className="examSelectionEmptyIcon">📭</div>
              <h4>No matching exams</h4>
              <p>Try selecting a different difficulty or category.</p>
            </div>
          )}

          {!loading && filteredExams.length > 0 && (
            <section className="examSelectionGrid">
              {filteredExams.map((e) => (
                <article className="examSelectionCard" key={e._id}>
                  <div className="examSelectionCardTop">
                    <div className="examSelectionIcon">
                      <span className="material-symbols-outlined">description</span>
                    </div>
                    <div className="examSelectionBadges">
                      {e.level?.name && (
                        <span className={`examSelectionTag is-${getLevelTone(e.level.name)}`}>
                          {e.level.name}
                        </span>
                      )}
                      {e.category?.name && (
                        <span className="examSelectionTag is-ghost">{e.category.name}</span>
                      )}
                    </div>
                  </div>
                  <h3>{e.title}</h3>
                  <p>{e.description || "English multiple choice exam"}</p>
                  <div className="examSelectionMeta">
                    <span>
                      <span className="material-symbols-outlined">library_books</span>
                      {e.questionCount || 0} questions
                    </span>
                    <span>
                      <span className="material-symbols-outlined">schedule</span>
                      {timeForExam(e)}
                    </span>
                  </div>
                  <Link className="examSelectionStartBtn" to={`/user/exams/${e._id}`}>
                    Start Exam
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </Link>
                </article>
              ))}
            </section>
          )}
        </div>
      </main>

      <footer className="portalFooter">
        <div className="portalShell portalFooterGrid">
          <div>
            <h4>English Portal</h4>
            <p>
              Empowering students worldwide to achieve their English language goals through
              interactive learning.
            </p>
          </div>
          <div>
            <h4>Platform</h4>
            <a href="#home">About Us</a>
            <a href="#pricing">Pricing</a>
            <a href="#schools">For Schools</a>
          </div>
          <div>
            <h4>Support</h4>
            <a href="#help">Help Center</a>
            <a href="#contact">Contact Us</a>
            <a href="#terms">Terms of Service</a>
          </div>
          <div>
            <h4>Connect</h4>
            <div className="portalSocial">
              <span>🌐</span>
              <span>✉️</span>
              <span>📷</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
