import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/common/Layout";
import QuestionsPage from "./pages/questions/QuestionsPage";
import QuestionDetailPage from "./pages/questions/QuestionDetailPage";
import NewQuestionPage from "./pages/questions/NewQuestionPage";
import ExamsPage from "./pages/exams/ExamsPage";
import ExamDetailPage from "./pages/exams/ExamDetailPage";
import NewExamPage from "./pages/exams/NewExamPage";
import ImportPage from "./pages/import/ImportPage";
import AuthPage from "./pages/auth/AuthPage";
import SettingsPage from "./pages/settings/SettingsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<QuestionsPage />} />
          <Route path="questions" element={<QuestionsPage />} />
          <Route path="questions/new" element={<NewQuestionPage />} />
          <Route path="questions/:id" element={<QuestionDetailPage />} />
          <Route path="exams" element={<ExamsPage />} />
          <Route path="exams/new" element={<NewExamPage />} />
          <Route path="exams/:id" element={<ExamDetailPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="auth" element={<AuthPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
