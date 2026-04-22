import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Shell from "./components/Shell.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import RoleRoute from "./routes/RoleRoute.jsx";

import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import Register from "./pages/Register.jsx";
import AdminSetup from "./pages/AdminSetup.jsx";

import UserExams from "./pages/user/Exams.jsx";
import TakeExam from "./pages/user/TakeExam.jsx";
import ResultDetail from "./pages/user/ResultDetail.jsx";
import ChangePassword from "./pages/user/ChangePassword.jsx";
import UserProfile from "./pages/user/Profile.jsx";
import Practice from "./pages/user/Practice.jsx";
import GrammarPractice from "./pages/user/GrammarPractice.jsx";
import VocabularyFlashcards from "./pages/user/VocabularyFlashcards.jsx";
import UserResults from "./pages/user/Results.jsx";

import AdminQuestions from "./pages/admin/Questions.jsx";
import AdminExams from "./pages/admin/Exams.jsx";
import AdminResults from "./pages/admin/Results.jsx";
import AdminDashboard from "./pages/admin/Dashboard.jsx";
import AdminUsers from "./pages/admin/Users.jsx";
import AdminVocabularies from "./pages/admin/Vocabularies.jsx";
import AdminTopics from "./pages/admin/Topics.jsx";
import AdminExamManager from "./pages/admin/ExamManager.jsx";
import AdminMessages from "./pages/admin/Messages.jsx";

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Navigate to="/user" replace />} />
        <Route path="/user" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin-setup" element={<AdminSetup />} />

        <Route
          path="/user/practice"
          element={
            <ProtectedRoute>
              <RoleRoute allow={["USER"]}>
                <Practice />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/grammar-practice"
          element={
            <ProtectedRoute>
              <RoleRoute allow={["USER"]}>
                <GrammarPractice />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/vocabulary-flashcards"
          element={
            <ProtectedRoute>
              <RoleRoute allow={["USER"]}>
                <VocabularyFlashcards />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/exams"
          element={
            <ProtectedRoute>
              <RoleRoute allow={["USER"]}>
                <UserExams />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/exams/:id"
          element={
            <ProtectedRoute>
              <RoleRoute allow={["USER"]}>
                <TakeExam />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/results"
          element={
            <ProtectedRoute>
              <RoleRoute allow={["USER"]}>
                <UserResults />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/results/:id"
          element={
            <ProtectedRoute>
              <RoleRoute allow={["USER"]}>
                <ResultDetail />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/change-password"
          element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/profile"
          element={
            <ProtectedRoute>
              <RoleRoute allow={["USER"]}>
                <UserProfile />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <RoleRoute allow={["ADMIN"]}>
                <AdminDashboard />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/questions"
          element={
            <ProtectedRoute>
              <RoleRoute allow={["ADMIN"]}>
                <AdminQuestions />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <RoleRoute allow={["ADMIN"]}>
                <AdminUsers />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/exams"
          element={
            <ProtectedRoute>
              <RoleRoute allow={["ADMIN"]}>
                <AdminExams />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/exam-manager"
          element={
            <ProtectedRoute>
              <RoleRoute allow={["ADMIN"]}>
                <AdminExamManager />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/vocabularies"
          element={
            <ProtectedRoute>
              <RoleRoute allow={["ADMIN"]}>
                <AdminVocabularies />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/topics"
          element={
            <ProtectedRoute>
              <RoleRoute allow={["ADMIN"]}>
                <AdminTopics />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/results"
          element={
            <ProtectedRoute>
              <RoleRoute allow={["ADMIN"]}>
                <AdminResults />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/messages"
          element={
            <ProtectedRoute>
              <RoleRoute allow={["ADMIN"]}>
                <AdminMessages />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
