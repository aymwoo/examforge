import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { LogIn, UserPlus } from "lucide-react";
import Button from "@/components/ui/Button";
import api from "@/services/api";

interface ExamInfo {
  id: string;
  title: string;
  description?: string;
  duration: number;
  accountModes: string[];
}

export default function ExamLoginPage() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<ExamInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [submitting, setSubmitting] = useState(false);

  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
  });

  const [registerForm, setRegisterForm] = useState({
    studentName: "",
    password: "",
  });

  const [showPasswordReminder, setShowPasswordReminder] = useState(false);
  const [registeredPassword, setRegisteredPassword] = useState("");

  useEffect(() => {
    loadExamInfo();
  }, [examId]);

  const loadExamInfo = async () => {
    if (!examId) return;

    setLoading(true);
    try {
      const response = await api.get(`/api/exams/${examId}`);
      setExam(response.data);

      // 根据账号模式设置默认模式
      const accountModes = response.data.accountModes || [];
      if (accountModes.includes("TEMPORARY_REGISTER")) {
        setMode("register"); // 如果支持注册，默认显示注册
      } else {
        setMode("login"); // 否则显示登录
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "加载考试信息失败");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!loginForm.username || !loginForm.password) {
      setError("请输入用户名和密码");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await api.post("/api/auth/exam-login", {
        examId,
        username: loginForm.username,
        password: loginForm.password,
      });

      // 保存token
      localStorage.setItem("examToken", response.data.token);
      localStorage.setItem(
        "examStudent",
        JSON.stringify(response.data.student),
      );

      // 跳转到考试页面
      navigate(`/exam/${examId}/take`);
    } catch (err: any) {
      const serverMessage = err.response?.data?.message;
      setError(
        serverMessage ||
          "登录失败，请确认账号已导入到本次考试，或联系老师导入班级学生。",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async () => {
    if (!registerForm.studentName || !registerForm.password) {
      setError("请输入姓名和密码");
      return;
    }

    if (registerForm.password.length < 6) {
      setError("密码长度至少6位");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 直接尝试注册/登录（后端会自动处理已存在账号的情况）
      const response = await api.post("/api/auth/exam-register", {
        examId,
        studentName: registerForm.studentName,
        password: registerForm.password,
      });

      // 保存token
      localStorage.setItem("examToken", response.data.token);
      localStorage.setItem(
        "examStudent",
        JSON.stringify(response.data.student),
      );

      // 如果是新注册，显示密码提醒；如果是登录，直接进入考试
      if (response.data.isNewAccount !== false) {
        setRegisteredPassword(registerForm.password);
        setShowPasswordReminder(true);
      } else {
        navigate(`/exam/${examId}/take`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "操作失败");
    } finally {
      setSubmitting(false);
    }
  };

  const proceedToExam = () => {
    navigate(`/exam/${examId}/take`);
  };

  if (loading) {
    return (
      <div className="bg-slatebg text-ink-900 antialiased min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-ink-700">加载中...</p>
        </div>
      </div>
    );
  }

  if (error && !exam) {
    return (
      <div className="bg-slatebg text-ink-900 antialiased min-h-screen flex items-center justify-center">
        <div className="rounded-2xl border border-border bg-white p-6 text-center max-w-md">
          <p className="text-ink-900 mb-4">{error}</p>
          <Button onClick={() => navigate("/")}>返回首页</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slatebg text-ink-900 antialiased min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-border bg-white p-8 shadow-soft">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold text-ink-900 mb-2">
              {exam?.title}
            </h1>
            {exam?.description && (
              <p className="text-ink-700 text-sm">{exam.description}</p>
            )}
            <p className="text-ink-600 text-xs mt-2">
              考试时长：{exam?.duration} 分钟
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-center">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* 密码提醒界面 */}
          {showPasswordReminder && (
            <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-center">
              <h3 className="text-lg font-semibold text-green-800 mb-3">
                注册成功！
              </h3>
              <p className="text-green-700 text-sm mb-3">
                请记住您的登录信息：
              </p>
              <div className="bg-white rounded-lg p-3 mb-4 border border-green-200">
                <p className="text-sm text-ink-700 mb-1">
                  <strong>用户名：</strong>
                  {exam?.title.substring(0, 2)}_{registerForm.studentName}
                </p>
                <p className="text-sm text-ink-700">
                  <strong>密码：</strong>
                  <span className="font-mono bg-yellow-100 px-2 py-1 rounded">
                    {registeredPassword}
                  </span>
                </p>
              </div>
              <p className="text-xs text-green-600 mb-4">
                请截图保存或记住上述信息，以便下次登录使用
              </p>
              <Button onClick={proceedToExam} className="w-full">
                我已记住，进入考试
              </Button>
            </div>
          )}

          {/* 只有在没有显示密码提醒时才显示登录表单 */}
          {!showPasswordReminder && (
            <>
              {/* 模式切换 */}
              {(exam?.accountModes?.includes("TEMPORARY_REGISTER") ||
                exam?.accountModes?.includes("TEMPORARY_IMPORT")) && (
                <div className="mb-6 flex rounded-xl border border-border bg-slate-50 p-1">
                  <button
                    onClick={() => setMode("login")}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                      mode === "login"
                        ? "bg-white text-ink-900 shadow-sm"
                        : "text-ink-600 hover:text-ink-900"
                    }`}
                  >
                    已有账号
                  </button>
                  {exam?.accountModes?.includes("TEMPORARY_REGISTER") && (
                    <button
                      onClick={() => setMode("register")}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                        mode === "register"
                          ? "bg-white text-ink-900 shadow-sm"
                          : "text-ink-600 hover:text-ink-900"
                      }`}
                    >
                      临时账号登录
                    </button>
                  )}
                </div>
              )}

              {/* 登录表单 */}
              {mode === "login" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-ink-900 mb-2">
                      用户名
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900"
                      value={loginForm.username}
                      onChange={(e) =>
                        setLoginForm((prev) => ({
                          ...prev,
                          username: e.target.value,
                        }))
                      }
                      placeholder={
                        exam?.accountModes?.includes("PERMANENT")
                          ? "请输入学号"
                          : "请输入用户名"
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-ink-900 mb-2">
                      密码
                    </label>
                    <input
                      type="password"
                      className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900"
                      value={loginForm.password}
                      onChange={(e) =>
                        setLoginForm((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      placeholder="请输入密码"
                    />
                  </div>
                  <Button
                    onClick={handleLogin}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <LogIn className="h-4 w-4" />
                    {submitting ? "登录中..." : "登录考试"}
                  </Button>
                </div>
              )}

              {/* 注册表单 */}
              {mode === "register" &&
                exam?.accountModes?.includes("TEMPORARY_REGISTER") && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-ink-900 mb-2">
                        姓名
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900"
                        value={registerForm.studentName}
                        onChange={(e) =>
                          setRegisterForm((prev) => ({
                            ...prev,
                            studentName: e.target.value,
                          }))
                        }
                        placeholder="请输入您的姓名"
                      />
                      {registerForm.studentName && (
                        <p className="mt-1 text-xs text-ink-600">
                          如果不在名册中，用户名将自动生成为：
                          {exam.title.substring(0, 2)}_
                          {registerForm.studentName}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ink-900 mb-2">
                        密码
                      </label>
                      <input
                        type="password"
                        className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900"
                        value={registerForm.password}
                        onChange={(e) =>
                          setRegisterForm((prev) => ({
                            ...prev,
                            password: e.target.value,
                          }))
                        }
                        placeholder="请设置登录密码（至少6位）"
                      />
                    </div>
                    <Button
                      onClick={handleRegister}
                      disabled={submitting}
                      className="w-full flex items-center justify-center gap-2"
                    >
                      <UserPlus className="h-4 w-4" />
                      {submitting ? "登录中..." : "进入考试"}
                    </Button>
                    <p className="mt-3 text-xs text-ink-600 text-center">
                      首次登录将保存账号密码为这次考试的临时记录
                    </p>
                  </div>
                )}
            </>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate("/")}
              className="text-sm text-ink-600 hover:text-ink-900"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
