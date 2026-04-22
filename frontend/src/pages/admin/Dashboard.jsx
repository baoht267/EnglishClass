import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminSidebar from "../../components/AdminSidebar.jsx";
import { api } from "../../api/index.js";
import { useAuth } from "../../state/AuthContext.jsx";

export default function AdminDashboard() {
  const { token } = useAuth();
  const [summary, setSummary] = useState({
    totals: { questions: 0, tests: 0, activeUsers: 0, submissionsToday: 0 },
    deltas: { questionsPct: 0, testsDelta: 0, usersPct: 0, submissionsPct: 0 },
    avgScore: 0,
    chart: [],
    activities: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token) {
        if (alive) {
          setLoading(false);
        }
        return;
      }
      setError("");
      try {
        const data = await api.adminSummary(token);
        if (alive) setSummary(data);
      } catch (err) {
        if (!alive) return;
        try {
          const [qs, exams, users, results] = await Promise.all([
            api.listQuestions(token),
            api.listExams(token),
            api.listUsers(token),
            api.listAllResults(token)
          ]);
          const now = new Date();
          const thirtyDaysAgo = new Date(now);
          thirtyDaysAgo.setDate(now.getDate() - 30);
          const sixtyDaysAgo = new Date(now);
          sixtyDaysAgo.setDate(now.getDate() - 60);
          const today = new Date(now);
          today.setHours(0, 0, 0, 0);
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);

          const inRange = (date, from, to) =>
            date && new Date(date) >= from && (to ? new Date(date) < to : true);

          const questionsLast30 = qs.filter((q) => inRange(q.createdAt, thirtyDaysAgo)).length;
          const questionsPrev30 = qs.filter((q) =>
            inRange(q.createdAt, sixtyDaysAgo, thirtyDaysAgo)
          ).length;
          const testsLast30 = exams.filter((e) => inRange(e.createdAt, thirtyDaysAgo)).length;
          const testsPrev30 = exams.filter((e) =>
            inRange(e.createdAt, sixtyDaysAgo, thirtyDaysAgo)
          ).length;
          const usersLast30 = users.filter((u) => inRange(u.createdAt, thirtyDaysAgo)).length;
          const usersPrev30 = users.filter((u) =>
            inRange(u.createdAt, sixtyDaysAgo, thirtyDaysAgo)
          ).length;

          const submissionsToday = results.filter((r) => inRange(r.submittedAt, today)).length;
          const submissionsYesterday = results.filter((r) =>
            inRange(r.submittedAt, yesterday, today)
          ).length;

          const pctDelta = (current, prev) => {
            if (prev > 0) return Math.round(((current - prev) / prev) * 100);
            return current > 0 ? 100 : 0;
          };

          const avgScore =
            results.length > 0
              ? Math.round(
                  results.reduce((sum, r) => {
                    const pct = r.total ? (r.score / r.total) * 100 : 0;
                    return sum + pct;
                  }, 0) / results.length
                )
              : 0;
          const dayKey = (d) => {
            const date = new Date(d);
            date.setHours(0, 0, 0, 0);
            return date.toISOString().slice(0, 10);
          };
          const dailyMap = new Map();
          for (const r of results) {
            const key = dayKey(r.submittedAt);
            const pct = r.total ? (r.score / r.total) * 100 : 0;
            const cur = dailyMap.get(key) || { sum: 0, count: 0 };
            cur.sum += pct;
            cur.count += 1;
            dailyMap.set(key, cur);
          }
          const chart = [];
          for (let i = 6; i >= 0; i -= 1) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            const key = dayKey(d);
            const cur = dailyMap.get(key);
            const value = cur ? Math.round(cur.sum / cur.count) : 0;
            chart.push({ date: key, value });
          }

          const newestBy = (list, getDate) => {
            if (!list.length) return null;
            return list
              .slice()
              .sort((a, b) => {
                const aDate = getDate(a);
                const bDate = getDate(b);
                return (bDate?.getTime?.() || 0) - (aDate?.getTime?.() || 0);
              })[0];
          };

          const latestUser = newestBy(users, (u) =>
            u?.createdAt ? new Date(u.createdAt) : null
          );
          const latestQuestion = newestBy(qs, (q) =>
            q?.updatedAt ? new Date(q.updatedAt) : q?.createdAt ? new Date(q.createdAt) : null
          );
          const latestExam = newestBy(exams, (e) =>
            e?.createdAt ? new Date(e.createdAt) : null
          );
          const latestResult = newestBy(results, (r) =>
            r?.submittedAt ? new Date(r.submittedAt) : null
          );

          const fallbackActivities = [
            latestUser
              ? {
                  type: "user",
                  title: "New User Registration",
                  description: `${latestUser.name || latestUser.email || "New user"} signed up.`,
                  at: latestUser.createdAt
                }
              : null,
            latestQuestion
              ? {
                  type: "question",
                  title: "Question Updated",
                  description: `${stripHtml(latestQuestion.content || "Question").slice(0, 40)}...`,
                  at: latestQuestion.updatedAt || latestQuestion.createdAt
                }
              : null,
            latestExam
              ? {
                  type: "exam",
                  title: "Test Published",
                  description: `"${latestExam.title || "New exam"}" is now live.`,
                  at: latestExam.createdAt
                }
              : null,
            latestResult
              ? {
                  type: "submission",
                  title: "New Submission",
                  description: `${latestResult.examTitle || "Exam"} scored ${latestResult.score || 0}/${latestResult.total || 0}.`,
                  at: latestResult.submittedAt
                }
              : null
          ]
            .filter(Boolean)
            .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
            .slice(0, 4);
          setSummary({
            totals: {
              questions: qs.length,
              tests: exams.length,
              activeUsers: users.filter((u) => u.isActive !== false).length,
              submissionsToday
            },
            deltas: {
              questionsPct: pctDelta(questionsLast30, questionsPrev30),
              testsDelta: testsLast30 - testsPrev30,
              usersPct: pctDelta(usersLast30, usersPrev30),
              submissionsPct: pctDelta(submissionsToday, submissionsYesterday)
            },
            avgScore,
            chart,
            activities: fallbackActivities
          });
        } catch (innerErr) {
          setError(innerErr?.message || err?.message || "Load failed");
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  const { totals, deltas, avgScore, chart, activities } = summary;

  const formatPct = (value) => {
    const sign = value > 0 ? "↗" : value < 0 ? "↘" : "→";
    return `${sign} ${Math.abs(value)}%`;
  };

  const formatCount = (value) => {
    if (value > 0) return `+${value}`;
    if (value < 0) return `${value}`;
    return "0";
  };

  const stripHtml = (value) => (value || "").replace(/<[^>]+>/g, "");

  const buildLinePath = (values, width, height, padding = 24, maxValue = 100) => {
    if (!values.length) return "";
    const w = width - padding * 2;
    const h = height - padding * 2;
    const max = maxValue;
    const step = values.length > 1 ? w / (values.length - 1) : 0;
    return values
      .map((v, i) => {
        const safeValue = Math.max(0, Math.min(v, max));
        const x = padding + i * step;
        const y = max === 0 ? height - padding : padding + (1 - safeValue / max) * h;
        return `${i === 0 ? "M" : "L"}${x} ${y}`;
      })
      .join(" ");
  };

  const buildAreaPath = (linePath, width, height, padding = 24) => {
    if (!linePath) return "";
    return `${linePath} L${width - padding} ${height - padding} L${padding} ${height - padding} Z`;
  };

  const [activeIndex, setActiveIndex] = useState(null);
  const activityTone = (type) => {
    if (type === "user") return "blue";
    if (type === "question") return "amber";
    if (type === "submission") return "purple";
    return "green";
  };
  const activityIcon = (type) => {
    if (type === "user") return "group_add";
    if (type === "question") return "edit";
    if (type === "submission") return "assignment_turned_in";
    return "publish";
  };
  const activityList = Array.isArray(activities)
    ? activities
        .filter((item) => item && item.at)
        .slice()
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        .slice(0, 4)
    : [];

  return (
    <div className="adminPageWrap adminDashboardPage">
      <div className="adminShell">
        <AdminSidebar />

        <main className="adminProMain">
          <div className="adminProTopPanel">
            <div className="adminProTopbar">
              <div className="adminProBreadcrumbs">
                <Link to="/user">Home</Link>
                <span className="material-symbols-outlined">chevron_right</span>
                <strong>Dashboard</strong>
              </div>
              <div className="adminProSearch">
                <span className="material-symbols-outlined">search</span>
                <input placeholder="Search students, tests, or questions..." />
              </div>
              <button className="adminProBell" type="button">
                <span className="material-symbols-outlined">notifications</span>
              </button>
            </div>

            <div className="adminProHeader">
              <div>
                <h1>Dashboard Overview</h1>
                <p>Welcome back, here's what's happening today.</p>
                {error && <div className="callout error" style={{ marginTop: 10 }}>{error}</div>}
              </div>
              <button className="adminProPrimary" type="button">
                <span className="material-symbols-outlined">add</span>
                Create New Test
              </button>
            </div>
          </div>

          <div className="adminProStatGrid">
            <div className="adminProStatCard">
              <div>
                <span>Total Questions</span>
                <strong>{loading ? "…" : totals.questions}</strong>
                <div className="adminProDelta positive">
                  {loading ? "…" : formatPct(deltas.questionsPct)}
                </div>
              </div>
              <div className="adminProStatIcon blue">
                <span className="material-symbols-outlined">quiz</span>
              </div>
            </div>
            <div className="adminProStatCard">
              <div>
                <span>Total Tests</span>
                <strong>{loading ? "…" : totals.tests}</strong>
                <div className="adminProDelta positive">
                  {loading ? "…" : formatCount(deltas.testsDelta)}
                </div>
              </div>
              <div className="adminProStatIcon purple">
                <span className="material-symbols-outlined">fact_check</span>
              </div>
            </div>
            <div className="adminProStatCard">
              <div>
                <span>Active Users</span>
                <strong>{loading ? "…" : totals.activeUsers}</strong>
                <div className="adminProDelta positive">
                  {loading ? "…" : formatPct(deltas.usersPct)}
                </div>
              </div>
              <div className="adminProStatIcon amber">
                <span className="material-symbols-outlined">person</span>
              </div>
            </div>
            <div className="adminProStatCard">
              <div>
                <span>Submissions Today</span>
                <strong>{loading ? "…" : totals.submissionsToday}</strong>
                <div className="adminProDelta positive">
                  {loading ? "…" : formatPct(deltas.submissionsPct)}
                </div>
              </div>
              <div className="adminProStatIcon mint">
                <span className="material-symbols-outlined">upload</span>
              </div>
            </div>
          </div>

          <div className="adminProGrid">
            <section className="adminProCard adminProChart">
              <div className="adminProCardHead">
                <div>
                  <h3>User Performance Trends</h3>
                  <p>Average English Proficiency Scores (Last 7 Days)</p>
                </div>
                <button type="button">Last 7 Days</button>
              </div>
              <div className="adminProChartArea">
                <div className="chartYAxis chartYAxis--percent" aria-hidden="true">
                  {[100, 75, 50, 25, 0].map((tick) => (
                    <span key={tick}>{tick}</span>
                  ))}
                </div>
                {(() => {
                  const values = chart.length
                    ? chart.map((p) => p.value)
                    : Array.from({ length: 7 }, () => 0);
                  const labels = chart.length
                    ? chart.map((p) => {
                        const parts = p.date.split("-");
                        if (parts.length === 3) {
                          return `${parts[2]}/${parts[1]}`;
                        }
                        return "";
                      })
                    : Array.from({ length: 7 }, () => "");
                  const width = 600;
                  const height = 260;
                  const line = buildLinePath(values, width, height);
                  const area = buildAreaPath(line, width, height);
                  const safeIndex = Math.max(0, Math.min(values.length - 1, activeIndex ?? (values.length - 1)));
                  const pointX =
                    24 +
                    (values.length > 1
                      ? ((width - 48) / (values.length - 1)) * safeIndex
                      : 0);
                  const pointY = 24 + (1 - values[safeIndex] / 100) * (height - 48);

                  const onChartClick = (evt) => {
                    const rect = evt.currentTarget.getBoundingClientRect();
                    const x = evt.clientX - rect.left;
                    const relative = Math.max(0, Math.min(width - 48, x - 24));
                    const idx = values.length > 1 ? Math.round(relative / ((width - 48) / (values.length - 1))) : 0;
                    setActiveIndex(idx);
                  };

                  return (
                    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" onClick={onChartClick} style={{ cursor: "pointer" }}>
                      <defs>
                        <linearGradient id="lineFill" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d={area} fill="url(#lineFill)" />
                      <path d={line} fill="none" stroke="#2563eb" strokeWidth="3" />
                      <circle cx={pointX} cy={pointY} r="6" fill="#2563eb" />
                      <rect x={pointX - 60} y={pointY - 40} width="120" height="30" rx="8" fill="#0f172a" opacity="0.9" />
                      <text x={pointX - 50} y={pointY - 21} fill="#fff" fontSize="12">
                        {labels[safeIndex]} • {values[safeIndex]}%
                      </text>
                      {labels.map((label, i) => {
                        const x =
                          24 +
                          (labels.length > 1
                            ? ((width - 48) / (labels.length - 1)) * i
                            : 0);
                        return label ? (
                          <text key={`${label}-${i}`} x={x - 12} y={height - 6} fill="#64748b" fontSize="11">
                            {label}
                          </text>
                        ) : null;
                      })}
                    </svg>
                  );
                })()}
              </div>
            </section>

            <section className="adminProCard adminProActivity">
              <div className="adminProCardHead adminProCardHead--row">
                <h3>Recent Activity</h3>
                <button type="button" className="link">View All</button>
              </div>
              <div className="adminProActivityList">
                {activityList.length === 0 && (
                  <div className="adminProActivityItem">
                    <div>
                      <strong>No recent activity</strong>
                    </div>
                  </div>
                )}
                {activityList.map((item, idx) => (
                  <div className="adminProActivityItem" key={idx}>
                    <span
                      className={`adminProBubble ${activityTone(item.type)}`}
                    >
                      <span className="material-symbols-outlined">
                        {activityIcon(item.type)}
                      </span>
                    </span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.description}</p>
                      <small>{item.at ? new Date(item.at).toLocaleString() : ""}</small>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
