import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../api/index.js";
import { useAuth } from "../../state/AuthContext.jsx";
import AdminSidebar from "../../components/AdminSidebar.jsx";

export default function AdminUsers() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [results, setResults] = useState([]);
  const [exams, setExams] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [membershipFilter, setMembershipFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailUser, setDetailUser] = useState(null);
  const [detailResults, setDetailResults] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [trendMode, setTrendMode] = useState("monthly");
  const [showMessage, setShowMessage] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageError, setMessageError] = useState("");
  const [messageSending, setMessageSending] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("USER");
  const [addUserError, setAddUserError] = useState("");
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [addUserSuccess, setAddUserSuccess] = useState("");
  const [addUserSuccessDetail, setAddUserSuccessDetail] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [data, allResults, examList] = await Promise.all([
          api.listUsers(token),
          api.listAllResults(token),
          api.listExams(token)
        ]);
        if (alive) {
          setUsers(data);
          setResults(allResults);
          setExams(examList);
        }
      } catch (err) {
        if (alive) setError(err.message || "Load failed");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  const resultByUser = useMemo(() => {
    const map = new Map();
    results.forEach((r) => {
      const id = r.userId?._id || r.userId;
      if (!id) return;
      const list = map.get(id) || [];
      list.push(r);
      map.set(id, list);
    });
    return map;
  }, [results]);

  const examById = useMemo(() => {
    const map = new Map();
    exams.forEach((e) => {
      if (e && e._id) map.set(e._id, e);
    });
    return map;
  }, [exams]);

  const resolveExam = (result) => {
    if (!result) return null;
    if (result.examId && typeof result.examId === "object") return result.examId;
    if (result.examId && examById.has(result.examId)) return examById.get(result.examId);
    return null;
  };

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesTerm = term
        ? u.name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term)
        : true;
      const status = u.isActive === false ? "suspended" : "active";
      const matchesStatus = statusFilter === "all" ? true : status === statusFilter;
      const role = (u.role || "USER").toLowerCase();
      const matchesMembership =
        membershipFilter === "all" ? true : membershipFilter === role;
      return matchesTerm && matchesStatus && matchesMembership;
    });
  }, [users, search, statusFilter, membershipFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, membershipFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive !== false).length;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const newUsersThisMonth = users.filter((u) => {
    if (!u.createdAt) return false;
    const created = new Date(u.createdAt);
    return created >= startOfMonth && created < startOfNextMonth;
  }).length;
  const newUsersPrevMonth = users.filter((u) => {
    if (!u.createdAt) return false;
    const created = new Date(u.createdAt);
    return created >= startOfPrevMonth && created < startOfMonth;
  }).length;
  const totalPrevEnd = users.filter((u) => {
    if (!u.createdAt) return false;
    return new Date(u.createdAt) < startOfMonth;
  }).length;
  const totalGrowthPercent =
    totalPrevEnd === 0 ? 0 : ((totalUsers - totalPrevEnd) / totalPrevEnd) * 100;
  const newUsersChangePercent =
    newUsersPrevMonth === 0
      ? newUsersThisMonth > 0
        ? 100
        : 0
      : ((newUsersThisMonth - newUsersPrevMonth) / newUsersPrevMonth) * 100;
  const formatSignedPercent = (value) => {
    const sign = value > 0 ? "+" : value < 0 ? "" : "";
    return `${sign}${Math.round(value * 10) / 10}%`;
  };
  const formatTimeSpent = (result) => {
    const rawSeconds = Number(result?.timeSpent);
    if (Number.isFinite(rawSeconds) && rawSeconds > 0) {
      const mins = Math.floor(rawSeconds / 60);
      const secs = Math.floor(rawSeconds % 60);
      return `${mins}m ${secs.toString().padStart(2, "0")}s`;
    }
    return "--";
  };

  const exportCsv = () => {
    const rows = filteredUsers.map((u) => {
      const userResults = resultByUser.get(u._id) || [];
      const testsTaken = userResults.length;
      const avgScore =
        testsTaken === 0
          ? 0
          : Math.round(
              (userResults.reduce((sum, r) => {
                const total = r.total || 0;
                if (!total) return sum;
                return sum + (r.score / total) * 10;
              }, 0) /
                testsTaken) *
                10
            ) / 10;
      return {
        name: u.name || "",
        email: u.email || "",
        role: u.role || "USER",
        status: u.isActive === false ? "SUSPENDED" : "ACTIVE",
        joinedDate: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "",
        testsTaken,
        avgScore
      };
    });

    const headers = [
      "Name",
      "Email",
      "Role",
      "Status",
      "Joined Date",
      "Tests Taken",
      "Avg Score"
    ];

    const escapeCsv = (value) => {
      const str = String(value ?? "");
      const escaped = str.replace(/\"/g, '""');
      return `"${escaped}"`;
    };

    const csvLines = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) =>
        [
          row.name,
          row.email,
          row.role,
          row.status,
          row.joinedDate,
          row.testsTaken,
          row.avgScore
        ]
          .map(escapeCsv)
          .join(",")
      )
    ];

    const csvContent = `\ufeff${csvLines.join("\n")}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `users_${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const openAddUser = () => {
    setAddUserError("");
    setShowAddUser(true);
  };

  const closeAddUser = (keepToast = false) => {
    if (addUserLoading) return;
    setShowAddUser(false);
    setAddUserError("");
    if (!keepToast) {
      setAddUserSuccess("");
      setAddUserSuccessDetail("");
    }
    setNewUserName("");
    setNewUserEmail("");
    setNewUserRole("USER");
  };

  const createUser = async () => {
    setAddUserError("");
    const name = newUserName.trim();
    const email = newUserEmail.trim();
    if (!name || !email) {
      setAddUserError("Please fill in all required fields.");
      return;
    }

    const exists = users.some(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (exists) {
      setAddUserError("Email already exists.");
      return;
    }

    setAddUserLoading(true);
    try {
      const res = await api.createUser(token, {
        name,
        email,
        role: newUserRole
      });
      if (res?.user) {
        setUsers((prev) => [res.user, ...prev]);
        setAddUserSuccess("User account created successfully!");
        setAddUserSuccessDetail("A welcome email has been sent to the user.");
      }
      closeAddUser(true);
    } catch (err) {
      setAddUserError(err.message || "Unable to create user.");
    } finally {
      setAddUserLoading(false);
    }
  };

  useEffect(() => {
    if (!addUserSuccess) return;
    const t = setTimeout(() => {
      setAddUserSuccess("");
      setAddUserSuccessDetail("");
    }, 3500);
    return () => clearTimeout(t);
  }, [addUserSuccess]);

  const exportProfileReport = () => {
    if (!detailUser) return;
    const rows = detailResults.map((r) => ({
      exam: r.examId?.title || "Exam",
      submittedAt: r.submittedAt ? new Date(r.submittedAt).toLocaleString() : "",
      score: r.score ?? 0,
      total: r.total ?? 0,
      band:
        r.total && r.total > 0 ? Math.round(((r.score / r.total) * 10) * 10) / 10 : 0
    }));
    const headers = ["Exam", "Submitted At", "Score", "Total", "Band"];
    const escapeCsv = (value) => {
      const str = String(value ?? "");
      const escaped = str.replace(/\"/g, '""');
      return `"${escaped}"`;
    };
    const csvLines = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) =>
        [row.exam, row.submittedAt, row.score, row.total, row.band]
          .map(escapeCsv)
          .join(",")
      )
    ];
    const csvContent = `\ufeff${csvLines.join("\n")}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `user_report_${detailUser._id}_${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const getBand = (score, total) => {
    if (!total) return 0;
    return Math.round(((score / total) * 10) * 10) / 10;
  };

  const calcPercentChange = (current, previous) => {
    if (!previous) return current ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const getRankLabel = (band) => {
    if (band >= 8.5) return "C1 Advanced";
    if (band >= 7.0) return "B2 Upper Intermediate";
    if (band >= 5.5) return "B1 Intermediate";
    return "A2 Elementary";
  };

  const lastActiveText = useMemo(() => {
    if (!detailResults.length) return "--";
    const latest = detailResults.reduce((max, r) => {
      const t = r.submittedAt ? new Date(r.submittedAt).getTime() : 0;
      return t > max ? t : max;
    }, 0);
    if (!latest) return "--";
    const diffMs = Date.now() - latest;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }, [detailResults]);

  const scoreTrend = useMemo(() => {
    const results = detailResults
      .map((r) => {
        const rawDate = r.submittedAt || r.createdAt;
        if (!rawDate) return null;
        const date = new Date(rawDate);
        if (Number.isNaN(date.getTime())) return null;
        return { date, value: getBand(r.score, r.total) };
      })
      .filter(Boolean);

    const dayKey = (date) => {
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return d.toISOString().slice(0, 10);
    };

    const monthKey = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      return `${year}-${month}`;
    };

    const pushToMap = (map, key, value) => {
      const current = map.get(key) || { sum: 0, count: 0 };
      current.sum += value;
      current.count += 1;
      map.set(key, current);
    };

    const dailyMap = new Map();
    const monthlyMap = new Map();
    results.forEach(({ date, value }) => {
      pushToMap(dailyMap, dayKey(date), value);
      pushToMap(monthlyMap, monthKey(date), value);
    });

    if (trendMode === "weekly") {
      const today = new Date();
      const series = [];
      for (let i = 5; i >= 0; i -= 1) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const key = dayKey(d);
        const data = dailyMap.get(key);
        const value = data ? Math.round((data.sum / data.count) * 10) / 10 : 0;
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        series.push({ label, value });
      }
      return series;
    }

    const now = new Date();
    const series = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKey(d);
      const data = monthlyMap.get(key);
      const value = data ? Math.round((data.sum / data.count) * 10) / 10 : 0;
      const label = d
        .toLocaleDateString("en-US", { month: "short", year: "2-digit" })
        .toUpperCase();
      series.push({ label, value });
    }
    return series;
  }, [detailResults, trendMode]);

  const profileTotalTests = detailResults.length;
  const profileAvgBand =
    profileTotalTests === 0
      ? 0
      : Math.round(
          (detailResults.reduce((sum, r) => sum + getBand(r.score, r.total), 0) /
            profileTotalTests) *
            10
        ) / 10;
  const profileStudyMinutes = detailResults.reduce((sum, r) => {
    const seconds = Number(r.timeSpent);
    if (Number.isFinite(seconds) && seconds > 0) return sum + seconds / 60;
    return sum;
  }, 0);
  const profileStudyHours = Math.round(profileStudyMinutes / 60);

  const periodStats = useMemo(() => {
    const now = new Date();
    let currentStart;
    let currentEnd;
    let prevStart;
    let prevEnd;

    if (trendMode === "weekly") {
      const getWeekStart = (date) => {
        const d = new Date(date);
        const day = (d.getDay() + 6) % 7;
        d.setDate(d.getDate() - day);
        d.setHours(0, 0, 0, 0);
        return d;
      };
      currentStart = getWeekStart(now);
      currentEnd = new Date(currentStart);
      currentEnd.setDate(currentEnd.getDate() + 7);
      prevStart = new Date(currentStart);
      prevStart.setDate(prevStart.getDate() - 7);
      prevEnd = currentStart;
    } else {
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEnd = currentStart;
    }

    const inRange = (r, start, end) => {
      const t = r.submittedAt ? new Date(r.submittedAt) : null;
      return t && t >= start && t < end;
    };

    const currentResults = detailResults.filter((r) => inRange(r, currentStart, currentEnd));
    const prevResults = detailResults.filter((r) => inRange(r, prevStart, prevEnd));

    const avgFor = (list) =>
      list.length === 0
        ? 0
        : list.reduce((sum, r) => sum + getBand(r.score, r.total), 0) / list.length;

    const currentTests = currentResults.length;
    const prevTests = prevResults.length;
    const currentAvg = avgFor(currentResults);
    const prevAvg = avgFor(prevResults);
    const currentMinutes = currentResults.reduce((sum, r) => {
      const seconds = Number(r.timeSpent);
      if (Number.isFinite(seconds) && seconds > 0) return sum + seconds / 60;
      return sum;
    }, 0);
    const prevMinutes = prevResults.reduce((sum, r) => {
      const seconds = Number(r.timeSpent);
      if (Number.isFinite(seconds) && seconds > 0) return sum + seconds / 60;
      return sum;
    }, 0);

    return {
      currentTests,
      prevTests,
      currentAvg,
      prevAvg,
      currentMinutes,
      prevMinutes
    };
  }, [detailResults, trendMode, getBand]);

  const historyFiltered = useMemo(() => {
    const term = historySearch.trim().toLowerCase();
    if (!term) return detailResults;
    return detailResults.filter((r) => {
      const exam = resolveExam(r);
      const title = (exam?.title || r.examTitle || "").toLowerCase();
      return title.includes(term);
    });
  }, [detailResults, historySearch, examById]);

  const chartPoints = useMemo(() => {
    if (!scoreTrend.length) return "";
    const width = 520;
    const height = 120;
    const pad = 12;
    return scoreTrend
      .map((point, index) => {
        const x =
          scoreTrend.length === 1
            ? width / 2
            : pad + (index / (scoreTrend.length - 1)) * (width - pad * 2);
        const y = pad + (1 - Math.min(point.value, 10) / 10) * (height - pad * 2);
        return `${x},${y}`;
      })
      .join(" ");
  }, [scoreTrend]);
  const chartAverage = useMemo(() => {
    if (!scoreTrend.length) return 0;
    const values = scoreTrend.map((p) => Number(p.value)).filter((v) => Number.isFinite(v));
    if (!values.length) return 0;
    const nonZero = values.filter((v) => v > 0);
    const base = nonZero.length ? nonZero : values;
    const sum = base.reduce((acc, v) => acc + v, 0);
    return Math.round((sum / base.length) * 10) / 10;
  }, [scoreTrend]);
  const avgBandSafe = Number.isFinite(chartAverage) ? chartAverage : 0;
  const chartAvgY = 12 + (1 - Math.min(avgBandSafe, 10) / 10) * (120 - 24);

  const testsChangePct = calcPercentChange(
    periodStats.currentTests,
    periodStats.prevTests
  );
  const avgChangePct = calcPercentChange(periodStats.currentAvg, periodStats.prevAvg);
  const studyChangePct = calcPercentChange(
    periodStats.currentMinutes,
    periodStats.prevMinutes
  );

  const toggleStatus = async (user) => {
    const next = user.isActive === false;
    const prev = user.isActive !== false;
    setUsers((list) =>
      list.map((u) => (u._id === user._id ? { ...u, isActive: next } : u))
    );
    try {
      await api.updateUserStatus(token, user._id, next);
    } catch (err) {
      setUsers((list) =>
        list.map((u) => (u._id === user._id ? { ...u, isActive: prev } : u))
      );
      setError(err.message || "Update failed");
    }
  };

  const openDetail = async (user) => {
    setDetailUser(user);
    setDetailLoading(true);
    setHistorySearch("");
    try {
      const filtered = (resultByUser.get(user._id) || []);
      setDetailResults(filtered);
      setShowProfile(true);
    } catch (err) {
      setError(err.message || "Load detail failed");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailUser(null);
    setDetailResults([]);
    setDetailLoading(false);
    setShowProfile(false);
    setShowMessage(false);
  };

  const openMessage = () => {
    setMessageText("");
    setMessageError("");
    setShowMessage(true);
  };

  const closeMessage = () => {
    setShowMessage(false);
    setMessageError("");
  };

  const sendMessage = async () => {
    if (!detailUser) return;
    const content = messageText.trim();
    if (!content) {
      setMessageError("Please enter a message.");
      return;
    }
    setMessageSending(true);
    setMessageError("");
    try {
      await api.sendMessage(token, detailUser._id, content);
      setShowMessage(false);
      setMessageText("");
    } catch (err) {
      setMessageError(err.message || "Send failed");
    } finally {
      setMessageSending(false);
    }
  };

  return (
    <div className="adminPageWrap adminUserProWrap">
      <div className="adminShell">
        <AdminSidebar />
        <main className="adminUserProMain">
          {showProfile && detailUser ? (
            <div className="adminUserProfile">
              <div className="adminUserProfileTopbar">
                <div className="adminUserProfileBreadcrumbs">
                  <button type="button" className="adminUserProfileBack" onClick={closeDetail}>
                    <span className="material-symbols-outlined">arrow_back</span>
                    Back
                  </button>
                  <button type="button" onClick={closeDetail}>
                    User Management
                  </button>
                  <span>/</span>
                  <strong>Student Profile</strong>
                </div>
                <div className="adminUserProfileTopActions">
                  <button type="button" className="adminUserProIconBtn">
                    <span className="material-symbols-outlined">notifications</span>
                  </button>
                  <button type="button" className="adminUserProPrimary" onClick={exportProfileReport}>
                    <span className="material-symbols-outlined">download</span>
                    Export Report
                  </button>
                </div>
              </div>

              <div className="adminUserProfileHero">
                <div className="adminUserProfileAvatar">
                  <span>{detailUser.name?.charAt(0)?.toUpperCase() || "U"}</span>
                  <span className={`status-dot ${detailUser.isActive === false ? "is-off" : ""}`} />
                </div>
                <div className="adminUserProfileInfo">
                  <div className="adminUserProfileName">
                    {detailUser.name || "User"}
                    <span className="adminUserProfileBadge">
                      {detailUser.role === "ADMIN" ? "ADMIN" : "PREMIUM MEMBER"}
                    </span>
                  </div>
                  <div className="adminUserProfileMeta">
                    ID: {detailUser.userId || detailUser._id?.slice(-6)} · {detailUser.email} ·{" "}
                    Joined{" "}
                    {detailUser.createdAt
                      ? new Date(detailUser.createdAt).toLocaleDateString()
                      : "--"}
                  </div>
                <div className="adminUserProfileTags">
                  <span>
                    <span className="material-symbols-outlined">emoji_events</span>
                    Rank: {profileTotalTests ? getRankLabel(profileAvgBand) : "N/A"}
                  </span>
                  <span>
                    <span className="material-symbols-outlined">calendar_month</span>
                    Last Active: {lastActiveText}
                  </span>
                </div>
                </div>
                <div className="adminUserProfileActions">
                  <button type="button" className="primary" onClick={openMessage}>
                    <span className="material-symbols-outlined">mail</span>
                    Message
                  </button>
                </div>
              </div>

              <div className="adminUserProfileGrid">
                <div className="adminUserProfileStatsCard">
                  <div className="title">Performance Stats</div>
                  <div className="statItem">
                    <div>Total Tests</div>
                    <div className="value">{profileTotalTests}</div>
                    <span className={`chip ${testsChangePct < 0 ? "danger" : "positive"}`}>
                      {formatSignedPercent(testsChangePct)}
                    </span>
                  </div>
                  <div className="statItem">
                    <div>Average Score</div>
                    <div className="value">
                      {profileAvgBand.toFixed(1)} <span>/10</span>
                    </div>
                    <span className={`chip ${avgChangePct < 0 ? "danger" : "positive"}`}>
                      {formatSignedPercent(avgChangePct)}
                    </span>
                  </div>
                  <div className="statItem">
                    <div>Study Time</div>
                    <div className="value">{profileStudyHours}h</div>
                    <span className={`chip ${studyChangePct < 0 ? "danger" : "positive"}`}>
                      {formatSignedPercent(studyChangePct)}
                    </span>
                  </div>
                </div>

                <div className="adminUserProfileChartCard">
                  <div className="chartHeader">
                    <div>
                      <h3>Score Progression</h3>
                      <p>
                        Student performance trend over the latest{" "}
                        {trendMode === "weekly" ? "6 days" : "6 months"}
                      </p>
                    </div>
                    <div className="chartTabs">
                      <button
                        type="button"
                        className={trendMode === "weekly" ? "active" : ""}
                        onClick={() => setTrendMode("weekly")}
                      >
                        Weekly
                      </button>
                      <button
                        type="button"
                        className={trendMode === "monthly" ? "active" : ""}
                        onClick={() => setTrendMode("monthly")}
                      >
                        Monthly
                      </button>
                    </div>
                  </div>
                  <div className="chartCanvas">
                    <div className="chartYAxis" aria-hidden="true">
                      {[10, 8, 6, 4, 2, 0].map((tick) => (
                        <span key={tick}>{tick}</span>
                      ))}
                    </div>
                    <svg viewBox="0 0 520 120" preserveAspectRatio="none">
                      <line
                        className="chartAvgLine"
                        x1="12"
                        x2="508"
                        y1={chartAvgY}
                        y2={chartAvgY}
                      />
                      <text className="chartAvgLabel" x="500" y={Math.max(16, chartAvgY - 6)}>
                        AVG {avgBandSafe.toFixed(1)}
                      </text>
                      <polyline points={chartPoints} />
                      {scoreTrend.map((point, index) => {
                        const x =
                          scoreTrend.length === 1
                            ? 260
                            : 12 + (index / (scoreTrend.length - 1)) * (520 - 24);
                        const y = 12 + (1 - Math.min(point.value, 10) / 10) * (120 - 24);
                        return <circle key={point.label} cx={x} cy={y} r="3.5" />;
                      })}
                    </svg>
                  </div>
                  <div className="chartLabels">
                    {scoreTrend.map((p) => (
                      <span key={p.label}>{p.label}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="adminUserProfileHistoryCard">
                <div className="historyHeader">
                  <h3>Detailed Test History</h3>
                  <div className="historySearch">
                    <span className="material-symbols-outlined">search</span>
                    <input
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Search test name..."
                    />
                  </div>
                </div>

                {detailLoading && <div className="muted">Loading...</div>}
                {!detailLoading && historyFiltered.length === 0 && (
                  <div className="muted" style={{ padding: 16 }}>
                    No test history yet.
                  </div>
                )}
                <div className="historyTable">
                  <div className="historyHead">
                    <div>TEST NAME</div>
                    <div>DATE TAKEN</div>
                    <div>CATEGORY</div>
                    <div>SCORE</div>
                    <div>TIME SPENT</div>
                    <div>STATUS</div>
                  </div>
                  {historyFiltered.map((r) => (
                    <div key={r._id} className="historyRow">
                      {(() => {
                        const exam = resolveExam(r);
                        const examTitle = exam?.title || r.examTitle || "Exam";
                        const examCode =
                          exam?.examId ||
                          r.examCode ||
                          exam?._id?.slice(-6) ||
                          r.examId?._id?.slice(-6) ||
                          "N/A";
                        const categoryName =
                          exam?.categoryId?.name ||
                          exam?.category?.name ||
                          r.examCategoryName ||
                          "General";
                        const passMark =
                          exam?.passMark ??
                          r.examPassMark ??
                          r.examId?.passMark ??
                          null;
                        const isPassed =
                          passMark != null && r.total
                            ? (r.score / r.total) * 100 >= passMark
                            : true;
                        return (
                          <>
                            <div className="historyName">
                              <strong>{examTitle}</strong>
                              <span className="historyMeta">ID: {examCode}</span>
                            </div>
                            <div>
                              {r.submittedAt
                                ? new Date(r.submittedAt).toLocaleDateString()
                                : "--"}
                            </div>
                            <div>
                              <span className="historyPill">{categoryName}</span>
                            </div>
                            <div className="historyScore">
                              <strong>{getBand(r.score, r.total).toFixed(1)}/10</strong>
                              <div className="historyBar">
                                <span
                                  style={{
                                    width: `${r.total ? Math.min(100, (r.score / r.total) * 100) : 0}%`
                                  }}
                                />
                              </div>
                            </div>
                            <div className="historyTime">{formatTimeSpent(r)}</div>
                            <div>
                              <span className={`historyStatus ${isPassed ? "is-pass" : "is-fail"}`}>
                                {passMark != null && r.total ? (isPassed ? "Passed" : "Failed") : "Completed"}
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="adminUserProHeader">
                <div>
                  <h1>User Management</h1>
                  <p>Monitor student activity and platform performance metrics.</p>
                </div>
                <div className="adminUserProHeaderActions">
                  <button type="button" className="adminUserProGhost" onClick={exportCsv}>
                    <span className="material-symbols-outlined">download</span>
                    Export CSV
                  </button>
                  <button type="button" className="adminUserProPrimary" onClick={openAddUser}>
                    <span className="material-symbols-outlined">person_add</span>
                    Add New User
                  </button>
                </div>
              </div>

              <div className="adminUserProStatGrid">
                <div className="adminUserProStatCard">
                  <div className="adminUserProStatIcon">
                    <span className="material-symbols-outlined">groups</span>
                  </div>
                  <div className="adminUserProStatBody">
                    <div className="adminUserProStatTitle">Total Users</div>
                    <div className="adminUserProStatValue">{loading ? "…" : totalUsers}</div>
                    <div className="adminUserProStatSub">Lifetime registered students</div>
                  </div>
                  <span className="adminUserProStatBadge positive">
                    {formatSignedPercent(totalGrowthPercent)}
                  </span>
                </div>
                <div className="adminUserProStatCard">
                  <div className="adminUserProStatIcon purple">
                    <span className="material-symbols-outlined">person_add</span>
                  </div>
                  <div className="adminUserProStatBody">
                    <div className="adminUserProStatTitle">New Users</div>
                    <div className="adminUserProStatValue">{loading ? "…" : newUsersThisMonth}</div>
                    <div className="adminUserProStatSub">
                      {formatSignedPercent(newUsersChangePercent)}{" "}
                      {newUsersChangePercent < 0 ? "decrease" : "increase"} from last month
                    </div>
                  </div>
                  <span className="adminUserProStatBadge green">This Month</span>
                </div>
                <div className="adminUserProStatCard">
                  <div className="adminUserProStatIcon orange">
                    <span className="material-symbols-outlined">bolt</span>
                  </div>
                  <div className="adminUserProStatBody">
                    <div className="adminUserProStatTitle">Active Users</div>
                    <div className="adminUserProStatValue">{loading ? "…" : activeUsers}</div>
                    <div className="adminUserProStatSub">Currently engaged in practice</div>
                  </div>
                  <span className="adminUserProStatBadge orange">Live now</span>
                </div>
              </div>

              <div className="adminUserProTableCard">
                <div className="adminUserProFilters">
                  <div className="adminUserProSearch">
                    <span className="material-symbols-outlined">search</span>
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name, email or ID..."
                    />
                  </div>
                  <div className="adminUserProFilterGroup">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                    <select
                      value={membershipFilter}
                      onChange={(e) => setMembershipFilter(e.target.value)}
                    >
                      <option value="all">Membership</option>
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button type="button" className="adminUserProFilterBtn">
                      <span className="material-symbols-outlined">tune</span>
                    </button>
                  </div>
                </div>

                {loading && <div className="muted">Loading...</div>}
                {error && <div className="callout error">{error}</div>}

                <div className="adminUserProTable">
                  <div className="adminUserProTableHead">
                    <div>USER DETAILS</div>
                    <div>JOINED DATE</div>
                    <div>TESTS TAKEN</div>
                    <div>AVG. SCORE</div>
                    <div>STATUS</div>
                    <div>ACTIONS</div>
                  </div>
                  {pageItems.map((u) => {
                    const userResults = resultByUser.get(u._id) || [];
                    const testsTaken = userResults.length;
                    const avgScore =
                      testsTaken === 0
                        ? 0
                        : Math.round(
                            (userResults.reduce((sum, r) => {
                              const total = r.total || 0;
                              if (!total) return sum;
                              return sum + (r.score / total) * 10;
                            }, 0) /
                              testsTaken) *
                              10
                          ) / 10;
                    const isActive = u.isActive !== false;
                    return (
                      <div className="adminUserProTableRow" key={u._id}>
                        <div className="adminUserProUser">
                          <div className="adminUserProAvatar">
                            {u.name?.charAt(0)?.toUpperCase() || "U"}
                          </div>
                          <div>
                            <div className="adminUserProName">{u.name}</div>
                            <div className="adminUserProEmail">{u.email}</div>
                          </div>
                        </div>
                        <div className="adminUserProJoined">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "--"}
                        </div>
                        <div className="adminUserProMetric">{testsTaken}</div>
                        <div className="adminUserProMetric">
                          {avgScore.toFixed(1)} <span>Band</span>
                        </div>
                        <div>
                          <span className={`adminUserProStatus ${isActive ? "active" : "suspended"}`}>
                            <span className="dot" />
                            {isActive ? "Active" : "Suspended"}
                          </span>
                        </div>
                        <div className="adminUserProActions">
                          <button type="button" onClick={() => openDetail(u)}>
                            <span className="material-symbols-outlined">visibility</span>
                          </button>
                          <button type="button" onClick={() => openDetail(u)}>
                            <span className="material-symbols-outlined">edit</span>
                          </button>
                          {isActive ? (
                            <button type="button" onClick={() => toggleStatus(u)}>
                              <span className="material-symbols-outlined">block</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="adminUserProUnsuspend"
                              onClick={() => toggleStatus(u)}
                            >
                              Unsuspend
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {!loading && pageItems.length === 0 && (
                    <div className="muted" style={{ padding: 16 }}>
                      No users found.
                    </div>
                  )}
                </div>

                <div className="adminUserProTableFooter">
                  <span>
                    Showing {filteredUsers.length === 0 ? 0 : (page - 1) * pageSize + 1} to{" "}
                    {Math.min(page * pageSize, filteredUsers.length)} of {filteredUsers.length} users
                  </span>
                  <div className="adminUserProPagination">
                    <button
                      type="button"
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <span className="is-active">{page}</span>
                    <button
                      type="button"
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {addUserSuccess && (
        <div className="adminToast">
          <div className="adminToastIcon">
            <span className="material-symbols-outlined">check_circle</span>
          </div>
          <div className="adminToastBody">
            <strong>{addUserSuccess}</strong>
            <span>{addUserSuccessDetail}</span>
          </div>
          <button
            type="button"
            className="adminToastClose"
            onClick={() => {
              setAddUserSuccess("");
              setAddUserSuccessDetail("");
            }}
          >
            ✕
          </button>
        </div>
      )}

      {showAddUser && (
        <div className="adminModalOverlay">
          <div className="adminModal adminModal--question">
            <div className="adminModalHeader">
              <div>
                <div className="adminModalTitle">Add New User</div>
                <div className="adminModalSubtitle">
                  Create a new account for a student or administrator.
                </div>
              </div>
              <button className="iconBtn" onClick={closeAddUser}>
                ✕
              </button>
            </div>
              <div className="adminModalBody">
                <div className="adminModalField">
                  <label>Full Name</label>
                  <input
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div className="adminModalField">
                  <label>Email Address</label>
                  <input
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="john.doe@example.com"
                  />
                </div>
                <div className="adminModalField">
                  <label>User Role</label>
                  <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}>
                    <option value="USER">User (Student)</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div className="muted">
                  A random 6-character password will be generated and sent by email.
                </div>
              {addUserError && <div className="callout error">{addUserError}</div>}
            </div>
            <div className="adminModalActions">
              <button type="button" className="adminUserProGhost" onClick={closeAddUser}>
                Cancel
              </button>
              <button
                type="button"
                className="adminUserProPrimary"
                onClick={createUser}
                disabled={addUserLoading}
              >
                {addUserLoading ? "Creating..." : "Create Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMessage && detailUser && (
        <div className="adminModalOverlay">
          <div className="adminModal adminMessageModal">
            <div className="adminModalHeader">
              <div>
                <div className="adminModalTitle">Send Message</div>
                <div className="adminModalSubtitle">
                  To: {detailUser.name} ({detailUser.email})
                </div>
              </div>
              <button className="iconBtn" onClick={closeMessage}>
                ✕
              </button>
            </div>
            <div className="adminModalBody">
              <textarea
                className="adminMessageTextarea"
                placeholder="Type your message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
              />
              {messageError && <div className="callout error">{messageError}</div>}
            </div>
            <div className="adminModalFooter adminMessageFooter">
              <button type="button" className="adminUserProGhost" onClick={closeMessage}>
                Cancel
              </button>
              <button
                type="button"
                className="adminUserProPrimary"
                disabled={messageSending}
                onClick={sendMessage}
              >
                {messageSending ? "Sending..." : "Send Message"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
