import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/index.js";
import { useAuth } from "../../state/AuthContext.jsx";
import "../../resultDetail.css";

export default function ResultDetail() {
  const { id } = useParams();
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tutorMessages, setTutorMessages] = useState(() => [
    {
      role: "assistant",
      content:
        "Tôi có thể giải thích từng câu hỏi, quy tắc ngữ pháp và lý do đáp án đúng hoặc sai."
    }
  ]);
  const [tutorInput, setTutorInput] = useState("");
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorError, setTutorError] = useState("");
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const tutorChatEndRef = useRef(null);
  const lastSelectedQuestionRef = useRef("");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await api.getResultDetail(token, id);
        if (alive) setData(res);
      } catch (err) {
        if (alive) setError(err.message || "Load failed");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token, id]);

  const result = data?.result || null;
  const answers = Array.isArray(data?.answers) ? data.answers : [];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const renderStateCard = (message, isError) => (
    <div className="reviewStateCard">
      <p className={isError ? "reviewStateError" : "reviewStateText"}>{message}</p>
      <Link className="reviewBackLink" to="/user/profile?tab=history">
        ← Back to history
      </Link>
    </div>
  );

  const percent = result?.total ? Math.round((result.score / result.total) * 100) : 0;
  const timeSpent = result?.timeSpent || 0;
  const timeLabel = timeSpent ? `${timeSpent}s` : "--";
  const difficulty = result?.examId?.level?.name || "Medium";

  const questionItems = useMemo(() => {
    return answers.map((answer, idx) => {
      const question = answer.questionId;
      const correctKey = question?.correctKey;
      const pick = answer.selectedKey;
      const options = question?.options || {};
      const userText = pick ? options?.[pick] || "" : "";
      const correctText = correctKey ? options?.[correctKey] || "" : "";

      return {
        id: answer._id,
        index: idx + 1,
        isCorrect: answer.isCorrect,
        question: question?.content || "",
        userAnswer: pick ? `${pick}. ${userText}` : "No answer selected",
        correctAnswer: correctKey ? `${correctKey}. ${correctText}` : "",
        explanation: question?.explanation || "",
        audioUrl: question?.audioUrl || result?.examId?.audioUrl || "",
        difficulty,
        options
      };
    });
  }, [answers, difficulty, result?.examId?.audioUrl]);

  const focusQuestion = useMemo(() => {
    return questionItems.find((item) => !item.isCorrect) || questionItems[0] || null;
  }, [questionItems]);

  useEffect(() => {
    if (selectedQuestionId || !questionItems.length) return;

    const initial = focusQuestion || questionItems[0];
    if (!initial) return;

    const key = initial.id || String(initial.index);
    setSelectedQuestionId(key);
    setSelectedQuestion(initial);
  }, [focusQuestion, questionItems, selectedQuestionId]);

  const buildTutorHistory = (nextMessage) => {
    const history = nextMessage ? [...tutorMessages, nextMessage] : [...tutorMessages];
    return history
      .filter((item) => item && (item.role === "user" || item.role === "assistant"))
      .slice(-8)
      .map((item) => ({ role: item.role, content: item.content }));
  };

  const sendTutorMessage = async (rawMessage, action, context) => {
    if (tutorLoading) return;

    const message = String(rawMessage || "").trim();
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
      const reply = data?.reply || "AI không trả về nội dung. Vui lòng thử lại.";
      setTutorMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      const fallback = "AI đang gặp sự cố. Vui lòng kiểm tra cấu hình backend và thử lại.";
      setTutorError(err.message || fallback);
      setTutorMessages((prev) => [...prev, { role: "assistant", content: fallback }]);
    } finally {
      setTutorLoading(false);
    }
  };

  const handleTutorExplain = () => {
    const target = selectedQuestion || focusQuestion;
    if (!target) return;

    const message =
      "Hãy giải thích câu hỏi này bằng tiếng Việt và chỉ ra vì sao đáp án đúng là đúng.";
    const optionLines = Object.entries(target.options || {})
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}. ${value}`)
      .join(" | ");

    sendTutorMessage(message, "Explain Answer", {
      question: target.question,
      options: optionLines || undefined,
      userAnswer: target.userAnswer,
      correctAnswer: target.correctAnswer,
      passage: target.explanation || undefined,
      audioUrl: target.audioUrl || undefined
    });
  };

  const handleSelectQuestion = (item) => {
    if (!item) return;

    const key = item.id || String(item.index);
    setSelectedQuestionId(key);
    setSelectedQuestion(item);

    if (lastSelectedQuestionRef.current !== key) {
      const optionLines = Object.entries(item.options || {})
        .filter(([, value]) => value)
        .map(([optionKey, value]) => `${optionKey}. ${value}`)
        .join("\n");

      const summary = [
        `Câu ${String(item.index).padStart(2, "0")}: ${item.question}`,
        optionLines ? `Các lựa chọn:\n${optionLines}` : null,
        `Bạn chọn: ${item.userAnswer}`,
        item.correctAnswer ? `Đáp án đúng: ${item.correctAnswer}` : null,
        item.explanation ? `Giải thích / transcript: ${item.explanation}` : null
      ]
        .filter(Boolean)
        .join("\n");

      setTutorMessages([
        {
          role: "assistant",
          content:
            "Tôi đã cập nhật ngữ cảnh của câu hỏi này. Bạn có thể bấm giải thích hoặc hỏi tiếp chi tiết hơn."
        },
        { role: "user", content: summary }
      ]);
      setTutorInput("");
      setTutorError("");
      lastSelectedQuestionRef.current = key;
    }

    const anchorId = `review-question-${item.index}`;
    requestAnimationFrame(() => {
      const el = document.getElementById(anchorId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  useEffect(() => {
    requestAnimationFrame(() => {
      tutorChatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }, [tutorMessages, tutorLoading]);

  let content = null;

  if (loading) {
    content = renderStateCard("Loading review...", false);
  } else if (error || !result) {
    content = renderStateCard(error || "Result not found.", true);
  } else {
    content = (
      <div className="reviewLayout">
        <section className="reviewLeft">
          <div className="reviewHeader">
            <div>
              <h1>Detailed Review</h1>
              <p>Review each question, see your answers, and learn from mistakes.</p>
            </div>
            <button type="button" className="reviewFilterBtn">
              <span className="material-symbols-outlined">filter_list</span>
              All Questions
            </button>
          </div>

          {questionItems.map((item) => (
            <article
              className={`reviewCard ${
                selectedQuestionId === (item.id || String(item.index)) ? "is-selected has-tutor" : ""
              }`}
              key={item.id || item.index}
              id={`review-question-${item.index}`}
              onClick={() => handleSelectQuestion(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleSelectQuestion(item);
                }
              }}
            >
              <div className="reviewCardMain">
                <div className="reviewCardHeader">
                  <span
                    className={`reviewBadge ${
                      item.isCorrect ? "reviewBadge--correct" : "reviewBadge--wrong"
                    }`}
                  >
                    QUESTION {String(item.index).padStart(2, "0")} ·{" "}
                    {item.isCorrect ? "CORRECT" : "INCORRECT"}
                  </span>
                  <span className="reviewDifficulty">Difficulty: {item.difficulty}</span>
                </div>
                <h2 className="reviewQuestion">{item.question}</h2>
                <div
                  className={`reviewAnswer ${
                    item.isCorrect ? "reviewAnswer--correct" : "reviewAnswer--wrong"
                  }`}
                >
                  <span className="material-symbols-outlined">
                    {item.isCorrect ? "check_circle" : "cancel"}
                  </span>
                  <span>{item.userAnswer}</span>
                  <span className="reviewAnswerTag">
                    {item.isCorrect ? "Correct Answer" : "Your Answer"}
                  </span>
                </div>
                {!item.isCorrect && (
                  <div className="reviewAnswer reviewAnswer--correct">
                    <span className="material-symbols-outlined">check_circle</span>
                    <span>{item.correctAnswer}</span>
                    <span className="reviewAnswerTag">Correct Answer</span>
                  </div>
                )}
                <div className="reviewExplanation">
                  <div className="reviewExplanationTitle">
                    <span className="material-symbols-outlined">menu_book</span>
                    Grammar Explanation
                  </div>
                  <p>
                    {item.explanation ||
                      "Review the grammar rule behind this question to reinforce your understanding."}
                  </p>
                </div>
              </div>

              {selectedQuestionId === (item.id || String(item.index)) && (
                <aside className="reviewTutorInline" onClick={(event) => event.stopPropagation()}>
                  <div className="reviewTutorInlineHeader">
                    <div>
                      <h4>AI Grammar Tutor</h4>
                      <span>Online now</span>
                    </div>
                  </div>
                  <div className="reviewTutorChat">
                    {tutorMessages.map((msg, idx) => (
                      <div
                        key={`${msg.role}-${idx}`}
                        className={`reviewTutorBubble ${
                          msg.role === "user" ? "is-user" : "is-ai"
                        }`}
                      >
                        {msg.content}
                      </div>
                    ))}
                    {tutorLoading && <div className="reviewTutorBubble is-ai">Thinking...</div>}
                    <div ref={tutorChatEndRef} />
                  </div>
                  {tutorError && <div className="reviewTutorError">{tutorError}</div>}
                  <div className="reviewTutorActions">
                    <button type="button" className="reviewTutorQuick" onClick={handleTutorExplain}>
                      Explain this question
                    </button>
                  </div>
                  <div className="reviewTutorInput">
                    <input
                      type="text"
                      placeholder="Ask a question..."
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
                    <button
                      type="button"
                      onClick={() => sendTutorMessage(tutorInput)}
                      disabled={tutorLoading}
                    >
                      <span className="material-symbols-outlined">send</span>
                    </button>
                  </div>
                </aside>
              )}
            </article>
          ))}
        </section>

        <aside className="reviewRight">
          <div className="reviewSummaryCard">
            <h3>Results Summary</h3>
            <div className="reviewRing" style={{ "--percent": percent }}>
              <div className="reviewRingInner">
                <strong>
                  {result.score}/{result.total}
                </strong>
                <span>Score</span>
              </div>
            </div>
            <div className="reviewSummaryMeta">
              <div>
                <span className="material-symbols-outlined">schedule</span>
                {timeLabel} time taken
              </div>
              <div>
                <span className="material-symbols-outlined">bar_chart</span>
                {percent}% accuracy
              </div>
            </div>
          </div>

          <div className="reviewNavigatorCard">
            <h4>Question Navigator</h4>
            <div className="reviewNavGrid">
              {questionItems.map((item) => {
                const isSelected = selectedQuestionId === (item.id || String(item.index));
                return (
                  <button
                    key={item.id || item.index}
                    type="button"
                    className={`reviewNavItem ${
                      item.isCorrect ? "reviewNavItem--correct" : "reviewNavItem--wrong"
                    } ${isSelected ? "is-selected" : ""}`}
                    onClick={() => handleSelectQuestion(item)}
                  >
                    {item.index}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    );
  }

  return (
    <div className="portalPage reviewPage">
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

      <main className="portalMain reviewMain">
        <div className="portalShell">
          {content}
          {!loading && !error && result && (
            <div className="reviewFooter">
              <Link className="reviewBackLink" to="/user/profile?tab=history">
                ← Back to history
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
