import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../../api/index.js";
import { getApiBaseUrl } from "../../api/http.js";
import { useAuth } from "../../state/AuthContext.jsx";
import "../../practiceSession.css";
import "../../listeningExam.css";
import "../../readingExam.css";

export default function TakeExam() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [selected, setSelected] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [pendingRoute, setPendingRoute] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showTranscript, setShowTranscript] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [tutorMessages, setTutorMessages] = useState(() => [
    {
      role: "assistant",
      content:
        "Tôi có thể giải thích ngữ pháp, phân tích từng đáp án và chỉ ra vì sao câu trả lời đúng hoặc sai."
    }
  ]);
  const [tutorInput, setTutorInput] = useState("");
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorError, setTutorError] = useState("");
  const tutorChatEndRef = useRef(null);
  const lastTutorQuestionRef = useRef("");
  const audioRef = useRef(null);
  const autoSubmitTriggeredRef = useRef(false);
  const apiBaseUrl = getApiBaseUrl();
  const [markedQuestions, setMarkedQuestions] = useState({});
  const [passageFont, setPassageFont] = useState(16);
  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  const mode = searchParams.get("mode");
  const isPracticeMode = mode === "practice";
  const shouldShowTutor = isPracticeMode;
  const practiceNavClass = isPracticeMode ? "is-active" : "";
  const examNavClass = isPracticeMode ? "" : "is-active";

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = isPracticeMode
          ? await api.getPractice(token, id)
          : await api.getExam(token, id);
        if (alive) setExam(data);
      } catch (err) {
        if (alive) setError(err.message || "Load failed");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, id, isPracticeMode]);

  useEffect(() => {
    if (!exam?.questions?.length) return;
    setActiveIndex(0);
  }, [exam]);

  const answersPayload = useMemo(() => {
    if (!exam?.questions) return [];
    return exam.questions.map((q) => ({
      questionId: q._id,
      selectedKey: selected[q._id] || null
    }));
  }, [exam, selected]);

  const onSubmit = async (redirectTo) => {
    setError("");
    setSubmitting(true);
    try {
      const timeSpentSeconds =
        totalSeconds > 0 ? Math.max(0, totalSeconds - secondsLeft) : null;
      if (isPracticeMode) {
        await api.submitPractice(token, id, answersPayload, timeSpentSeconds);
      } else {
        await api.submitExam(token, id, answersPayload, timeSpentSeconds);
      }
      setHasSubmitted(true);
      navigate(redirectTo || "/user/results");
    } catch (err) {
      setError(err.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const questionCount = exam?.questions?.length || 0;
  const estimatedMinutes =
    exam?.timeLimit ?? (questionCount ? Math.max(10, questionCount * 2) : 20);
  const currentQuestion = exam?.questions?.[activeIndex];
  const categoryLabel = (exam?.categoryId?.name || exam?.category?.name || "").toLowerCase();
  const isListening =
    categoryLabel.includes("listen") ||
    categoryLabel.includes("nghe") ||
    Boolean(exam?.questions?.some((q) => q.audioUrl));
  const isReading =
    categoryLabel.includes("read") ||
    categoryLabel.includes("đọc") ||
    categoryLabel.includes("doc");
  const isLastQuestion = questionCount > 0 && activeIndex === questionCount - 1;
  const trackProgress = questionCount
    ? Math.round(((activeIndex + 1) / questionCount) * 100)
    : 0;
  const timeProgress = totalSeconds
    ? Math.max(0, Math.min(100, Math.round((secondsLeft / totalSeconds) * 100)))
    : 0;

  const answeredCount = Object.keys(selected).filter((k) => selected[k]).length;
  const hasCorrectKey = Boolean(exam?.questions?.some((q) => q.correctKey));
  const correctCount = useMemo(() => {
    if (!exam?.questions || !hasCorrectKey) return 0;
    return exam.questions.reduce((acc, q) => {
      const pick = selected[q._id];
      if (pick && q.correctKey && pick === q.correctKey) return acc + 1;
      return acc;
    }, 0);
  }, [exam, selected, hasCorrectKey]);
  const completion = questionCount > 0 ? Math.round((answeredCount / questionCount) * 100) : 0;
  const accuracy = answeredCount ? Math.round((correctCount / answeredCount) * 100) : 0;
  const accuracyDisplay = hasCorrectKey ? accuracy : completion;
  const accuracyLabel = hasCorrectKey ? "Current accuracy" : "Completion";

  useEffect(() => {
    if (!exam) return;
    const total = Math.max(0, Math.round(estimatedMinutes * 60));
    setTotalSeconds(total);
    setSecondsLeft(total);
    autoSubmitTriggeredRef.current = false;
  }, [exam, estimatedMinutes]);

  useEffect(() => {
    if (!isPracticeMode) {
      setTutorOpen(false);
    }
  }, [isPracticeMode]);


  useEffect(() => {
    if (!secondsLeft || submitting || hasSubmitted) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [secondsLeft, submitting, hasSubmitted]);

  useEffect(() => {
    if (!exam || loading || totalSeconds <= 0 || secondsLeft > 0) return;
    if (submitting || hasSubmitted || autoSubmitTriggeredRef.current) return;
    autoSubmitTriggeredRef.current = true;
    setShowSubmitConfirm(false);
    setPendingRoute("");
    void onSubmit("/user/results");
  }, [exam, loading, totalSeconds, secondsLeft, submitting, hasSubmitted]);

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const seconds = String(secondsLeft % 60).padStart(2, "0");
  const formatClock = (value) => {
    if (!Number.isFinite(value) || value <= 0) return "—";
    const total = Math.round(value);
    const mins = Math.floor(total / 60);
    const secs = String(total % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  };
  const audioSrc = useMemo(() => {
    const url = exam?.audioUrl || currentQuestion?.audioUrl;
    if (!url) return "";
    if (url.startsWith("data:") || url.startsWith("http")) return url;
    return `${apiBaseUrl}${url}`;
  }, [exam?.audioUrl, currentQuestion?.audioUrl, apiBaseUrl]);
  const canShowTranscript = Boolean(selected[currentQuestion?._id]);
  const audioDurationLabel = formatClock(audioDuration);
  const passageText =
    exam?.description ||
    currentQuestion?.explanation ||
    "Reading passage is not available yet.";

  const openSubmitConfirm = (route = "/user/results") => {
    if (submitting || hasSubmitted) {
      if (route) navigate(route);
      return;
    }
    setPendingRoute(route || "/user/results");
    setShowSubmitConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    const next = pendingRoute || "/user/results";
    setShowSubmitConfirm(false);
    setPendingRoute("");
    await onSubmit(next);
  };

  const handleCancelSubmit = () => {
    setShowSubmitConfirm(false);
    setPendingRoute("");
  };

  const handleNavAttempt = (path) => {
    if (hasSubmitted) {
      navigate(path);
      return;
    }
    openSubmitConfirm(path);
  };

  useEffect(() => {
    if (hasSubmitted) return;
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const handlePopState = () => {
      if (hasSubmitted) return;
      openSubmitConfirm();
      window.history.pushState(null, "", window.location.href);
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [hasSubmitted]);

  const handleSkip = () => {
    setActiveIndex((i) => Math.min(questionCount - 1, i + 1));
  };

  const adjustPassageFont = (delta) => {
    setPassageFont((size) => Math.max(14, Math.min(20, size + delta)));
  };

  const toggleMark = () => {
    if (!currentQuestion?._id) return;
    setMarkedQuestions((prev) => ({
      ...prev,
      [currentQuestion._id]: !prev[currentQuestion._id]
    }));
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }
    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  };

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    const handleLoaded = () => {
      const duration = Number(audio.duration);
      setAudioDuration(Number.isFinite(duration) ? duration : 0);
    };
    audio.addEventListener("loadedmetadata", handleLoaded);
    handleLoaded();
    return () => {
      audio.removeEventListener("loadedmetadata", handleLoaded);
    };
  }, [audioSrc]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
    setShowTranscript(false);
  }, [currentQuestion?._id]);

  const buildTutorHistory = (nextMessage) => {
    const history = nextMessage ? [...tutorMessages, nextMessage] : [...tutorMessages];
    return history
      .filter((item) => item && (item.role === "user" || item.role === "assistant"))
      .slice(-8)
      .map((item) => ({ role: item.role, content: item.content }));
  };

  const buildQuestionContext = () => {
    if (!currentQuestion) return null;
    const options = currentQuestion.options || {};
    const optionLines = ["A", "B", "C", "D"]
      .filter((key) => options[key])
      .map((key) => `${key}. ${options[key]}`)
      .join(" | ");
    const selectedKey = selected[currentQuestion._id];
    const selectedText = selectedKey ? `${selectedKey}. ${options[selectedKey] || ""}` : "";
    const transcript = currentQuestion.explanation || "";
    return {
      message:
        "Please explain this question in Vietnamese, analyze each option, and provide the reasoning:",
      context: {
        question: `${currentQuestion.content}${optionLines ? ` | Options: ${optionLines}` : ""}`,
        userAnswer: selectedText || "No answer yet",
        passage: transcript ? `Transcript: ${transcript}` : "",
        audioUrl: audioSrc || ""
      }
    };
  };

  const sendTutorMessage = async (rawMessage, action, context) => {
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
        context: context || undefined,
        history: buildTutorHistory(userMessage)
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

  useEffect(() => {
    if (!tutorOpen) return;
    requestAnimationFrame(() => {
      tutorChatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }, [tutorOpen, tutorMessages, tutorLoading]);

  const handleTutorExplain = () => {
    if (!isPracticeMode) return;
    setTutorOpen(true);
    const ctx = buildQuestionContext();
    if (!ctx) return;
    const questionId = currentQuestion?._id || "";
    if (questionId && lastTutorQuestionRef.current === questionId) return;
    lastTutorQuestionRef.current = questionId;
    sendTutorMessage(ctx.message, "Explain Answer", ctx.context);
  };

  if (loading) {
    return (
      <div className="card">
        <div className="muted">Loading...</div>
      </div>
    );
  }

  if (error && !exam) {
    return (
      <div className="card">
        <div className="error">{error}</div>
        <button type="button" className="btn" onClick={() => navigate("/user/exams")}>
          Back
        </button>
      </div>
    );
  }

  if (isReading) {
    return (
      <div className="readingExamPage">
        <header className="portalTopbar">
          <div className="portalShell portalTopbarInner">
            <div className="portalBrand">
              <span className="portalLogo">
                <img className="portalLogoImg" src="/logo.png" alt="English Portal" />
              </span>
              <span>English Portal</span>
            </div>
            <nav className="portalNav">
              <button type="button" onClick={() => handleNavAttempt("/user")}>
                Home
              </button>
              <button
                type="button"
                className={practiceNavClass}
                onClick={() => handleNavAttempt("/user/practice")}
              >
                Practice
              </button>
              <button type="button" className={examNavClass} onClick={() => handleNavAttempt("/user/exams")}>
                Exams
              </button>
              <button type="button" onClick={() => handleNavAttempt("/user/profile?tab=history")}>
                History
              </button>
            </nav>
            <div className="portalActions">
              <label className="portalSearch">
                <span className="material-symbols-outlined portalIcon">search</span>
                <input type="search" placeholder="Search reading topics..." />
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

        <main className="readingExamMain">
          <div className="portalShell readingExamLayout">
            <section className="readingExamContent">
              <div className="readingExamHero">
                <span className="readingExamBadge">Reading Practice</span>
                <div className="readingExamHeroRow">
                  <h1>{exam?.title || "Reading Passage"}</h1>
                  <span className="readingExamFocus">
                    <span className="material-symbols-outlined">visibility</span>
                    Focus Mode Active
                  </span>
                </div>
              </div>

              <div className="readingExamPassageCard">
                <div className="readingExamPassageHeader">
                  <div className="readingExamPassageTitle">
                    <span className="material-symbols-outlined">menu_book</span>
                    Reading Passage
                  </div>
                  <div className="readingExamFontControls">
                    <button
                      type="button"
                      onClick={() => adjustPassageFont(-1)}
                      disabled={passageFont <= 14}
                    >
                      A-
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustPassageFont(1)}
                      disabled={passageFont >= 20}
                    >
                      A+
                    </button>
                  </div>
                </div>
                <div className="readingExamPassageBody" style={{ fontSize: `${passageFont}px` }}>
                  {passageText}
                </div>
              </div>

              <div className="readingExamQuestionCard">
                <div className="readingExamQuestionHeader">
                  <div className="readingExamQuestionBadge">
                    <span className="material-symbols-outlined">help</span>
                    Question {activeIndex + 1} of {questionCount || 0}
                  </div>
                  <div className="readingExamDots">
                    {Array.from({ length: Math.min(4, questionCount || 1) }).map((_, idx) => (
                      <span
                        key={`dot-${idx}`}
                        className={idx === activeIndex % Math.min(4, questionCount || 1) ? "is-active" : ""}
                      />
                    ))}
                  </div>
                </div>
                <h2>{currentQuestion?.content || "Question"}</h2>
                <div className="readingExamOptions">
                  {["A", "B", "C", "D"].map((k) => (
                    <label
                      key={k}
                      className={`readingExamOption ${
                        selected[currentQuestion?._id] === k ? "is-selected" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name={currentQuestion?._id}
                        checked={(selected[currentQuestion?._id] || "") === k}
                        onChange={() =>
                          setSelected((s) => ({ ...s, [currentQuestion?._id]: k }))
                        }
                      />
                      <span className="readingExamOptionKey">{k}</span>
                      <span>{currentQuestion?.options?.[k] || ""}</span>
                    </label>
                  ))}
                </div>
                <div className="readingExamActions">
                  <button
                    type="button"
                    className="readingExamGhostBtn"
                    onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                    disabled={activeIndex === 0}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="readingExamPrimaryBtn"
                    onClick={() => {
                      if (isLastQuestion) {
                        openSubmitConfirm("/user/results");
                      } else {
                        setActiveIndex((i) => Math.min(questionCount - 1, i + 1));
                      }
                    }}
                    disabled={!questionCount}
                  >
                    {isLastQuestion ? "Finish Session" : "Next Question"}
                  </button>
                </div>
              </div>
            </section>

            <aside className="readingExamSidebar">
              <div className="readingExamSideCard readingExamTimeCard">
                <span className="readingExamSideLabel">TIME REMAINING</span>
                <strong>
                  {minutes}:{seconds}
                </strong>
                <div className="readingExamTimeBar">
                  <span style={{ width: `${timeProgress}%` }} />
                </div>
              </div>

              <div className="readingExamSideCard readingExamTutorCard">
                <div className="readingExamTutorHeader">
                  <span className="material-symbols-outlined">auto_awesome</span>
                  <h4>AI Tutor Help</h4>
                </div>
                <p>Stuck on a word? Ask for a hint or a simplified explanation of the text.</p>
                <button
                  type="button"
                  className="readingExamTutorBtn"
                  onClick={() => {
                    setTutorOpen(true);
                    handleTutorExplain();
                  }}
                >
                  Ask AI Assistant
                </button>
              </div>

              <div className="readingExamSideCard readingExamReviewCard">
                <button
                  type="button"
                  className={`readingExamReviewBtn ${
                    markedQuestions[currentQuestion?._id] ? "is-marked" : ""
                  }`}
                  onClick={toggleMark}
                >
                  <span className="material-symbols-outlined">bookmark</span>
                  {markedQuestions[currentQuestion?._id] ? "Marked" : "Mark for Review"}
                </button>
              </div>

              <div className="readingExamSideCard">
                <h4>Question Map</h4>
                <div className="readingExamMapGrid">
                  {exam?.questions?.map((q, idx) => {
                    const isAnswered = Boolean(selected[q._id]);
                    const isActive = idx === activeIndex;
                    const isMarked = Boolean(markedQuestions[q._id]);
                    return (
                      <button
                        key={q._id}
                        type="button"
                        className={`readingExamMapBtn ${
                          isActive ? "is-active" : ""
                        } ${isAnswered ? "is-answered" : ""} ${
                          isMarked ? "is-marked" : ""
                        }`}
                        onClick={() => setActiveIndex(idx)}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="readingExamSideCard readingExamTipCard">
                <div className="readingExamTutorHeader">
                  <span className="material-symbols-outlined">tips_and_updates</span>
                  <h4>Reading Tip</h4>
                </div>
                <p>
                  Try to scan the passage for keywords before reading in depth. It helps you anchor
                  the main ideas.
                </p>
              </div>
            </aside>
          </div>
        </main>

        {shouldShowTutor && tutorOpen && (
          <div className="sessionTutorPanel" role="dialog" aria-label="AI Tutor">
            <div className="sessionTutorPanelHeader">
              <div>
                <h4>AI Reading Tutor</h4>
                <span>Instant explanations for this question</span>
              </div>
              <button
                type="button"
                className="sessionTutorClose"
                onClick={() => setTutorOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="sessionTutorPanelBody">
              {tutorMessages.map((msg, idx) => (
                <div
                  key={`${msg.role}-${idx}`}
                  className={`sessionTutorBubble ${
                    msg.role === "user" ? "sessionTutorBubble--user" : "sessionTutorBubble--ai"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {tutorLoading && (
                <div className="sessionTutorBubble sessionTutorBubble--ai">Thinking...</div>
              )}
              <div ref={tutorChatEndRef} />
            </div>
            {tutorError && <div className="sessionTutorError">{tutorError}</div>}
            <div className="sessionTutorPanelActions">
              <button type="button" className="sessionTutorQuick" onClick={handleTutorExplain}>
                Explain this question
              </button>
            </div>
            <div className="sessionTutorPanelInput">
              <input
                type="text"
                placeholder="Ask your tutor..."
                value={tutorInput}
                onChange={(event) => setTutorInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    sendTutorMessage(tutorInput);
                  }
                }}
                disabled={tutorLoading}
              />
              <button type="button" onClick={() => sendTutorMessage(tutorInput)} disabled={tutorLoading}>
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </div>
        )}

        {showSubmitConfirm && (
          <div className="sessionConfirmOverlay" role="dialog" aria-modal="true">
            <div className="sessionConfirmCard">
              <h3>Submit Exam?</h3>
              <p>
                {pendingRoute && pendingRoute !== "/user/results"
                  ? "You must submit your answers before leaving this page. Do you want to submit now?"
                  : "Do you want to submit your answers now?"}
              </p>
              <div className="sessionConfirmActions">
                <button type="button" className="sessionGhostBtn" onClick={handleCancelSubmit}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="sessionPrimaryBtn"
                  onClick={handleConfirmSubmit}
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Submit Exam"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isListening) {
    return (
      <div className="listeningExamPage">
        <header className="portalTopbar">
          <div className="portalShell portalTopbarInner">
            <div className="portalBrand">
              <span className="portalLogo">
                <img className="portalLogoImg" src="/logo.png" alt="English Portal" />
              </span>
              <span>English Portal</span>
            </div>
            <nav className="portalNav">
              <button type="button" onClick={() => handleNavAttempt("/user")}>
                Home
              </button>
              <button
                type="button"
                className={practiceNavClass}
                onClick={() => handleNavAttempt("/user/practice")}
              >
                Practice
              </button>
              <button type="button" className={examNavClass} onClick={() => handleNavAttempt("/user/exams")}>
                Exams
              </button>
              <button type="button" onClick={() => handleNavAttempt("/user/profile?tab=history")}>
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

        <main className="listeningMain">
          <div className="portalShell listeningLayout">
            <section className="listeningContent">
              <div className="listeningHeader">
                <div>
                  <h1>Listening Lab</h1>
                  <p>Active Session: {exam?.title || "Listening Practice"}</p>
                </div>
                <div className="listeningTrack">
                  <span>
                    Track {activeIndex + 1} of {questionCount || 0}
                  </span>
                  <div className="listeningTrackBar">
                    <span style={{ width: `${trackProgress}%` }} />
                  </div>
                </div>
                <div className="listeningTime">
                  <span>TIME REMAINING</span>
                  <strong>
                    {minutes}:{seconds}
                  </strong>
                  <div className="listeningTimeBar">
                    <span style={{ width: `${timeProgress}%` }} />
                  </div>
                </div>
              </div>

              <div className="listeningAudioCard">
                <div className="listeningWave">
                  {Array.from({ length: 24 }).map((_, idx) => (
                    <span
                      key={`wave-${idx}`}
                      style={{ height: `${30 + (idx % 7) * 6}px` }}
                    />
                  ))}
                </div>
                <audio ref={audioRef} src={audioSrc || undefined} onEnded={() => setIsPlaying(false)} />
                <button
                  type="button"
                  className="listeningPlayBtn"
                  onClick={togglePlayback}
                  disabled={!audioSrc}
                >
                  <span className="material-symbols-outlined">
                    {isPlaying ? "pause" : "play_arrow"}
                  </span>
                </button>
                <div className="listeningSpeed">
                  {[0.5, 1, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      className={`listeningSpeedBtn ${playbackRate === rate ? "is-active" : ""}`}
                      onClick={() => setPlaybackRate(rate)}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="listeningQuestionCard">
                <div className="listeningQuestionHeader">
                  <span className="listeningQuestionBadge">Question {activeIndex + 1}</span>
                  <span className="listeningQuestionTopic">{exam?.categoryId?.name || "Listening"}</span>
                </div>
                <h2>{currentQuestion?.content || "Question"}</h2>
                <div className="listeningOptions">
                  {["A", "B", "C", "D"].map((k) => (
                    <label
                      key={k}
                      className={`listeningOption ${
                        selected[currentQuestion?._id] === k ? "is-selected" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name={currentQuestion?._id}
                        checked={(selected[currentQuestion?._id] || "") === k}
                        onChange={() =>
                          setSelected((s) => ({ ...s, [currentQuestion?._id]: k }))
                        }
                      />
                      <span>{k}</span>
                      <span>{currentQuestion?.options?.[k] || ""}</span>
                    </label>
                  ))}
                </div>
                <div className="listeningActions">
                  <button type="button" className="listeningSkipBtn" onClick={handleSkip}>
                    Skip
                  </button>
                  <button
                    type="button"
                    className="listeningSubmitBtn"
                    onClick={() => {
                      if (isLastQuestion) {
                        openSubmitConfirm("/user/results");
                      } else {
                        setActiveIndex((i) => Math.min(questionCount - 1, i + 1));
                      }
                    }}
                    disabled={!questionCount}
                  >
                    {isLastQuestion ? "Finish Session" : "Submit Answer"}
                  </button>
                </div>
              </div>
            </section>

            <aside className="listeningSidebar">
              <div className="listeningSideCard">
                <div className="listeningSideHeader">
                  <span className="material-symbols-outlined">description</span>
                  <div>
                    <h4>Transcript</h4>
                    <p>Available after answering the current question.</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="listeningTranscriptBtn"
                  disabled={!canShowTranscript}
                  onClick={() => setShowTranscript((prev) => !prev)}
                >
                  {showTranscript ? "Hide Transcript" : "Show Transcript"}
                </button>
                {showTranscript && (
                  <div className="listeningTranscript">
                    {currentQuestion?.explanation || "Transcript is not available."}
                  </div>
                )}
              </div>

              <div className="listeningSideCard listeningTipCard">
                <div className="listeningSideHeader">
                  <span className="material-symbols-outlined">tips_and_updates</span>
                  <div>
                    <h4>Pro Tip</h4>
                    <p>Focus on key phrases during the first listen.</p>
                  </div>
                </div>
                <p>Consistent practice for 15 minutes daily improves retention by up to 40%.</p>
              </div>

              <button type="button" className="listeningTutorBtn" onClick={() => setTutorOpen(true)}>
                <span className="material-symbols-outlined">smart_toy</span>
                AI Tutor Help
              </button>

              <div className="listeningSideCard listeningInfoCard">
                <h4>Session Info</h4>
                <div className="listeningInfoRow">
                  <span>Difficulty</span>
                  <strong>{exam?.levelId?.name || "Intermediate"}</strong>
                </div>
                <div className="listeningInfoRow">
                  <span>Audio Duration</span>
                  <strong>{audioDurationLabel}</strong>
                </div>
                <div className="listeningInfoRow">
                  <span>Focus Skill</span>
                  <strong>Main Idea Identification</strong>
                </div>
              </div>
            </aside>
          </div>
        </main>

        {shouldShowTutor && tutorOpen && (
          <div className="sessionTutorPanel" role="dialog" aria-label="AI Tutor">
            <div className="sessionTutorPanelHeader">
              <div>
                <h4>AI Listening Tutor</h4>
                <span>Instant explanations for this question</span>
              </div>
              <button
                type="button"
                className="sessionTutorClose"
                onClick={() => setTutorOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="sessionTutorPanelBody">
              {tutorMessages.map((msg, idx) => (
                <div
                  key={`${msg.role}-${idx}`}
                  className={`sessionTutorBubble ${
                    msg.role === "user" ? "sessionTutorBubble--user" : "sessionTutorBubble--ai"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {tutorLoading && (
                <div className="sessionTutorBubble sessionTutorBubble--ai">Thinking...</div>
              )}
              <div ref={tutorChatEndRef} />
            </div>
            {tutorError && <div className="sessionTutorError">{tutorError}</div>}
            <div className="sessionTutorPanelActions">
              <button type="button" className="sessionTutorQuick" onClick={handleTutorExplain}>
                Explain this question
              </button>
            </div>
            <div className="sessionTutorPanelInput">
              <input
                type="text"
                placeholder="Ask your tutor..."
                value={tutorInput}
                onChange={(event) => setTutorInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    sendTutorMessage(tutorInput);
                  }
                }}
                disabled={tutorLoading}
              />
              <button type="button" onClick={() => sendTutorMessage(tutorInput)} disabled={tutorLoading}>
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </div>
        )}

        {showSubmitConfirm && (
          <div className="sessionConfirmOverlay" role="dialog" aria-modal="true">
            <div className="sessionConfirmCard">
              <h3>Submit Exam?</h3>
              <p>
                {pendingRoute && pendingRoute !== "/user/results"
                  ? "You must submit your answers before leaving this page. Do you want to submit now?"
                  : "Do you want to submit your answers now?"}
              </p>
              <div className="sessionConfirmActions">
                <button type="button" className="sessionGhostBtn" onClick={handleCancelSubmit}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="sessionPrimaryBtn"
                  onClick={handleConfirmSubmit}
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Submit Exam"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="practiceSessionPage">
      <header className="portalTopbar">
        <div className="portalShell portalTopbarInner">
          <div className="portalBrand">
            <span className="portalLogo">
              <img className="portalLogoImg" src="/logo.png" alt="English Portal" />
            </span>
            <span>English Portal</span>
          </div>
          <nav className="portalNav">
            <button type="button" onClick={() => handleNavAttempt("/user")}>
              Home
            </button>
            <button
              type="button"
              className={practiceNavClass}
              onClick={() => handleNavAttempt("/user/practice")}
            >
              Practice
            </button>
            <button type="button" className={examNavClass} onClick={() => handleNavAttempt("/user/exams")}>
              Exams
            </button>
            <button
              type="button"
              onClick={() => handleNavAttempt("/user/profile?tab=history")}
            >
              History
            </button>
          </nav>
          <div className="sessionTopRight">
            <div className="sessionTimerBlock">
              <span>TIME REMAINING</span>
              <strong>
                {minutes}:{seconds}
              </strong>
            </div>
            <span className="material-symbols-outlined sessionIconBtn">schedule</span>
            <button
              type="button"
              className="sessionFinishBtn"
              onClick={() => openSubmitConfirm("/user/results")}
              disabled={submitting}
            >
              Finish Session
            </button>
          </div>
        </div>
      </header>

      <main className="sessionMain">
        <div className="portalShell sessionLayout">
          <section className="sessionMainCol">
            <div className="sessionCard sessionQuestionCard">
              <div className="sessionQuestionHeader">
                <span className="sessionQuestionBadge">
                  Question {activeIndex + 1} of {questionCount || 0}
                </span>
                <span className="sessionQuestionTopic">
                  {exam?.title || exam?.category?.name || "Grammar Practice"}
                </span>
                <button type="button" className="sessionFlagBtn">
                  <span className="material-symbols-outlined">flag</span>
                  Flag
                </button>
              </div>
              <h2 className="sessionQuestionText">{currentQuestion?.content || "Question"}</h2>
              <div className="sessionOptions">
                {["A", "B", "C", "D"].map((k) => (
                  <label
                    key={k}
                    className={`sessionOption ${
                      selected[currentQuestion?._id] === k ? "is-selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name={currentQuestion?._id}
                      checked={(selected[currentQuestion?._id] || "") === k}
                      onChange={() =>
                        setSelected((s) => ({ ...s, [currentQuestion?._id]: k }))
                      }
                    />
                    <span className="sessionOptionKey">{k}</span>
                    <span>{currentQuestion?.options?.[k] || ""}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="sessionFooter">
              <button
                type="button"
                className="sessionGhostBtn"
                onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                disabled={activeIndex === 0}
              >
                <span className="material-symbols-outlined">arrow_back</span>
                Previous
              </button>
              <button type="button" className="sessionSkipBtn" onClick={handleSkip}>
                Skip
              </button>
              <button
                type="button"
                className="sessionPrimaryBtn"
                onClick={() => setActiveIndex((i) => Math.min(questionCount - 1, i + 1))}
                disabled={activeIndex === questionCount - 1}
              >
                Next Question
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>

            {shouldShowTutor && (
              <div className="sessionTutorCard">
                <div className="sessionTutorInfo">
                  <span className="material-symbols-outlined">psychology</span>
                  <div>
                    <h4>Stuck on this question?</h4>
                    <p>Get a hint or explanation from your AI Grammar Tutor.</p>
                  </div>
                </div>
                <button type="button" className="sessionTutorBtn" onClick={handleTutorExplain}>
                  <span className="material-symbols-outlined">smart_toy</span>
                  Ask AI Tutor
                </button>
              </div>
            )}
          </section>

          <aside className="sessionSidebar">
            <div className="sessionCard sessionNavigatorCard">
              <h4>Question Navigator</h4>
              <div className="sessionNavGrid">
                {exam?.questions?.map((q, idx) => {
                  const isAnswered = Boolean(selected[q._id]);
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={q._id}
                      type="button"
                      className={`sessionNavBtn ${isActive ? "is-current" : ""} ${
                        isAnswered ? "is-answered" : ""
                      }`}
                      onClick={() => setActiveIndex(idx)}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
              <div className="sessionLegend">
                <span>
                  <span className="sessionLegendDot completed" />
                  Completed
                </span>
                <span>
                  <span className="sessionLegendDot current" />
                  Current
                </span>
                <span>
                  <span className="sessionLegendDot pending" />
                  Left
                </span>
              </div>
            </div>

            <div className="sessionCard sessionPerformanceCard">
              <h4>Session Performance</h4>
              <div className="sessionRing" style={{ "--percent": accuracyDisplay }}>
                <div className="sessionRingInner">
                  <strong>{accuracyDisplay}%</strong>
                  <span>{accuracyLabel}</span>
                </div>
              </div>
              <div className="sessionPerfMeta">
                <div>
                  <span className="material-symbols-outlined">local_fire_department</span>
                  {Math.max(0, answeredCount)} Answers
                </div>
                <div>
                  <span className="material-symbols-outlined">flag</span>
                  Goal: {questionCount || 0} Questions
                </div>
              </div>
            </div>

            <div className="sessionCard sessionRuleCard">
              <div className="sessionRuleHeader">
                <span className="material-symbols-outlined">tips_and_updates</span>
                <h4>Grammar Rule</h4>
              </div>
              <p>
                {currentQuestion?.explanation ||
                  "Use Present Continuous for actions happening now. Use Present Simple for habits and general facts."}
              </p>
            </div>
          </aside>
        </div>
      </main>

      {shouldShowTutor && tutorOpen && (
        <div className="sessionTutorPanel" role="dialog" aria-label="AI Tutor">
          <div className="sessionTutorPanelHeader">
            <div>
              <h4>AI Grammar Tutor</h4>
              <span>Instant explanations for this question</span>
            </div>
            <button
              type="button"
              className="sessionTutorClose"
              onClick={() => setTutorOpen(false)}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="sessionTutorPanelBody">
            {tutorMessages.map((msg, idx) => (
              <div
                key={`${msg.role}-${idx}`}
                className={`sessionTutorBubble ${
                  msg.role === "user" ? "sessionTutorBubble--user" : "sessionTutorBubble--ai"
                }`}
              >
                {msg.content}
              </div>
            ))}
            {tutorLoading && (
              <div className="sessionTutorBubble sessionTutorBubble--ai">
                Thinking...
              </div>
            )}
            <div ref={tutorChatEndRef} />
          </div>
          {tutorError && <div className="sessionTutorError">{tutorError}</div>}
          <div className="sessionTutorPanelActions">
            <button type="button" className="sessionTutorQuick" onClick={handleTutorExplain}>
              Explain this question
            </button>
          </div>
          <div className="sessionTutorPanelInput">
            <input
              type="text"
              placeholder="Ask your tutor..."
              value={tutorInput}
              onChange={(event) => setTutorInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  sendTutorMessage(tutorInput);
                }
              }}
              disabled={tutorLoading}
            />
            <button type="button" onClick={() => sendTutorMessage(tutorInput)} disabled={tutorLoading}>
              <span className="material-symbols-outlined">send</span>
            </button>
          </div>
        </div>
      )}

      {showSubmitConfirm && (
        <div className="sessionConfirmOverlay" role="dialog" aria-modal="true">
          <div className="sessionConfirmCard">
            <h3>Submit Exam?</h3>
            <p>
              {pendingRoute && pendingRoute !== "/user/results"
                ? "You must submit your answers before leaving this page. Do you want to submit now?"
                : "Do you want to submit your answers now?"}
            </p>
            <div className="sessionConfirmActions">
              <button type="button" className="sessionGhostBtn" onClick={handleCancelSubmit}>
                Cancel
              </button>
              <button
                type="button"
                className="sessionPrimaryBtn"
                onClick={handleConfirmSubmit}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Exam"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
