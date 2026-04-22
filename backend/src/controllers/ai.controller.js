const fs = require("fs");
const path = require("path");
const Result = require("../models/result.model");

const KNOWLEDGE_PATH = path.join(__dirname, "..", "..", "data", "tutor_knowledge.md");
const STOPWORDS = new Set([
  "la",
  "va",
  "voi",
  "cua",
  "cho",
  "mot",
  "nhung",
  "tren",
  "duoi",
  "tai",
  "nay",
  "do",
  "duoc",
  "khi",
  "neu",
  "vi",
  "the",
  "you",
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
  "from",
  "are",
  "was",
  "were",
  "is",
  "to"
]);

const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const normalizeBaseUrl = (value = "") => String(value || "").trim().replace(/\/+$/, "");

const normalizeGeminiModel = (value = "") => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return trimmed.startsWith("models/") ? trimmed : `models/${trimmed}`;
};

const normalizeGeminiApiBaseUrl = (value = "") => {
  const normalized = normalizeBaseUrl(value);
  if (/generativelanguage\.googleapis\.com/i.test(normalized)) {
    if (/\/v1$/i.test(normalized)) return normalized.replace(/\/v1$/i, "/v1beta");
    if (!/\/v1beta$/i.test(normalized)) return `${normalized}/v1beta`;
  }
  return normalized;
};

const normalizeText = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const splitKnowledgeSections = (content = "") =>
  String(content || "")
    .split(/\n\s*\n/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

const scoreSection = (section = "", terms = [], fullQuery = "") => {
  if (!section || !terms.length) return 0;

  const haystack = normalizeText(section);
  let score = 0;

  if (fullQuery && haystack.includes(normalizeText(fullQuery))) {
    score += 3;
  }

  terms.forEach((term) => {
    if (term.length < 3 || STOPWORDS.has(term)) return;
    if (haystack.includes(term)) score += 1;
  });

  return score;
};

const summarizeResults = (results = []) => {
  if (!results.length) {
    return {
      summary: "Chưa có dữ liệu luyện tập.",
      stats: {}
    };
  }

  const categoryCounts = {};
  let totalAttempts = 0;
  let totalAccuracy = 0;
  let accuracyCount = 0;

  results.forEach((item) => {
    const category = String(item.examCategoryName || "General").trim();
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    totalAttempts += 1;

    const total = toNumber(item.total, 0);
    const score = toNumber(item.score, 0);
    if (total > 0) {
      totalAccuracy += score / total;
      accuracyCount += 1;
    }
  });

  const sortedCategories = Object.entries(categoryCounts).sort((a, b) => a[1] - b[1]);
  const weakest = sortedCategories[0]?.[0] || "";
  const strongest = sortedCategories[sortedCategories.length - 1]?.[0] || "";
  const avgAccuracy = accuracyCount ? Math.round((totalAccuracy / accuracyCount) * 100) : null;
  const latest = results[0];

  const summaryParts = [
    `Tổng số phiên: ${totalAttempts}.`,
    avgAccuracy !== null ? `Độ chính xác trung bình: ${avgAccuracy}%.` : null,
    strongest ? `Kỹ năng làm tốt nhất: ${strongest}.` : null,
    weakest && weakest !== strongest ? `Kỹ năng cần cải thiện: ${weakest}.` : null,
    latest
      ? `Phiên gần nhất: ${latest.examCategoryName || "General"} (${toNumber(
          latest.score,
          0
        )}/${toNumber(latest.total, 0)}).`
      : null
  ].filter(Boolean);

  return {
    summary: summaryParts.join(" "),
    stats: {
      totalAttempts,
      avgAccuracy,
      strongest,
      weakest,
      categoryCounts
    }
  };
};

const buildContextText = (context = {}) => {
  if (!context || typeof context !== "object") return "";

  const fragments = [];
  if (context.question) fragments.push(`Câu hỏi: ${context.question}`);
  if (context.options) fragments.push(`Lựa chọn: ${context.options}`);
  if (context.userAnswer) fragments.push(`Câu trả lời của học viên: ${context.userAnswer}`);
  if (context.correctAnswer) fragments.push(`Đáp án đúng: ${context.correctAnswer}`);
  if (context.passage) fragments.push(`Đoạn văn / giải thích: ${context.passage}`);
  if (context.selection) fragments.push(`Phần được bôi đen: ${context.selection}`);
  if (context.audioUrl) fragments.push(`Audio liên quan: ${context.audioUrl}`);

  return fragments.join(" | ");
};

const buildInsightText = (insight = {}) => {
  if (!insight || typeof insight !== "object") return "";

  const strongest = String(insight.strongest || "").trim();
  const weakest = String(insight.weakest || "").trim();
  if (!strongest && !weakest) return "";

  if (strongest && weakest && strongest !== weakest) {
    return `Điểm mạnh hiện tại: ${strongest}. Điểm cần cải thiện: ${weakest}.`;
  }

  return `Xu hướng luyện tập hiện tại tập trung vào: ${strongest || weakest}.`;
};

const pickKnowledgeSnippets = (query = "") => {
  if (!query) return [];

  let content = "";
  try {
    content = fs.readFileSync(KNOWLEDGE_PATH, "utf8");
  } catch {
    return [];
  }

  const terms = normalizeText(query)
    .split(" ")
    .filter((term) => term && term.length >= 3 && !STOPWORDS.has(term));

  if (!terms.length) return [];

  const sections = splitKnowledgeSections(content);
  const ranked = sections
    .map((section) => ({
      section,
      score: scoreSection(section, terms, query)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return ranked.map((item) => {
    if (item.section.length <= 700) return item.section;
    return `${item.section.slice(0, 700)}...`;
  });
};

const normalizeHistory = (history) =>
  Array.isArray(history)
    ? history
        .filter((item) => item && (item.role === "user" || item.role === "assistant"))
        .map((item) => ({
          role: item.role,
          content: String(item.content || "").trim()
        }))
        .filter((item) => item.content)
        .slice(-8)
    : [];

const parseErrorText = async (response) => {
  const text = await response.text();
  if (!text) {
    return {
      message: `AI provider error (${response.status})`,
      statusText: ""
    };
  }

  try {
    const parsed = JSON.parse(text);
    return {
      message: parsed?.error?.message || parsed?.message || text,
      statusText: parsed?.error?.status || ""
    };
  } catch {
    return {
      message: text,
      statusText: ""
    };
  }
};

const callOpenAIStyle = async ({
  baseUrl,
  apiKey,
  model,
  systemPrompt,
  history,
  message,
  temperature,
  maxTokens
}) => {
  const payload = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message }
    ],
    temperature,
    max_tokens: maxTokens
  };

  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const { message: errorMessage } = await parseErrorText(response);
    const error = new Error(errorMessage);
    error.statusCode = response.status;
    throw error;
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content;

  if (!reply) {
    const error = new Error("AI không trả về nội dung.");
    error.statusCode = 502;
    throw error;
  }

  return {
    reply,
    usage: data?.usage || null
  };
};

const shouldFallbackToOpenAI = (statusCode, message, statusText) => {
  if ([429, 500, 502, 503, 504].includes(statusCode)) {
    return true;
  }

  const haystack = `${message || ""} ${statusText || ""}`.toLowerCase();
  return (
    haystack.includes("quota") ||
    haystack.includes("resource_exhausted") ||
    haystack.includes("rate limit") ||
    haystack.includes("unavailable") ||
    haystack.includes("overloaded")
  );
};

const callGemini = async ({
  baseUrl,
  apiKey,
  model,
  systemPrompt,
  history,
  message,
  temperature,
  maxTokens
}) => {
  const geminiBaseUrl = normalizeGeminiApiBaseUrl(baseUrl);
  const url = `${geminiBaseUrl}/${normalizeGeminiModel(model)}:generateContent?key=${apiKey}`;
  const payload = {
    system_instruction: {
      parts: [{ text: systemPrompt }]
    },
    contents: [
      ...history.map((item) => ({
        role: item.role === "assistant" ? "model" : "user",
        parts: [{ text: item.content }]
      })),
      {
        role: "user",
        parts: [{ text: message }]
      }
    ],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const { message: errorMessage, statusText } = await parseErrorText(response);
    const error = new Error(errorMessage);
    error.statusCode = response.status;
    error.providerStatus = statusText;
    throw error;
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const reply = parts
    .map((part) => part?.text || "")
    .join("")
    .trim();

  if (!reply) {
    const blockReason = data?.promptFeedback?.blockReason;
    const error = new Error(
      blockReason
        ? `Yêu cầu bị AI chặn (${blockReason}).`
        : "AI không trả về nội dung."
    );
    error.statusCode = 502;
    throw error;
  }

  return {
    reply,
    usage: data?.usageMetadata || null
  };
};

exports.tutorChat = async (req, res) => {
  try {
    const { message, history, action, context, insight } = req.body || {};
    const trimmedMessage = String(message || "").trim();

    if (!trimmedMessage) {
      return res.status(400).json({ message: "Thiếu nội dung câu hỏi." });
    }

    const baseUrl = process.env.AI_BASE_URL;
    const apiKey = process.env.AI_API_KEY;
    const model = process.env.AI_MODEL;

    if (!baseUrl || !apiKey || !model) {
      return res.status(503).json({
        message:
          "AI chưa được cấu hình. Vui lòng thiết lập AI_BASE_URL, AI_API_KEY và AI_MODEL trong backend/.env."
      });
    }

    const provider = String(process.env.AI_PROVIDER || "").toLowerCase();
    const isGemini =
      provider.includes("gemini") ||
      /generativelanguage\.googleapis\.com/i.test(baseUrl);

    const results = await Result.find({ userId: req.user._id })
      .select("examCategoryName score total submittedAt")
      .sort({ submittedAt: -1 })
      .limit(50);

    const { summary } = summarizeResults(results);
    const contextText = buildContextText(context);
    const insightText = buildInsightText(insight);

    const knowledgeQuery = [
      trimmedMessage,
      action,
      context?.question,
      context?.selection,
      context?.passage
    ]
      .filter(Boolean)
      .join(" ");
    const knowledgeSnippets = pickKnowledgeSnippets(knowledgeQuery);

    const systemPrompt = [
      "Bạn là trợ lý học tiếng Anh cho học viên Việt Nam.",
      "Luôn trả lời bằng tiếng Việt rõ ràng, ngắn gọn, dễ hiểu.",
      "Ưu tiên giải thích theo ngữ cảnh câu hỏi hiện tại thay vì trả lời chung chung.",
      "Nếu học viên gửi câu hoặc đoạn văn, hãy sửa lỗi rồi giải thích lý do.",
      "Nếu học viên hỏi về từ vựng, hãy nêu nghĩa, cách dùng, collocation và ví dụ ngắn.",
      "Nếu học viên hỏi về ngữ pháp, hãy giải thích quy tắc, dấu hiệu nhận biết và ví dụ.",
      "Nếu đang phân tích câu hỏi trắc nghiệm, hãy chỉ ra vì sao đáp án đúng đúng và các đáp án còn lại sai.",
      "Nếu dữ liệu học tập chưa đủ, hãy nói rõ là chưa đủ dữ liệu thay vì suy đoán.",
      `Dữ liệu luyện tập gần đây: ${summary}`,
      insightText ? `Insight từ giao diện: ${insightText}` : null,
      knowledgeSnippets.length
        ? `Tài liệu tham khảo nội bộ: ${knowledgeSnippets.join(" || ")}`
        : null,
      action ? `Tác vụ ưu tiên: ${action}.` : null,
      contextText ? `Ngữ cảnh bổ sung: ${contextText}.` : null
    ]
      .filter(Boolean)
      .join(" ");

    const safeHistory = normalizeHistory(history);
    const historyWithoutLatest = [...safeHistory];
    const latestHistory = historyWithoutLatest[historyWithoutLatest.length - 1];

    if (
      latestHistory &&
      latestHistory.role === "user" &&
      latestHistory.content === trimmedMessage
    ) {
      historyWithoutLatest.pop();
    }

    const temperature = toNumber(process.env.AI_TEMPERATURE, 0.3);
    const maxTokens = toNumber(process.env.AI_MAX_TOKENS, 600);

    if (isGemini) {
      try {
        const data = await callGemini({
          baseUrl,
          apiKey,
          model,
          systemPrompt,
          history: historyWithoutLatest,
          message: trimmedMessage,
          temperature,
          maxTokens
        });

        return res.json({
          reply: data.reply,
          usage: data.usage
        });
      } catch (err) {
        const fallbackBaseUrl = process.env.AI_FALLBACK_BASE_URL;
        const fallbackKey = process.env.AI_FALLBACK_API_KEY;
        const fallbackModel = process.env.AI_FALLBACK_MODEL;
        const canFallback = fallbackBaseUrl && fallbackKey && fallbackModel;

        if (canFallback && shouldFallbackToOpenAI(err.statusCode, err.message, err.providerStatus)) {
          try {
            const fallback = await callOpenAIStyle({
              baseUrl: fallbackBaseUrl,
              apiKey: fallbackKey,
              model: fallbackModel,
              systemPrompt,
              history: historyWithoutLatest,
              message: trimmedMessage,
              temperature,
              maxTokens
            });

            return res.json({
              reply: fallback.reply,
              usage: fallback.usage,
              fallback: "openai-style"
            });
          } catch (fallbackErr) {
            return res.status(fallbackErr.statusCode || 502).json({
              message: fallbackErr.message
            });
          }
        }

        return res.status(err.statusCode || 502).json({ message: err.message });
      }
    }

    try {
      const data = await callOpenAIStyle({
        baseUrl,
        apiKey,
        model,
        systemPrompt,
        history: historyWithoutLatest,
        message: trimmedMessage,
        temperature,
        maxTokens
      });

      return res.json({
        reply: data.reply,
        usage: data.usage
      });
    } catch (err) {
      return res.status(err.statusCode || 502).json({ message: err.message });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message || "AI server error" });
  }
};
