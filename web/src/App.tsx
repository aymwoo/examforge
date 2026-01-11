import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/common/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import QuestionsPage from "./pages/questions/QuestionsPage";
import QuestionDetailPage from "./pages/questions/QuestionDetailPage";
import NewQuestionPage from "./pages/questions/NewQuestionPage";
import ExamsPage from "./pages/exams/ExamsPage";
import ExamDetailPage from "./pages/exams/ExamDetailPage";
import ExamStudentsPage from "./pages/exams/ExamStudentsPage";
import NewExamPage from "./pages/exams/NewExamPage";
import ImportPage from "./pages/import/ImportPage";
import ImportHistoryPage from "./pages/import/ImportHistoryPage";
import AuthPage from "./pages/auth/AuthPage";
import RegisterPage from "./pages/auth/RegisterPage";
import SettingsPage from "./pages/settings/SettingsPage";
import ExamEntryPage from "./pages/exam/ExamEntryPage";
import ExamLoginPage from "./pages/exam/ExamLoginPage";
import ExamTakePage from "./pages/exam/ExamTakePage";
import ExamGradingPageSimple from "./pages/exams/ExamGradingPageSimple";
import HomePage from "./pages/HomePage";
import UsersPage from "./pages/UsersPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="questions" element={
            <ProtectedRoute requiredRole="TEACHER">
              <QuestionsPage />
            </ProtectedRoute>
          } />
          <Route path="questions/new" element={
            <ProtectedRoute requiredRole="TEACHER">
              <NewQuestionPage />
            </ProtectedRoute>
          } />
          <Route path="questions/:id" element={
            <ProtectedRoute requiredRole="TEACHER">
              <QuestionDetailPage />
            </ProtectedRoute>
          } />
          <Route path="exams" element={
            <ProtectedRoute requiredRole="TEACHER">
              <ExamsPage />
            </ProtectedRoute>
          } />
          <Route path="exams/new" element={
            <ProtectedRoute requiredRole="TEACHER">
              <NewExamPage />
            </ProtectedRoute>
          } />
          <Route path="exams/:id" element={
            <ProtectedRoute requiredRole="TEACHER">
              <ExamDetailPage />
            </ProtectedRoute>
          } />
          <Route path="exams/:id/students" element={
            <ProtectedRoute requiredRole="TEACHER">
              <ExamStudentsPage />
            </ProtectedRoute>
          } />
          <Route path="exams/:id/analytics" element={
            <ProtectedRoute requiredRole="TEACHER">
              <ExamAnalyticsPage />
            </ProtectedRoute>
          } />
          <Route path="exams/:id/grading" element={
            <ProtectedRoute requiredRole="TEACHER">
              <ExamGradingPageSimple />
            </ProtectedRoute>
          } />
          <Route path="settings" element={
            <ProtectedRoute requiredRole="TEACHER">
              <SettingsPage />
            </ProtectedRoute>
          } />
          <Route path="users" element={
            <ProtectedRoute requiredRole="ADMIN">
              <UsersPage />
            </ProtectedRoute>
          } />
          <Route path="import" element={
            <ProtectedRoute requiredRole="TEACHER">
              <ImportPage />
            </ProtectedRoute>
          } />
          <Route path="import/history" element={
            <ProtectedRoute requiredRole="TEACHER">
              <ImportHistoryPage />
            </ProtectedRoute>
          } />
          <Route path="auth" element={<AuthPage />} />
        </Route>
        {/* 独立的认证页面 */}
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {/* 考试相关页面不使用Layout */}
        <Route path="/exam/:examId" element={<ExamEntryPage />} />
        <Route path="/exam/:examId/login" element={<ExamLoginPage />} />
        <Route path="/exam/:examId/take" element={<ExamTakePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
