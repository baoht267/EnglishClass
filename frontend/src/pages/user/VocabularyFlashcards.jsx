import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/index.js";
import { useAuth } from "../../state/AuthContext.jsx";
import "../../vocabularyFlashcards.css";

const LEVEL_OPTIONS = ["All levels", "Beginner", "Intermediate", "Advanced", "Expert"];
const EMPTY_PROGRESS = {
  reviewed: 0,
  correct: 0,
  ratings: {
    again: 0,
    hard: 0,
    good: 0,
    easy: 0
  }
};

export default function VocabularyFlashcards() {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const [cards, setCards] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [filtersReady, setFiltersReady] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [progressStats, setProgressStats] = useState(EMPTY_PROGRESS);
  const [progressError, setProgressError] = useState("");
  const [progressLoading, setProgressLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [completedWord, setCompletedWord] = useState("");
  const [aiReply, setAiReply] = useState("");
  const [aiError, setAiError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiHistory, setAiHistory] = useState([]);
  const [aiCollapsed, setAiCollapsed] = useState(false);
  const aiRequestRef = useRef(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await api.listTopics(token);
        if (!alive) return;
        setTopics(Array.isArray(data) ? data : []);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  useEffect(() => {
    if (!filtersReady) return;
    let alive = true;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const params = { status: "published" };
        if (selectedTopic !== "all") params.topic = selectedTopic;
        if (selectedLevel !== "all") params.level = selectedLevel;
        const data = await api.listVocabulary(token, params);
        if (!alive) return;
        setCards(Array.isArray(data) ? data : []);
      } catch (err) {
        if (alive) setError(err.message || "Unable to load flashcards.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, filtersReady, selectedTopic, selectedLevel]);

  useEffect(() => {
    setIndex(0);
    setIsFlipped(false);
  }, [cards.length]);

  useEffect(() => {
    setIndex(0);
    setIsFlipped(false);
  }, [selectedTopic, selectedLevel]);
  useEffect(() => {
    setProgressStats(EMPTY_PROGRESS);
    setProgressError("");
    setCompleted(false);
    setCompletedWord("");
  }, [cards.length, selectedTopic, selectedLevel]);

  useEffect(() => {
    aiRequestRef.current += 1;
    setAiReply("");
    setAiError("");
    setAiHistory([]);
    setAiLoading(false);
  }, [selectedTopic, selectedLevel, cards.length, index]);

  useEffect(() => {
    if (!filtersReady) return;
    let alive = true;
    setProgressLoading(true);
    setProgressError("");
    (async () => {
      try {
        const data = await api.getVocabularyProgress(token, {
          topic: selectedTopic,
          level: selectedLevel
        });
        if (!alive) return;
        setProgressStats({
          reviewed: Number(data?.reviewed || 0),
          correct: Number(data?.correct || 0),
          ratings: {
            again: Number(data?.ratings?.again || 0),
            hard: Number(data?.ratings?.hard || 0),
            good: Number(data?.ratings?.good || 0),
            easy: Number(data?.ratings?.easy || 0)
          }
        });
      } catch (err) {
        if (alive) setProgressError(err.message || "Unable to load progress.");
      } finally {
        if (alive) setProgressLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, filtersReady, selectedTopic, selectedLevel]);

  const deck = cards.length ? cards : [];
  const safeIndex = deck.length ? index % deck.length : 0;
  const currentCard = deck[safeIndex];
  const progress = useMemo(() => {
    if (!deck.length) return 0;
    return Math.round(((safeIndex + 1) / deck.length) * 100);
  }, [deck.length, safeIndex]);
  const isLastCard = deck.length ? safeIndex === deck.length - 1 : false;

  const topicOptions = useMemo(() => {
    const map = new Map();
    topics.forEach((topic) => {
      if (!topic?.name) return;
      const label = topic.name.trim();
      if (!label) return;
      const value = label.toLowerCase();
      if (!map.has(value)) map.set(value, label);
    });
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [topics]);

  const selectedTopicLabel = selectedTopic === "all" ? "All topics" : selectedTopic;
  const selectedLevelLabel = selectedLevel === "all" ? "All levels" : selectedLevel;
  const reviewGoal = deck.length || 0;
  const learnedCount = reviewGoal
    ? Math.min(progressStats.reviewed, reviewGoal)
    : progressStats.reviewed;
  const learnedProgress = reviewGoal ? Math.min(100, Math.round((learnedCount / reviewGoal) * 100)) : 0;
  const recallAccuracy = progressStats.reviewed
    ? Math.round((progressStats.correct / progressStats.reviewed) * 100)
    : 0;
  const isCompleted = reviewGoal > 0 && learnedCount >= reviewGoal;
  const upcomingReviews = [
    { key: "again", label: "Again", count: progressStats.ratings.again },
    { key: "hard", label: "Hard", count: progressStats.ratings.hard },
    {
      key: "good",
      label: "Good+",
      count: progressStats.ratings.good + progressStats.ratings.easy
    }
  ];

  const handlePrev = () => {
    if (!deck.length) return;
    if (completed) {
      setCompleted(false);
      setIsFlipped(false);
      return;
    }
    setIsFlipped(false);
    setIndex((prev) => (prev - 1 + deck.length) % deck.length);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleStart = () => {
    setFiltersReady(true);
    setShowFilters(false);
  };

  const advanceCard = () => {
    setIsFlipped(false);
    if (!deck.length) return;
    if (isLastCard) {
      setCompleted(true);
      setCompletedWord(currentCard?.word || "");
      return;
    }
    setIndex((prev) => (prev + 1) % deck.length);
  };

  const syncProgress = async (payload) => {
    setProgressError("");
    try {
      const data = await api.trackVocabularyProgress(token, payload);
      setProgressStats({
        reviewed: Number(data?.reviewed || 0),
        correct: Number(data?.correct || 0),
        ratings: {
          again: Number(data?.ratings?.again || 0),
          hard: Number(data?.ratings?.hard || 0),
          good: Number(data?.ratings?.good || 0),
          easy: Number(data?.ratings?.easy || 0)
        }
      });
    } catch (err) {
      setProgressError(err.message || "Unable to update progress.");
    }
  };

  const handleNext = () => {
    if (!deck.length || completed) return;
    syncProgress({
      topic: selectedTopic,
      level: selectedLevel,
      action: "next"
    });
    advanceCard();
  };

  const handleRate = (rating) => {
    if (!deck.length || completed) return;
    syncProgress({
      topic: selectedTopic,
      level: selectedLevel,
      action: "rate",
      rating
    });
    advanceCard();
  };

  const buildAiContext = (card) => {
    if (!card) return "";
    const details = [
      card.word ? `Từ: ${card.word}` : null,
      card.meaning ? `Nghĩa: ${card.meaning}` : null,
      card.partOfSpeech ? `Loại từ: ${card.partOfSpeech}` : null,
      card.phonetic ? `Phiên âm: ${card.phonetic}` : null,
      card.example ? `Ví dụ: ${card.example}` : null,
      card.topic ? `Chủ đề: ${card.topic}` : null,
      card.level ? `Trình độ: ${card.level}` : null
    ].filter(Boolean);
    return details.join(". ");
  };

  const handleExplainWord = async () => {
    if (!currentCard || aiLoading) return;
    const requestId = (aiRequestRef.current += 1);
    setAiLoading(true);
    setAiError("");
    const prompt = `Giải thích từ "${currentCard.word}". Hãy nêu cách dùng, thêm 2-3 ví dụ mới, và từ đồng nghĩa/trái nghĩa nếu có.`;
    try {
      const data = await api.askTutor(token, {
        message: prompt,
        action: "vocab_explain",
        context: {
          question: currentCard.word ? `Từ vựng: ${currentCard.word}` : undefined,
          passage: buildAiContext(currentCard) || undefined
        },
        history: aiHistory
      });
      if (aiRequestRef.current !== requestId) return;
      const replyText = data?.reply || "";
      if (!replyText) {
        setAiError("AI không trả về nội dung.");
      } else {
        setAiReply(replyText);
        setAiHistory((prev) =>
          [...prev, { role: "user", content: prompt }, { role: "assistant", content: replyText }].slice(-8)
        );
      }
    } catch (err) {
      if (aiRequestRef.current !== requestId) return;
      setAiError(err.message || "Không thể kết nối AI.");
    } finally {
      if (aiRequestRef.current === requestId) {
        setAiLoading(false);
      }
    }
  };

  return (
    <div className="flashPage">
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

      <main className="flashMain">
        <div className="portalShell">
          <section className="flashHeader">
            <div>
              <h1>Vocabulary Practice</h1>
              <p>
                {filtersReady
                  ? `Topic: ${selectedTopicLabel} • ${selectedLevelLabel}`
                  : "Choose a topic and level to begin."}
              </p>
            </div>
            <div className="flashProgress">
              <span>
                Cards: {deck.length ? safeIndex + 1 : 0} / {deck.length || 0}
              </span>
              <div className="flashProgressBar">
                <span style={{ width: `${progress}%` }} />
              </div>
            </div>
            {filtersReady && (
              <button
                type="button"
                className="flashFilterBtn"
                onClick={() => setShowFilters(true)}
              >
                Change filters
              </button>
            )}
          </section>

          {error && <div className="flashError">{error}</div>}

          <div className="flashLayout">
            <section className="flashStage">
              {loading ? (
                <div className="flashCardShell flashLoading">Loading flashcards...</div>
              ) : !deck.length ? (
                <div className="flashCardShell flashEmpty">
                  <h3>No vocabulary found</h3>
                  <p>Try another topic or level.</p>
                </div>
              ) : completed ? (
                <div className="flashCardShell flashComplete">
                  <h3>Chúc mừng bạn đã học hết bộ từ vựng này!</h3>
                  {completedWord && <p>Từ cuối cùng: {completedWord}</p>}
                  <span className="flashHint">Bạn có thể bấm Previous để xem lại.</span>
                </div>
              ) : (
                <div className="flashCardShell" onClick={() => setIsFlipped((prev) => !prev)}>
                  <div className={`flashCard ${isFlipped ? "is-flipped" : ""}`}>
                    <div className="flashCardFace flashCardFront">
                      <span className="flashLevelTag">
                        {(currentCard.level || "EXPERT").toString().toUpperCase()}
                      </span>
                      <span className="flashPosTag">
                        {(currentCard.partOfSpeech || "other").toString().toUpperCase()}
                      </span>
                      <span className="material-symbols-outlined flashAudio">volume_up</span>
                      <h2>{currentCard.word}</h2>
                      <p>{currentCard.phonetic || "—"}</p>
                      <span className="flashHint">Click to flip</span>
                    </div>
                    <div className="flashCardFace flashCardBack">
                      <span className="flashLevelTag flashLevelTag--alt">MEANING</span>
                      <h3>{currentCard.meaning}</h3>
                      <p className="flashMeta">
                        Part of speech: {currentCard.partOfSpeech || "other"}
                      </p>
                      <p>{currentCard.example || "No example yet."}</p>
                      <span className="flashHint">Click to flip</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flashControls">
                <button type="button" className="flashGhostBtn" onClick={handlePrev} disabled={!deck.length}>
                  <span className="material-symbols-outlined">arrow_back</span>
                  Previous
                </button>
                <button
                  type="button"
                  className="flashGhostBtn"
                  onClick={handleNext}
                  disabled={!deck.length || completed}
                >
                  Next
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>

              <div className="flashRatingRow">
                <button
                  type="button"
                  className="flashRate flashRate--again"
                  disabled={!deck.length || completed}
                  onClick={() => handleRate("again")}
                >
                  Again
                  <small>&lt; 1 min</small>
                </button>
                <button
                  type="button"
                  className="flashRate flashRate--hard"
                  disabled={!deck.length || completed}
                  onClick={() => handleRate("hard")}
                >
                  Hard
                  <small>2 days</small>
                </button>
                <button
                  type="button"
                  className="flashRate flashRate--good"
                  disabled={!deck.length || completed}
                  onClick={() => handleRate("good")}
                >
                  Good
                  <small>4 days</small>
                </button>
                <button
                  type="button"
                  className="flashRate flashRate--easy"
                  disabled={!deck.length || completed}
                  onClick={() => handleRate("easy")}
                >
                  Easy
                  <small>7 days</small>
                </button>
              </div>
            </section>

            <aside className="flashAside">
              <div className="flashSideCard">
                <div className="flashSideHeader">
                  <span className="material-symbols-outlined">bolt</span>
                  <h3>Daily Goals</h3>
                </div>
                {progressLoading && <div className="flashGoalStatus">Syncing...</div>}
                {progressError && <div className="flashGoalError">{progressError}</div>}
                <div className="flashGoalRow">
                  <span>Words learned</span>
                  <strong>
                    {learnedCount} / {reviewGoal}
                  </strong>
                </div>
                <div className="flashGoalBar">
                  <span style={{ width: `${learnedProgress}%` }} />
                </div>
                <div className="flashGoalRow">
                  <span>Recall accuracy</span>
                  <strong>{recallAccuracy}%</strong>
                </div>
                <div className="flashGoalBar flashGoalBar--green">
                  <span style={{ width: `${recallAccuracy}%` }} />
                </div>
                <div className="flashUpcoming">
                  <p>Upcoming reviews</p>
                  <div className="flashPillRow">
                    {upcomingReviews.map((item) => (
                      <span className="flashPill" key={item.key}>
                        {item.label}: {item.count}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className={`flashSideCard flashAiCard ${aiCollapsed ? "is-collapsed" : ""}`}>
                <div className="flashSideHeader flashAiHeader">
                  <div className="flashAiTitle">
                    <span className="material-symbols-outlined">smart_toy</span>
                    <div>
                      <h3>AI Tutor Help</h3>
                      <p>Instant explanations</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="flashAiCollapse"
                    onClick={() => setAiCollapsed((prev) => !prev)}
                    aria-label={aiCollapsed ? "Expand AI tutor" : "Collapse AI tutor"}
                  >
                    <span className="material-symbols-outlined">
                      {aiCollapsed ? "open_in_full" : "close"}
                    </span>
                  </button>
                </div>
                {!aiCollapsed && (
                  <div className="flashAiBody">
                    <p>Need context, cultural usage, or similar words? Ask right away.</p>
                    <div className="flashAiMeta">
                      <span>
                        {currentCard?.word ? `Word: ${currentCard.word}` : "No word selected yet."}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="flashAiBtn"
                      onClick={handleExplainWord}
                      disabled={!currentCard || aiLoading}
                    >
                      {aiLoading ? "Explaining..." : "Explain this word"}
                    </button>
                    {(aiLoading || aiError || aiReply) && (
                      <div className="flashAiAnswer" role="status" aria-live="polite">
                        {aiLoading && <div className="flashAiStatus">Đang hỏi AI...</div>}
                        {aiError && <div className="flashAiError">{aiError}</div>}
                        {aiReply && <div className="flashAiResponse">{aiReply}</div>}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flashSideCard flashTip">
                <div className="flashSideHeader">
                  <span className="material-symbols-outlined">tips_and_updates</span>
                  <h3>Pro Tip</h3>
                </div>
                <p>
                  Saying the word aloud while reviewing cards increases recall probability by up to 25%.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {showFilters && (
        <div className="flashFilterOverlay" role="dialog" aria-label="Select flashcard filters">
          <div className="flashFilterCard">
            <h2>Choose Flashcards</h2>
            <p>Select topic and level to load the right vocabulary set.</p>
            <div className="flashFilterFields">
              <label>
                Topic
                <select
                  value={selectedTopic}
                  onChange={(event) => setSelectedTopic(event.target.value)}
                >
                  <option value="all">All topics</option>
                  {topicOptions.map((topic) => (
                    <option key={topic.value} value={topic.label}>
                      {topic.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Level
                <select
                  value={selectedLevel}
                  onChange={(event) => setSelectedLevel(event.target.value)}
                >
                  {LEVEL_OPTIONS.map((level) => (
                    <option key={level} value={level === "All levels" ? "all" : level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flashFilterActions">
              <button type="button" className="flashGhostBtn" onClick={() => navigate("/user/practice")}>
                Back
              </button>
              <button type="button" className="flashPrimaryBtn" onClick={handleStart}>
                Start Flashcards
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
