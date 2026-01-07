import { Outlet, Link } from "react-router-dom";
import {
  BookOpen,
  FileText,
  Upload,
  Settings as SettingsIcon,
} from "lucide-react";

export default function Layout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              ExamForge
            </Link>
            <div className="flex gap-6">
              <Link
                to="/questions"
                className="flex items-center gap-2 hover:text-primary"
              >
                <FileText className="h-4 w-4" />
                题库
              </Link>
              <Link
                to="/exams"
                className="flex items-center gap-2 hover:text-primary"
              >
                <BookOpen className="h-4 w-4" />
                考试
              </Link>
              <Link
                to="/import"
                className="flex items-center gap-2 hover:text-primary"
              >
                <Upload className="h-4 w-4" />
                导入
              </Link>
              <Link
                to="/settings"
                className="flex items-center gap-2 hover:text-primary"
              >
                <SettingsIcon className="h-4 w-4" />
                设置
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
