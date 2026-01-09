import { Outlet, Link } from "react-router-dom";
import {
  BookOpen,
  FileText,
  Upload,
  Settings as SettingsIcon,
  Users,
  LogOut,
} from "lucide-react";
import { getCurrentUser, hasRole, logout } from "../../utils/auth";

export default function Layout() {
  const user = getCurrentUser();
  const canAccessSettings = hasRole('TEACHER');
  const canAccessUserManagement = hasRole('ADMIN');

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      logout();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              ExamForge
            </Link>
            <div className="flex items-center gap-6">
              {user && (
                <>
                  {canAccessSettings && (
                    <>
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
                    </>
                  )}
                  {canAccessUserManagement && (
                    <Link
                      to="/users"
                      className="flex items-center gap-2 hover:text-primary"
                    >
                      <Users className="h-4 w-4" />
                      用户管理
                    </Link>
                  )}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{user.name}</span>
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {user.role === 'ADMIN' ? '管理员' : user.role === 'TEACHER' ? '教师' : '学生'}
                      </span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
                      title="退出登录"
                    >
                      <LogOut className="h-4 w-4" />
                      退出
                    </button>
                  </div>
                </>
              )}
              {!user && (
                <Link
                  to="/login"
                  className="flex items-center gap-2 hover:text-primary"
                >
                  登录
                </Link>
              )}
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
