import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/index.js";
import { useAuth } from "../../state/AuthContext.jsx";
import "../../grammarPractice.css";

const GRAMMAR_TOPICS = [
  {
    key: "tenses",
    title: "Tenses",
    desc: "Master present, past, and future verb forms in various contexts.",
    icon: "schedule",
    tone: "blue",
    level: "Beginner",
    subtopics: ["Simple Tenses", "Continuous Tenses", "Perfect Tenses", "Mixed Tenses"]
  },
  {
    key: "conditionals",
    title: "Conditionals",
    desc: "Understand zero, first, second, and third conditional structures.",
    icon: "hub",
    tone: "purple",
    level: "Intermediate",
    subtopics: ["Zero Conditional", "First Conditional", "Second Conditional", "Third Conditional"]
  },
  {
    key: "passive-voice",
    title: "Passive Voice",
    desc: "Learn how to change active sentences to passive and when to use each.",
    icon: "transform",
    tone: "orange",
    level: "Intermediate",
    subtopics: ["Simple Passive", "Continuous Passive", "Perfect Passive"]
  },
  {
    key: "relative-clauses",
    title: "Relative Clauses",
    desc: "Combining sentences using who, which, that, when, and where.",
    icon: "link",
    tone: "emerald",
    level: "Intermediate",
    subtopics: ["Subject Clauses", "Object Clauses", "Time/Place Clauses"]
  },
  {
    key: "modal-verbs",
    title: "Modal Verbs",
    desc: "Nuances of possibility, obligation, and permission in English.",
    icon: "psychology",
    tone: "pink",
    level: "Advanced",
    subtopics: ["Can/Could", "May/Might", "Must/Have to"]
  },
  {
    key: "reported-speech",
    title: "Reported Speech",
    desc: "Converting direct speech into indirect speech and reporting statements.",
    icon: "forum",
    tone: "amber",
    level: "Advanced",
    subtopics: ["Reporting Verbs", "Statements", "Questions"]
  }
];

export default function GrammarPractice() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("all");

  const difficultyLevel = selectedLevel;
  const focusAreas = ["Tenses", "Verbs", "Clauses", "Prepositions", "Articles"];

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const results = await api.getMyResults(token);
        if (alive) {
          setResults(results || []);
          setError("");
        }
      } catch (err) {
        if (alive) {
          setResults([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  const summaryStats = useMemo(() => {
    if (!results.length) {
      return { sessions: 0, accuracy: 0 };
    }
    const totals = results.reduce(
      (acc, item) => {
        acc.score += Number(item.score || 0);
        acc.total += Number(item.total || 0);
        return acc;
      },
      { score: 0, total: 0 }
    );
    const accuracy = totals.total ? Math.round((totals.score / totals.total) * 100) : 0;
    return { sessions: results.length, accuracy };
  }, [results]);

  const resultsByTopic = useMemo(() => {
    return results.reduce((acc, item) => {
      const topic = (item.examCategoryName || "general").toLowerCase();
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {});
  }, [results]);

  const topicCards = useMemo(() => {
    let filtered = GRAMMAR_TOPICS;
    if (difficultyLevel !== "all") {
      filtered = filtered.filter((t) => t.level.toLowerCase() === difficultyLevel.toLowerCase());
    }
    return filtered.map((topic) => {
      const count = resultsByTopic[topic.key] || 0;
      const progress = count > 0 ? Math.min(100, Math.round((count / 3) * 100)) : 0;
      return {
        ...topic,
        completedCount: count,
        progress
      };
    });
  }, [difficultyLevel, resultsByTopic]);

  const featuredTopic = topicCards[0];
  const secondaryTopic = topicCards[1];
  const remainingTopics = topicCards.slice(2);

  const handleStartPractice = (topic) => {
    const params = new URLSearchParams();
    params.set("mode", "practice");
    params.set("categoryName", "grammar");
    if (topic?.title) {
      params.set("grammarTopic", topic.title);
    } else if (topic?.key) {
      params.set("grammarTopic", topic.key);
    }
    navigate(`/user/exams?${params.toString()}`);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="grammarPracticePage">
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

      <main className="grammarPracticeMain">
        <div className="portalShell">
          <section className="grammarHero">
            <div className="grammarHeroContent">
              <div className="grammarHeroBadge">
                <span className="material-symbols-outlined">auto_stories</span>
                Grammar Mastery
              </div>
              <h1>Grammar Practice Hub</h1>
              <p>
                Build a strong grammar foundation with focused drills, bite-sized lessons, and
                instant progress feedback.
              </p>
              <div className="grammarHeroActions">
                <button
                  type="button"
                  className="grammarGhostBtn"
                  onClick={() => navigate("/user/exams?mode=practice&categoryName=grammar")}
                >
                  View All Exercises
                </button>
                <button
                  type="button"
                  className="grammarPrimaryBtn"
                  onClick={() => featuredTopic && handleStartPractice(featuredTopic)}
                  disabled={!featuredTopic}
                >
                  Start Grammar Practice
                  <span className="material-symbols-outlined">play_arrow</span>
                </button>
              </div>
            </div>
            <div className="grammarHeroCard">
              <div>
                <span className="grammarHeroLabel">Weekly Accuracy</span>
                <strong>{summaryStats.accuracy}%</strong>
                <p>{summaryStats.sessions} sessions completed</p>
              </div>
              <div className="grammarHeroProgress">
                <span style={{ width: `${Math.min(100, summaryStats.accuracy)}%` }} />
              </div>
              <div className="grammarHeroMeta">
                <div>
                  <span className="material-symbols-outlined">local_fire_department</span>
                  12 Day Streak
                </div>
                <div>
                  <span className="material-symbols-outlined">workspace_premium</span>
                  Intermediate Track
                </div>
              </div>
            </div>
          </section>

          <section className="grammarFilterRow">
            <div className="grammarFilterGroup">
              {["all", "beginner", "intermediate", "advanced"].map((level) => (
                <button
                  key={level}
                  type="button"
                  className={`grammarFilterBtn ${selectedLevel === level ? "is-active" : ""}`}
                  onClick={() => setSelectedLevel(level)}
                >
                  {level === "all" ? "All Levels" : level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
            <div className="grammarFocusGroup">
              {focusAreas.map((focus) => (
                <span key={focus} className="grammarFocusChip">
                  {focus}
                </span>
              ))}
            </div>
          </section>

          {error && <div className="grammarError">{error}</div>}

          {loading ? (
            <div className="grammarLoading">Loading grammar modules...</div>
          ) : topicCards.length === 0 ? (
            <div className="grammarEmpty">No topics available</div>
          ) : (
            <>
              <section className="grammarFeaturedGrid">
                {featuredTopic && (
                  <article className="grammarFeaturedCard">
                    <div className="grammarFeaturedInfo">
                      <div className="grammarPillRow">
                        <span className={`grammarPill grammarPill--${featuredTopic.tone}`}>
                          {featuredTopic.level}
                        </span>
                        <span className="grammarPill grammarPill--ghost">Grammar Mastery</span>
                      </div>
                      <h2>{featuredTopic.title} Intensive</h2>
                      <p>{featuredTopic.desc}</p>
                      <div className="grammarFeaturedMeta">
                        <div>
                          <span className="material-symbols-outlined">library_books</span>
                          {featuredTopic.subtopics.length} Modules
                        </div>
                        <div>
                          <span className="material-symbols-outlined">history</span>
                          15 min focus
                        </div>
                      </div>
                      <button
                        className="grammarPrimaryBtn"
                        type="button"
                        onClick={() => handleStartPractice(featuredTopic)}
                      >
                        Start Practice
                        <span className="material-symbols-outlined">arrow_forward</span>
                      </button>
                    </div>
                    <div className="grammarFeaturedArt">
                      <div className="grammarFeaturedIcon">
                        <span className="material-symbols-outlined">{featuredTopic.icon}</span>
                      </div>
                      <div className="grammarFeaturedBadge">FEATURED</div>
                    </div>
                  </article>
                )}
                {secondaryTopic && (
                  <article className="grammarMiniCard">
                    <div className="grammarMiniHeader">
                      <span className={`grammarTopicIcon grammarTopicIcon--${secondaryTopic.tone}`}>
                        <span className="material-symbols-outlined">{secondaryTopic.icon}</span>
                      </span>
                      <span className={`grammarTopicBadge grammarTopicBadge--${secondaryTopic.tone}`}>
                        {secondaryTopic.level}
                      </span>
                    </div>
                    <h3>{secondaryTopic.title}</h3>
                    <p>{secondaryTopic.desc}</p>
                    <div className="grammarMiniMeta">
                      <span>{secondaryTopic.subtopics.length} modules</span>
                      <span>{secondaryTopic.progress}% progress</span>
                    </div>
                    <button
                      className="grammarGhostBtn"
                      type="button"
                      onClick={() => navigate("/user/profile?tab=history")}
                    >
                      Start Review
                      <span className="material-symbols-outlined">play_arrow</span>
                    </button>
                  </article>
                )}
              </section>

              <section className="grammarTopicGrid">
                {remainingTopics.map((topic) => (
                  <div key={topic.key} className="grammarTopicCard">
                    <div className="grammarTopicHeader">
                      <span className={`grammarTopicIcon grammarTopicIcon--${topic.tone}`}>
                        <span className="material-symbols-outlined">{topic.icon}</span>
                      </span>
                      <span className={`grammarTopicBadge grammarTopicBadge--${topic.tone}`}>
                        {topic.level}
                      </span>
                    </div>

                    <h3 className="grammarTopicTitle">{topic.title}</h3>
                    <p className="grammarTopicDesc">{topic.desc}</p>

                    <div className="grammarTopicProgress">
                      <div className="grammarProgressHeader">
                        <span className="grammarProgressLabel">Progress</span>
                        <span className="grammarProgressValue">{topic.progress}%</span>
                      </div>
                      <div className="grammarProgressBar">
                        <div
                          className="grammarProgressFill"
                          style={{ width: `${topic.progress}%` }}
                        />
                      </div>
                    </div>

                    <button className="grammarTopicBtn" onClick={() => handleStartPractice(topic)}>
                      <span className="material-symbols-outlined">play_arrow</span>
                      Start Practice
                    </button>
                  </div>
                ))}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
