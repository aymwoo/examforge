import { Outlet, Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  FileText,
  Upload,
  Settings as SettingsIcon,
  Users,
  LogOut,
  User,
  ChevronDown,
  Home,
  HelpCircle,
} from "lucide-react";
import { getCurrentUser, hasRole, logout } from "../../utils/auth";

export default function Layout() {
  const [user, setUser] = useState(() => getCurrentUser());
  const canAccessSettings = hasRole("TEACHER");

  useEffect(() => {
    const syncUser = () => {
      setUser(getCurrentUser());
    };

    window.addEventListener("storage", syncUser);
    window.addEventListener("authChanged", syncUser as EventListener);

    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("authChanged", syncUser as EventListener);
    };
  }, []);

  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    if (confirm("确定要退出登录吗？")) {
      logout();
    }
  };

  const getRoleName = (role: string) => {
    const roleMap: Record<string, string> = {
      ADMIN: "系统管理员",
      TEACHER: "教师",
      STUDENT: "学生",
    };
    return roleMap[role] || role;
  };

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-white shadow-sm">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between min-h-[72px]">
            <Link
              to={user?.role === "STUDENT" ? `/student/${user.username}` : "/"}
              className="text-xl font-bold flex items-center gap-3"
            >
              <div className="h-16 w-16 overflow-hidden rounded-lg bg-white shadow-sm border border-gray-200 flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="ExamForge Logo"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span>ExamForge</span>
                <span className="text-xs text-gray-500 font-normal">
                  智考工坊
                </span>
              </div>
            </Link>
            <div className="flex items-center gap-6">
              {user && (
                <>
                  {canAccessSettings && (
                    <>
                      <Link
                        to="/"
                        className="flex items-center gap-2 hover:text-primary"
                      >
                        <Home className="h-4 w-4" />
                        首页
                      </Link>
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
                        to="/classes"
                        className="flex items-center gap-2 hover:text-primary"
                      >
                        <Users className="h-4 w-4" />
                        班级
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

                  <Link
                    to="/docs"
                    className="flex items-center gap-2 hover:text-primary"
                  >
                    <HelpCircle className="h-4 w-4" />
                    文档
                  </Link>
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() =>
                        setShowProfileDropdown(!showProfileDropdown)
                      }
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                        {user.name?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium text-gray-900">
                          {user.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {getRoleName(user.role)}
                        </div>
                      </div>
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </button>

                    {/* 个人资料下拉菜单 */}
                    {showProfileDropdown && (
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-lg font-semibold">
                              {user.name?.charAt(0)?.toUpperCase() || "U"}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {user.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {user.email || "未设置邮箱"}
                              </div>
                              <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded mt-1 inline-block">
                                {getRoleName(user.role)}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="py-2">
                          <Link
                            to="/profile"
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            onClick={() => setShowProfileDropdown(false)}
                          >
                            <User className="h-4 w-4" />
                            个人资料设置
                          </Link>
                        </div>

                        <div className="border-t border-gray-100 pt-2">
                          <button
                            onClick={handleLogout}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <LogOut className="h-4 w-4" />
                            退出登录
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
              {!user && (
                <div className="flex items-center gap-4">
                  <Link
                    to="/register"
                    className="flex items-center gap-2 hover:text-primary"
                  >
                    注册
                  </Link>
                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("show401Login"));
                    }}
                    className="flex items-center gap-2 hover:text-primary"
                  >
                    登录
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8 pt-20">
        <Outlet />
      </main>
    </div>
  );
}
