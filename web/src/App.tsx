import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import Layout from "./components/common/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import QuestionsPage from "./pages/questions/QuestionsPage";
import QuestionDetailPage from "./pages/questions/QuestionDetailPage";
import NewQuestionPage from "./pages/questions/NewQuestionPage";
import ExamsPage from "./pages/exams/ExamsPage";
import ExamDetailPage from "./pages/exams/ExamDetailPage";
import ExamAnalyticsPage from "./pages/exams/ExamAnalyticsPage";
import ExamStudentsPage from "./pages/exams/ExamStudentsPage";
import NewExamPage from "./pages/exams/NewExamPage";
import ImportPage from "./pages/import/ImportPage";
import ImportHistoryPage from "./pages/import/ImportHistoryPage";
import RegisterPage from "./pages/auth/RegisterPage";
import SettingsPage from "./pages/settings/SettingsPage";
import ExamEntryPage from "./pages/exam/ExamEntryPage";
import ExamLoginPage from "./pages/exam/ExamLoginPage";
import ExamTakePage from "./pages/exam/ExamTakePage";
import ExamGradingPage from "./pages/exams/ExamGradingPage";
import HomePage from "./pages/HomePage";

import ProfilePage from "./pages/ProfilePage";
import DocsPage from "./pages/DocsPage";
import AddQuestionsPage from "./pages/exams/AddQuestionsPage";
import ExamExportPage from "./pages/exams/ExamExportPage";
import ClassesPage from "./pages/classes/ClassesPage";
import ClassDetailPage from "./pages/classes/ClassDetailPage";
import { AuthProvider } from "./contexts/AuthContext";
import GlobalLoginModal from "./components/GlobalLoginModal";
import { ToastProvider } from "./components/ui/Toast";
import StudentDashboard from "./pages/StudentDashboard";
import StudentDetailPage from "./pages/StudentDetailPage";

function App() {
  useEffect(() => {
    // 监听浏览器关闭事件
    const handleBeforeUnload = () => {
      // 清除考试登录信息
      localStorage.removeItem("examToken");
      localStorage.removeItem("examStudent");
    };

    // 监听localStorage变化（其他标签页登录/登出）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "user") {
        // 如果主登录信息发生变化，清除考试登录信息
        localStorage.removeItem("examToken");
        localStorage.removeItem("examStudent");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route
                path="student"
                element={
                  <ProtectedRoute requiredRole="STUDENT">
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="student/:id" element={<StudentDetailPage />} />
              <Route
                path="questions"
                element={
                  <ProtectedRoute requiredRole="TEACHER">
                    <QuestionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="questions/new"
                element={
                  <ProtectedRoute requiredRole="TEACHER">
                    <NewQuestionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="questions/:id"
                element={
                  <ProtectedRoute requiredRole="TEACHER">
                    <QuestionDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="questions/:id/edit"
                element={
                  <ProtectedRoute requiredRole="TEACHER">
                    <NewQuestionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="exams"
                element={
                  <ProtectedRoute requiredRole="TEACHER">
                    <ExamsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="exams/new"
                element={
                  <ProtectedRoute requiredRole="TEACHER">
                    <NewExamPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="exams/:id"
                element={
                  <ProtectedRoute requiredRole="TEACHER">
                    <ExamDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="exams/:id/students"
                element={
                  <ProtectedRoute requiredRole="TEACHER">
                    <ExamStudentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="exams/:id/analytics"
                element={
                  <ProtectedRoute requiredRole="TEACHER">
                    <ExamAnalyticsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="exams/:id/grading"
                element={
                  <ProtectedRoute requiredRole="TEACHER">
                    <ExamGradingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="exams/:id/export"
                element={
                  <ProtectedRoute requiredRole="TEACHER">
                    <ExamExportPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="exams/:id/add-questions"
                element={
                  <ProtectedRoute requiredRole="TEACHER">
                    <AddQuestionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="settings"
                element={
                  <ProtectedRoute requiredRole="TEACHER">
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="classes"
                element={
                  <ProtectedRoute requiredRole="TEACHER">
                    <ClassesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="classes/:id"
                element={
                  <ProtectedRoute requiredRole="TEACHER">
                    <ClassDetailPage />
                  </ProtectedRoute>
                }
              />

              <Route path="profile" element={<ProfilePage />} />
              <Route path="docs" element={<DocsPage />} />
              <Route
                path="import"
                element={
                  <ProtectedRoute requiredRole="TEACHER">
                    <ImportPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="import/history"
                element={
                  <ProtectedRoute requiredRole="TEACHER">
                    <ImportHistoryPage />
                  </ProtectedRoute>
                }
              />
              <Route path="auth" element={<Navigate to="/" replace />} />
            </Route>
            {/* 独立的认证页面 */}
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/register" element={<RegisterPage />} />
            {/* 考试相关页面不使用Layout */}
            <Route path="/exam/:examId" element={<ExamEntryPage />} />
            <Route path="/exam/:examId/login" element={<ExamLoginPage />} />
            <Route path="/exam/:examId/take" element={<ExamTakePage />} />
          </Routes>
          <GlobalLoginModal />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
