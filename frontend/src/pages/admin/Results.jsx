import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api/index.js";
import { useAuth } from "../../state/AuthContext.jsx";
import AdminSidebar from "../../components/AdminSidebar.jsx";

const RANGE_OPTIONS = [
  { key: "30d", label: "Last 30 Days", days: 30 },
  { key: "90d", label: "Quarterly", days: 90 },
  { key: "365d", label: "Yearly", days: 365 }
];

const dayMs = 24 * 60 * 60 * 1000;

const parseDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const getPct = (r) => (r?.total ? (r.score / r.total) * 100 : 0);
const getPassMark = (r) => (Number.isFinite(r?.examId?.passMark) ? r.examId.passMark : 50);

const inRange = (date, start, end) => date && date >= start && date <= end;

const buildStats = (list) => {
  const total = list.length;
  let sumPct = 0;
  let passed = 0;
  list.forEach((r) => {
    const pct = getPct(r);
    sumPct += pct;
    if (pct >= getPassMark(r)) passed += 1;
  });
  const avgPct = total ? sumPct / total : 0;
  const passRate = total ? (passed / total) * 100 : 0;
  return { total, avgPct, passRate };
};

const calcDeltaPct = (current, prev) => {
  if (prev > 0) return ((current - prev) / prev) * 100;
  return current > 0 ? 100 : 0;
};

const calcDeltaAbs = (current, prev) => current - prev;

const formatDelta = (value, suffix = "%") => {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const fixed = abs >= 10 ? abs.toFixed(0) : abs.toFixed(1);
  return `${sign}${fixed}${suffix}`;
};

export default function AdminResults() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rangeKey, setRangeKey] = useState("30d");
  const [customOpen, setCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [activeIndex, setActiveIndex] = useState(null);
  const chartRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await api.listAllResults(token);
        if (alive) setItems(data);
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

  const rangeWindow = useMemo(() => {
    const now = new Date();
    let start;
    let end = now;

    if (rangeKey === "custom" && customStart && customEnd) {
      start = new Date(customStart);
      end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
    } else {
      const opt = RANGE_OPTIONS.find((r) => r.key === rangeKey) || RANGE_OPTIONS[0];
      start = new Date(now);
      start.setDate(now.getDate() - opt.days + 1);
      start.setHours(0, 0, 0, 0);
    }
    return { start, end };
  }, [rangeKey, customStart, customEnd]);

  const filtered = useMemo(() => {
    return items.filter((r) => {
      const d = parseDate(r.submittedAt);
      return inRange(d, rangeWindow.start, rangeWindow.end);
    });
  }, [items, rangeWindow]);

  const prevWindow = useMemo(() => {
    const days = Math.max(
      1,
      Math.round((rangeWindow.end.getTime() - rangeWindow.start.getTime()) / dayMs) + 1
    );
    const prevEnd = new Date(rangeWindow.start);
    const prevStart = new Date(rangeWindow.start);
    prevStart.setDate(prevStart.getDate() - days);
    return { start: prevStart, end: prevEnd };
  }, [rangeWindow]);

  const prevItems = useMemo(() => {
    return items.filter((r) => {
      const d = parseDate(r.submittedAt);
      if (!d) return false;
      return d >= prevWindow.start && d < prevWindow.end;
    });
  }, [items, prevWindow]);

  const stats = useMemo(() => buildStats(filtered), [filtered]);
  const prevStats = useMemo(() => buildStats(prevItems), [prevItems]);

  const passRateDelta = calcDeltaPct(stats.passRate, prevStats.passRate);
  const avgBand = stats.avgPct / 10;
  const prevAvgBand = prevStats.avgPct / 10;
  const avgBandDelta = calcDeltaAbs(avgBand, prevAvgBand);
  const completedDelta = calcDeltaPct(stats.total, prevStats.total);

  const completed24h = useMemo(() => {
    const since = Date.now() - dayMs;
    return items.filter((r) => {
      const d = parseDate(r.submittedAt);
      return d && d.getTime() >= since;
    }).length;
  }, [items]);

  const trend = useMemo(() => {
    const diffDays =
      Math.round((rangeWindow.end.getTime() - rangeWindow.start.getTime()) / dayMs) + 1;
    const useDaily = rangeKey === "30d" || (rangeKey === "custom" && diffDays <= 45);

    if (useDaily) {
      const dayMap = new Map();
      filtered.forEach((r) => {
        const d = parseDate(r.submittedAt);
        if (!d) return;
        const key = d.toISOString().slice(0, 10);
        const cur = dayMap.get(key) || { sum: 0, count: 0 };
        cur.sum += getPct(r);
        cur.count += 1;
        dayMap.set(key, cur);
      });
      const series = [];
      for (let i = 0; i < diffDays; i += 1) {
        const d = new Date(rangeWindow.start);
        d.setDate(d.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        const cur = dayMap.get(key) || { sum: 0, count: 0 };
        const avg = cur.count ? cur.sum / cur.count : 0;
        const labelFull = d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit"
        });
        series.push({
          label: labelFull,
          fullLabel: labelFull,
          volume: cur.count,
          avg
        });
      }
      return series;
    }

    const monthsBack = rangeKey === "365d" ? 12 : 6;
    const now = new Date();
    const bucketMap = new Map();
    filtered.forEach((r) => {
      const d = parseDate(r.submittedAt);
      if (!d) return;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const cur = bucketMap.get(key) || { sum: 0, count: 0 };
      cur.sum += getPct(r);
      cur.count += 1;
      bucketMap.set(key, cur);
    });

    const series = [];
    for (let i = monthsBack - 1; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const cur = bucketMap.get(key) || { sum: 0, count: 0 };
      const avg = cur.count ? cur.sum / cur.count : 0;
      series.push({
        label: d.toLocaleString("en-US", { month: "short" }),
        fullLabel: d.toLocaleString("en-US", { month: "short" }),
        volume: cur.count,
        avg
      });
    }
    return series;
  }, [filtered, rangeKey, rangeWindow]);

  const chart = useMemo(() => {
    const width = 900;
    const height = 260;
    const pad = 26;
    const innerW = width - pad * 2;
    const innerH = height - pad * 2;
    const maxVolume = Math.max(1, ...trend.map((t) => t.volume));
    const denom = trend.length > 1 ? trend.length - 1 : 1;

    const toX = (i) => pad + (innerW * i) / denom;
    const toYVol = (v) => pad + innerH - (v / maxVolume) * innerH;
    const toYAvg = (v) => pad + innerH - (v / 100) * innerH;

    const volPoints = trend.map((t, i) => `${toX(i)},${toYVol(t.volume)}`).join(" ");
    const avgPoints = trend.map((t, i) => `${toX(i)},${toYAvg(t.avg)}`).join(" ");
    const areaPoints = `${volPoints} ${pad + innerW},${pad + innerH} ${pad},${
      pad + innerH
    }`;

    return {
      width,
      height,
      pad,
      innerW,
      innerH,
      volPoints,
      avgPoints,
      areaPoints,
      toX,
      toYVol,
      toYAvg
    };
  }, [trend]);

  const activeDots = Math.min(5, Math.max(0, Math.round(avgBand / 2)));

  const chartLabels = useMemo(() => {
    if (trend.length === 0) return [];
    if (rangeKey === "30d" || (rangeKey === "custom" && trend.length > 12)) {
      const labelCount = Math.min(7, trend.length);
      const labels = [];
      for (let i = 0; i < labelCount; i += 1) {
        const idx =
          labelCount === 1
            ? 0
            : Math.round((i * (trend.length - 1)) / (labelCount - 1));
        const item = trend[idx];
        labels.push(item.fullLabel || item.label);
      }
      return labels;
    }
    return trend.map((t) => t.label);
  }, [trend, rangeKey]);

  const activePoint = useMemo(() => {
    if (activeIndex == null || !trend[activeIndex]) return null;
    const t = trend[activeIndex];
    return {
      x: chart.toX(activeIndex),
      yVol: chart.toYVol(t.volume),
      yAvg: chart.toYAvg(t.avg),
      label: t.fullLabel || t.label,
      volume: t.volume,
      avg: t.avg
    };
  }, [activeIndex, trend, chart]);

  const onChartClick = (event) => {
    if (!chartRef.current || trend.length === 0) return;
    const rect = chartRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const ratio = (x - chart.pad) / chart.innerW;
    const raw = Math.round(ratio * (trend.length - 1));
    const idx = Math.min(trend.length - 1, Math.max(0, raw));
    setActiveIndex(idx);
  };

  const rangeLabel = useMemo(() => {
    if (rangeKey === "custom") return "selected range";
    const opt = RANGE_OPTIONS.find((r) => r.key === rangeKey);
    return opt ? opt.label.toLowerCase() : "selected range";
  }, [rangeKey]);

  const topTests = useMemo(() => {
    const map = new Map();
    filtered.forEach((r) => {
      const id = r.examId?._id || r.examId;
      if (!id) return;
      const cur = map.get(id) || {
        id,
        title: r.examId?.title || "Exam",
        attempts: 0,
        sum: 0
      };
      const pct = getPct(r);
      cur.attempts += 1;
      cur.sum += pct;
      map.set(id, cur);
    });
    return Array.from(map.values())
      .map((t) => ({ ...t, avg: t.attempts ? t.sum / t.attempts : 0 }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 3);
  }, [filtered]);

  const [hardQuestions, setHardQuestions] = useState([]);
  const [hardLoading, setHardLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!token || filtered.length === 0) {
      setHardQuestions([]);
      return undefined;
    }
    (async () => {
      setHardLoading(true);
      try {
        const subset = filtered.slice(0, 80);
        const details = await Promise.all(
          subset.map((r) => api.getResultDetail(token, r._id).catch(() => null))
        );
        const map = new Map();
        details.forEach((detail, idx) => {
          const result = subset[idx];
          const examTitle = result?.examId?.title || "Exam";
          const category = result?.examId?.categoryId?.name || "General";
          (detail?.answers || []).forEach((ans) => {
            const q = ans.questionId || {};
            const key = q._id || ans.questionId || ans._id || `${examTitle}-${idx}`;
            let entry = map.get(key);
            if (!entry) {
              entry = {
                key,
                code: q.questionId || "Q",
                content: q.content || "Question",
                category,
                examTitle,
                correct: 0,
                total: 0
              };
            }
            entry.total += 1;
            if (ans.isCorrect) entry.correct += 1;
            map.set(key, entry);
          });
        });
        const list = Array.from(map.values())
          .map((q) => ({
            ...q,
            successRate: q.total ? (q.correct / q.total) * 100 : 0
          }))
          .sort((a, b) => a.successRate - b.successRate)
          .slice(0, 3);
        if (alive) setHardQuestions(list);
      } finally {
        if (alive) setHardLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [filtered, token]);

  return (
    <div className="adminPageWrap adminReportWrap">
      <div className="adminShell">
        <AdminSidebar />
        <main className="adminMain">
          <div className="adminReportTopbar">
            <div className="adminReportHeader">
              <div>
                <div className="adminReportTitle">REPORTS & ANALYTICS</div>
                <div className="adminReportSubtitle">
                  Comprehensive platform performance and student progress insights.
                </div>
              </div>
              <div className="adminReportControls">
                <div className="adminReportRange">
                  {RANGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      className={rangeKey === opt.key ? "is-active" : ""}
                      onClick={() => {
                        setRangeKey(opt.key);
                        setCustomOpen(false);
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="adminReportGhostBtn"
                  onClick={() => {
                    setRangeKey("custom");
                    setCustomOpen((v) => !v);
                  }}
                >
                  <span className="material-symbols-outlined">calendar_month</span>
                  Custom Range
                </button>
                <button
                  type="button"
                  className="adminReportPrimaryBtn"
                  onClick={() => window.print()}
                >
                  <span className="material-symbols-outlined">download</span>
                  Export PDF
                </button>
              </div>
            </div>
          </div>

          {customOpen && (
            <div className="adminReportRangeInputs">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
              <button type="button" onClick={() => setCustomOpen(false)}>
                Apply
              </button>
            </div>
          )}

          {error && <div className="callout error">{error}</div>}
          {loading && <div className="muted">Loading...</div>}

          <div className="adminReportStatGrid">
            <div className="adminReportStatCard">
              <div className="adminReportStatTop">
                <div className="adminReportStatIcon green">
                  <span className="material-symbols-outlined">verified</span>
                </div>
                <span className={`adminReportDelta ${passRateDelta < 0 ? "negative" : ""}`}>
                  {formatDelta(passRateDelta)}
                </span>
              </div>
              <div className="adminReportStatLabel">Overall Pass Rate</div>
              <div className="adminReportStatValue">
                {stats.passRate.toFixed(1)}%
              </div>
              <div className="adminReportProgress">
                <span style={{ width: `${Math.min(100, stats.passRate)}%` }} />
              </div>
            </div>

            <div className="adminReportStatCard">
              <div className="adminReportStatTop">
                <div className="adminReportStatIcon blue">
                  <span className="material-symbols-outlined">stars</span>
                </div>
                <span className={`adminReportDelta ${avgBandDelta < 0 ? "negative" : ""}`}>
                  {formatDelta(avgBandDelta, "")}
                </span>
              </div>
              <div className="adminReportStatLabel">Average Score</div>
              <div className="adminReportStatValue">
                {avgBand.toFixed(1)} <small>Band</small>
              </div>
              <div className="adminReportDots">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <span key={idx} className={idx < activeDots ? "active" : ""} />
                ))}
                <span className="adminReportMeta">High Proficiency Avg</span>
              </div>
            </div>

            <div className="adminReportStatCard">
              <div className="adminReportStatTop">
                <div className="adminReportStatIcon purple">
                  <span className="material-symbols-outlined">library_add_check</span>
                </div>
                <span className="adminReportTag">TOTAL STATS</span>
              </div>
              <div className="adminReportStatLabel">Total Tests Completed</div>
              <div className="adminReportStatValue">
                {stats.total.toLocaleString()}
              </div>
              <div className="adminReportMeta">
                {completed24h.toLocaleString()} completed in last 24h
              </div>
              <div
                className={`adminReportDelta ${completedDelta < 0 ? "negative" : ""}`}
                style={{ marginTop: 10, width: "fit-content" }}
              >
                {formatDelta(completedDelta)}
              </div>
            </div>
          </div>

          <div className="adminReportChartCard">
            <div className="adminReportChartHeader">
              <div>
                <h3>Performance Trends</h3>
                <p>Monthly Test Volume vs. Average Performance</p>
              </div>
              <div className="adminReportLegend">
                <span className="dot" />
                Test Volume
                <span className="dot green" />
                Avg Performance
              </div>
            </div>
            <div
              className="adminReportChartCanvas adminReportChartCanvas--grid"
              ref={chartRef}
              onClick={onChartClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onChartClick(e);
                }
              }}
            >
              {activePoint && (
                <div
                  className="adminReportTooltip"
                  style={{ left: `${(activePoint.x / chart.width) * 100}%` }}
                >
                  <strong>{activePoint.label}</strong>
                  <span>Volume: {activePoint.volume}</span>
                  <span>Score: {activePoint.avg.toFixed(1)} Avg</span>
                </div>
              )}
              <svg viewBox={`0 0 ${chart.width} ${chart.height}`} aria-hidden="true">
                <polygon className="area" points={chart.areaPoints} />
                <polyline className="line" points={chart.volPoints} />
                <polyline className="line avg" points={chart.avgPoints} />
                {trend.map((t, i) => (
                  <circle
                    key={`${t.label}-${i}`}
                    className="dot"
                    cx={chart.toX(i)}
                    cy={chart.toYVol(t.volume)}
                    r="4"
                  />
                ))}
                {activePoint && (
                  <>
                    <line
                      x1={activePoint.x}
                      x2={activePoint.x}
                      y1={chart.pad}
                      y2={chart.pad + chart.innerH}
                      className="adminReportGuide"
                    />
                    <circle
                      className="adminReportActiveDot"
                      cx={activePoint.x}
                      cy={activePoint.yVol}
                      r="6"
                    />
                    <circle
                      className="adminReportActiveDot adminReportActiveDot--avg"
                      cx={activePoint.x}
                      cy={activePoint.yAvg}
                      r="5"
                    />
                  </>
                )}
              </svg>
            </div>
            <div className="adminReportChartLabels">
              {chartLabels.map((label, idx) => (
                <span key={`${label}-${idx}`}>{label}</span>
              ))}
            </div>
          </div>

          <div className="adminReportSplit">
            <div className="adminReportListCard">
              <div className="adminReportListHead">
                <div className="adminReportListTitle">
                  <span className="material-symbols-outlined">emoji_events</span>
                  Top Performing Tests
                </div>
                <button type="button" className="adminReportLink">
                  View All
                </button>
              </div>
              <div className="adminReportList">
                {topTests.map((t, idx) => (
                  <div className="adminReportListItem" key={t.id}>
                    <div className="adminReportRank">{String(idx + 1).padStart(2, "0")}</div>
                    <div className="adminReportListInfo">
                      <div className="adminReportListName">{t.title}</div>
                      <div className="adminReportListMeta">
                        {t.attempts} attempts in {rangeLabel}
                      </div>
                    </div>
                    <div className="adminReportListScore">
                      {t.avg.toFixed(1)}
                      <span>Avg Score</span>
                    </div>
                  </div>
                ))}
                {!loading && topTests.length === 0 && (
                  <div className="muted">No results in this period.</div>
                )}
              </div>
            </div>

            <div className="adminReportListCard">
              <div className="adminReportListHead">
                <div className="adminReportListTitle">
                  <span className="material-symbols-outlined">warning</span>
                  Most Difficult Questions
                </div>
                <button type="button" className="adminReportLink">
                  Review Content
                </button>
              </div>
              <div className="adminReportList adminReportList--dense">
                {hardLoading && <div className="muted">Analyzing...</div>}
                {!hardLoading &&
                  hardQuestions.map((q) => (
                    <div className="adminReportQuestionItem" key={q.key}>
                      <div className="adminReportQuestionIcon">
                        <span className="material-symbols-outlined">quiz</span>
                      </div>
                      <div className="adminReportQuestionMain">
                        <div className="adminReportQuestionTitle">
                          {q.code ? `Q-${q.code}: ` : ""}{q.content}
                        </div>
                        <div className="adminReportQuestionMeta">
                          Category: {q.category} • {q.examTitle}
                        </div>
                        <div className="adminReportQuestionRate">
                          <span>Success Rate</span>
                          <div className="adminReportQuestionBar">
                            <span style={{ width: `${q.successRate}%` }} />
                          </div>
                          <strong>{Math.round(q.successRate)}%</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                {!hardLoading && hardQuestions.length === 0 && (
                  <div className="muted">No question data yet.</div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
