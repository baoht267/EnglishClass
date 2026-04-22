import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api/index.js";
import { useAuth } from "../../state/AuthContext.jsx";

const LEVEL_HINTS = [
  { key: "Beginner", band: "A1 - A2" },
  { key: "Intermediate", band: "B1 - B2" },
  { key: "Advanced", band: "C1 - C2" }
];

const SKILL_STYLES = [
  { icon: "headphones", tone: "blue", desc: "Audio comprehension" },
  { icon: "menu_book", tone: "emerald", desc: "Text analysis & speed" },
  { icon: "edit_note", tone: "purple", desc: "Structure & rules" },
  { icon: "spellcheck", tone: "amber", desc: "Definitions & usage" }
];
const PRACTICE_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA7szi9xjsH94rpw77T-6adjr7-9lnzPJ6KhtmvaCN3_r2LGB4Ga6uJSqpOLl4vo92pNtTO54YQIuR-MDC6seSRIPQqSnVVfB5ZzhvAk4cBLbgGf28cV1RfaeQWx6JR5PGsPEVKOZlj72SM7h3BPjGHWYzwzAw9eIgdMkhaX0xMdJQgkTBBPkcRsP8Bs6wExM_Lm5QLCigBwKItCHitqFkIxf1SUk4mu9zR0u4CISnN0Ypf11zI23Q9-bk3qhOOQsE7zl7P8x5CpPk";

export default function PracticeSetup({ embedded = false }) {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [levels, setLevels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [levelId, setLevelId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [count, setCount] = useState(0);
  const [questionTarget, setQuestionTarget] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [levs, cats] = await Promise.all([
          api.listLevels(token),
          api.listCategories(token)
        ]);
        if (!alive) return;
        setLevels(levs);
        setCategories(cats);
        if (levs.length && !levelId) setLevelId(levs[0]._id);
        if (cats.length && !categoryId) setCategoryId(cats[0]._id);
      } catch (err) {
        if (alive) setError(err.message || "Load failed");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, levelId, categoryId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await api.countQuestions(token, {
          levelId: levelId || undefined,
          categoryId: categoryId || undefined
        });
        if (alive) setCount(data.count || 0);
      } catch {
        if (alive) setCount(0);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, levelId, categoryId]);

  useEffect(() => {
    if (!count) return;
    if (questionTarget > count) setQuestionTarget(count);
  }, [count, questionTarget]);

  const levelCards = useMemo(() => {
    if (!levels.length) {
      return LEVEL_HINTS.map((item) => ({ ...item, name: item.key, _id: item.key }));
    }
    return levels.map((level, index) => ({
      _id: level._id,
      name: level.name,
      band: LEVEL_HINTS[index]?.band || "A1 - C2"
    }));
  }, [levels]);

  const skillCards = useMemo(() => {
    if (!categories.length) {
      return SKILL_STYLES.map((style, index) => ({
        ...style,
        _id: `skill-${index}`,
        name: style.icon.replace("_", " ")
      }));
    }
    return categories.map((category, index) => ({
      _id: category._id,
      name: category.name,
      desc: SKILL_STYLES[index % SKILL_STYLES.length].desc,
      icon: SKILL_STYLES[index % SKILL_STYLES.length].icon,
      tone: SKILL_STYLES[index % SKILL_STYLES.length].tone
    }));
  }, [categories]);

  const onStart = () => {
    const params = new URLSearchParams();
    params.set("mode", "practice");
    if (levelId) params.set("levelId", levelId);
    if (categoryId) params.set("categoryId", categoryId);
    if (questionTarget) params.set("limit", String(questionTarget));
    navigate(`/user/exams?${params.toString()}`);
  };

  return (
    <div className={`practiceHubOverlay ${embedded ? "practiceHubOverlay--fixed" : ""}`}>
      <div className="practiceHubPage">
        <header className="practiceHubTopbar">
          <div className="practiceHubTopbarInner">
            <div className="practiceHubBrand">
              <span className="material-symbols-outlined">school</span>
              <h2>English Master</h2>
            </div>
            <div className="practiceHubNav">
              <nav>
                <Link to="/user">Dashboard</Link>
                <span className="is-active">Practice Hub</span>
                <button type="button" onClick={() => navigate("/user/exams")}>
                  Exams
                </button>
                <button type="button" onClick={() => navigate("/user/profile?tab=history")}>
                  Progress
                </button>
              </nav>
              <div className="practiceHubDivider" />
              <div className="practiceHubUser">
                <div>
                  <p>{user?.name || "Alex Johnson"}</p>
                  <span>Student</span>
                </div>
                <div
                  className="practiceHubAvatar"
                  style={{ backgroundImage: `url(${PRACTICE_AVATAR})` }}
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>
        </header>

        <div className="practiceHubBody">
          <div className="practiceHubBreadcrumbs">
            <Link to="/user">Home</Link>
            <span className="material-symbols-outlined">chevron_right</span>
            <span>Practice Hub</span>
          </div>

          <div className="practiceHubGrid">
            <main className="practiceHubMain">
              <div className="practiceHubIntro">
                <h1>Customize Your Session</h1>
                <p>Select your parameters below to generate a tailored practice set.</p>
              </div>

              <section className="practiceHubCard">
                <div className="practiceHubCardHeader">
                  <span className="material-symbols-outlined">signal_cellular_alt</span>
                  <h2>Difficulty Level</h2>
                </div>
                <div className="practiceHubLevelGrid">
                  {levelCards.map((level) => (
                    <button
                      key={level._id}
                      type="button"
                      className={`practiceHubLevel ${levelId === level._id ? "is-active" : ""}`}
                      onClick={() => setLevelId(level._id)}
                    >
                      <span>{level.name}</span>
                      <small>{level.band}</small>
                      <span className="material-symbols-outlined">check_circle</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="practiceHubCard">
                <div className="practiceHubCardHeader practiceHubCardHeader--split">
                  <div>
                    <span className="material-symbols-outlined">category</span>
                    <h2>Focus Skills</h2>
                  </div>
                  <span className="practiceHubHint">Select multiple</span>
                </div>
                <div className="practiceHubSkillGrid">
                  {skillCards.map((skill) => (
                    <button
                      key={skill._id}
                      type="button"
                      className={`practiceHubSkill ${categoryId === skill._id ? "is-active" : ""}`}
                      onClick={() => setCategoryId(skill._id)}
                    >
                      <span className={`practiceHubSkillIcon practiceHubSkillIcon--${skill.tone}`}>
                        <span className="material-symbols-outlined">{skill.icon}</span>
                      </span>
                      <div>
                        <h3>{skill.name}</h3>
                        <p>{skill.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section className="practiceHubCard">
                <div className="practiceHubCardHeader practiceHubCardHeader--spread">
                  <div>
                    <span className="material-symbols-outlined">format_list_numbered</span>
                    <h2>Number of Questions</h2>
                  </div>
                  <span className="practiceHubCount">{questionTarget}</span>
                </div>
                <div className="practiceHubSlider">
                  <input
                    type="range"
                    min={5}
                    max={Math.max(5, Math.min(50, count || 50))}
                    step={5}
                    value={questionTarget}
                    onChange={(event) => setQuestionTarget(Number(event.target.value))}
                  />
                  <div className="practiceHubSliderMarks">
                    <span>5</span>
                    <span>15</span>
                    <span>25</span>
                    <span>35</span>
                    <span>50</span>
                  </div>
                  <div className="practiceHubAvailable">
                    Available questions: <strong>{loading ? "…" : count}</strong>
                  </div>
                </div>
              </section>

              <div className="practiceHubCta">
                {error && <div className="practiceHubError">{error}</div>}
                <button type="button" onClick={onStart} disabled={loading}>
                  <span className="material-symbols-outlined">play_circle</span>
                  Confirm & Start Practice
                </button>
                <p>Estimated time: ~15 minutes</p>
              </div>
            </main>

            <aside className="practiceHubAside">
              <div className="practiceHubCard practiceHubPerformance">
                <div className="practiceHubPerformanceBubble" />
                <div>
                  <h3>Your Performance</h3>
                  <div className="practiceHubPerformanceRow">
                    <span>82%</span>
                    <small>
                      <span className="material-symbols-outlined">trending_up</span>
                      +4%
                    </small>
                  </div>
                  <div className="practiceHubProgress">
                    <span style={{ width: "82%" }} />
                  </div>
                  <div className="practiceHubBadge">
                    <span className="material-symbols-outlined">warning</span>
                    Focus: Phrasal Verbs
                  </div>
                </div>
              </div>

              <div className="practiceHubCard practiceHubQuick">
                <div className="practiceHubQuickHeader">
                  <div>
                    <span className="material-symbols-outlined">bolt</span>
                    <h3>Quick Start</h3>
                  </div>
                  <span>Recommended</span>
                </div>
                <div className="practiceHubQuickList">
                  <div>
                    <span className="material-symbols-outlined">history_edu</span>
                    <div>
                      <h4>Review: Past Simple</h4>
                      <p>Grammar • 10 Questions</p>
                    </div>
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </div>
                  <div>
                    <span className="material-symbols-outlined">graphic_eq</span>
                    <div>
                      <h4>Business Dialogues</h4>
                      <p>Listening • 5 Mins</p>
                    </div>
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </div>
                  <div>
                    <span className="material-symbols-outlined">school</span>
                    <div>
                      <h4>Exam Prep: Part 2</h4>
                      <p>Mixed • 25 Questions</p>
                    </div>
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </div>
                </div>
                <button type="button" className="practiceHubQuickFooter">
                  View Practice History
                  <span className="material-symbols-outlined">open_in_new</span>
                </button>
              </div>

              <div className="practiceHubCard practiceHubChallenge">
                <div className="practiceHubChallengeLabel">
                  <span className="material-symbols-outlined">emoji_events</span>
                  Daily Challenge
                </div>
                <h3>Streak Multiplier Active!</h3>
                <p>Complete a 20-question session today to keep your 5-day streak.</p>
                <button type="button">Accept Challenge</button>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
