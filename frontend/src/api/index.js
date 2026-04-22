import { httpJson } from "./http.js";

export const api = {
  register: (payload) => httpJson("/api/auth/register", { body: payload }),
  registerAdmin: (payload) => httpJson("/api/auth/register-admin", { body: payload }),
  promoteAdmin: (payload) => httpJson("/api/auth/promote-admin", { body: payload }),
  login: (payload) => httpJson("/api/auth/login", { body: payload }),
  googleLogin: (payload) => httpJson("/api/auth/google", { body: payload }),
  verifyGoogleLoginCode: (payload) => httpJson("/api/auth/google/verify-code", { body: payload }),
  facebookLogin: (payload) => httpJson("/api/auth/facebook", { body: payload }),
  forgotPassword: (payload) => httpJson("/api/auth/forgot-password", { body: payload }),
  verifyResetCode: (payload) => httpJson("/api/auth/verify-reset-code", { body: payload }),
  resetPassword: (payload) => httpJson("/api/auth/reset-password", { body: payload }),
  me: (token) => httpJson("/api/auth/me", { token }),

  listExams: (token, params = {}) => {
    const qs = new URLSearchParams(params);
    const query = qs.toString();
    return httpJson(`/api/exams${query ? `?${query}` : ""}`, { token });
  },
  getExam: (token, examObjectId) => httpJson(`/api/exams/${examObjectId}`, { token }),
  submitExam: (token, examObjectId, answers, timeSpent) =>
    httpJson(`/api/exams/${examObjectId}/submit`, {
      token,
      body: { answers, timeSpent }
    }),
  listPractices: (token, params = {}) => {
    const qs = new URLSearchParams(params);
    const query = qs.toString();
    return httpJson(`/api/practices${query ? `?${query}` : ""}`, { token });
  },
  getPractice: (token, practiceObjectId) =>
    httpJson(`/api/practices/${practiceObjectId}`, { token }),
  submitPractice: (token, practiceObjectId, answers, timeSpent) =>
    httpJson(`/api/practices/${practiceObjectId}/submit`, {
      token,
      body: { answers, timeSpent }
    }),

  listCategories: (token) => httpJson("/api/categories", { token }),
  listLevels: (token) => httpJson("/api/levels", { token }),
  listUsers: (token) => httpJson("/api/users", { token }),
  createUser: (token, payload) => httpJson("/api/users", { token, body: payload }),
  updateMe: (token, payload) => httpJson("/api/users/me", { token, method: "PUT", body: payload }),
  changeMyPassword: (token, payload) =>
    httpJson("/api/users/me/password", { token, method: "PUT", body: payload }),
  updateUserStatus: (token, id, isActive) =>
    httpJson(`/api/users/${id}/status`, { token, method: "PUT", body: { isActive } }),
  sendMessage: (token, receiverId, content) =>
    httpJson("/api/messages", { token, body: { receiverId, content } }),
  listMyMessages: (token) => httpJson("/api/messages/me", { token }),
  listUserMessages: (token, userId) => httpJson(`/api/messages/user/${userId}`, { token }),
  markConversationRead: (token, userId) =>
    httpJson(`/api/messages/read/${userId}`, { token, method: "PUT" }),
  askTutor: (token, payload) => httpJson("/api/ai/tutor", { token, body: payload }),
  listVocabulary: (token, params = {}) => {
    const qs = new URLSearchParams(params);
    const query = qs.toString();
    return httpJson(`/api/vocabulary${query ? `?${query}` : ""}`, { token });
  },
  getVocabularyProgress: (token, params = {}) => {
    const qs = new URLSearchParams(params);
    const query = qs.toString();
    return httpJson(`/api/vocabulary/progress${query ? `?${query}` : ""}`, { token });
  },
  trackVocabularyProgress: (token, payload) =>
    httpJson("/api/vocabulary/progress", { token, body: payload }),
  createVocabulary: (token, payload) => httpJson("/api/vocabulary", { token, body: payload }),
  updateVocabulary: (token, id, payload) =>
    httpJson(`/api/vocabulary/${id}`, { token, method: "PUT", body: payload }),
  deleteVocabulary: (token, id) =>
    httpJson(`/api/vocabulary/${id}`, { token, method: "DELETE" }),
  listTopics: (token) => httpJson("/api/topics", { token }),
  createTopic: (token, payload) => httpJson("/api/topics", { token, body: payload }),
  updateTopic: (token, id, payload) =>
    httpJson(`/api/topics/${id}`, { token, method: "PUT", body: payload }),
  deleteTopic: (token, id) =>
    httpJson(`/api/topics/${id}`, { token, method: "DELETE" }),

  getMyResults: (token) => httpJson("/api/results/me", { token }),
  getResultDetail: (token, resultObjectId) =>
    httpJson(`/api/results/${resultObjectId}`, { token }),

  // Admin
  listQuestions: (token) => httpJson("/api/questions", { token }),
  countQuestions: (token, params = {}) => {
    const qs = new URLSearchParams(params);
    const query = qs.toString();
    return httpJson(`/api/questions/count${query ? `?${query}` : ""}`, { token });
  },
  createQuestion: (token, payload) => httpJson("/api/questions", { token, body: payload }),
  updateQuestion: (token, id, payload) =>
    httpJson(`/api/questions/${id}`, { token, method: "PUT", body: payload }),
  deleteQuestion: (token, id) => httpJson(`/api/questions/${id}`, { token, method: "DELETE" }),

  createExam: (token, payload) => httpJson("/api/exams", { token, body: payload }),
  updateExam: (token, id, payload) =>
    httpJson(`/api/exams/${id}`, { token, method: "PUT", body: payload }),
  deleteExam: (token, id) => httpJson(`/api/exams/${id}`, { token, method: "DELETE" }),
  createPractice: (token, payload) => httpJson("/api/practices", { token, body: payload }),
  updatePractice: (token, id, payload) =>
    httpJson(`/api/practices/${id}`, { token, method: "PUT", body: payload }),
  deletePractice: (token, id) =>
    httpJson(`/api/practices/${id}`, { token, method: "DELETE" }),

  listAllResults: (token) => httpJson("/api/results", { token })
  ,
  adminSummary: (token) => httpJson("/api/admin/summary", { token })
};
