import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/auth";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    name: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isFirstUser, setIsFirstUser] = useState<boolean | null>(null);
  const [checkingFirstUser, setCheckingFirstUser] = useState(true);

  // 检查是否是第一个用户
  useEffect(() => {
    const checkFirst = async () => {
      try {
        const result = await authService.checkFirstUser();
        setIsFirstUser(result.isFirstUser);
      } catch (err) {
        console.error("Failed to check first user:", err);
        setIsFirstUser(false);
      } finally {
        setCheckingFirstUser(false);
      }
    };
    checkFirst();
  }, []);

  // 当显示注册成功消息时，3秒后自动跳转到首页（仅针对非第一用户）
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (error.includes("注册成功") && !error.includes("管理员")) {
      timer = setTimeout(() => {
        navigate("/");
      }, 3000);
    }

    // 清理定时器
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [error, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 如果已经有成功消息，点击按钮应跳转到首页
    if (error.includes("注册成功")) {
      navigate("/");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await authService.register(formData);

      // 如果返回了 access_token，说明是第一个用户（管理员），直接登录
      if (response.user) {
        localStorage.setItem("user", JSON.stringify(response.user));
        window.dispatchEvent(new Event("authChanged"));
        // 直接跳转到首页
        navigate("/");
        return;
      }

      // 普通用户注册成功，显示等待审核消息
      setError(response.message || "注册成功！");
      setFormData({ username: "", password: "", name: "" }); // 清空表单
    } catch (err: any) {
      setError(err.response?.data?.message || "注册失败");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-slatebg flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-ink-900">
            {error.includes("注册成功") ? "注册成功" : "注册账户"}
          </h2>
          <p className="mt-2 text-center text-sm text-ink-600">
            {error.includes("注册成功")
              ? "系统将在3秒后自动跳转到首页..."
              : "已有账户？"}{" "}
            <button
              onClick={() => navigate("/")}
              className="font-medium text-blue-600 hover:text-blue-500 bg-transparent border-none cursor-pointer"
            >
              返回首页
            </button>
          </p>
        </div>

        {/* 第一个用户提示 */}
        {!checkingFirstUser && isFirstUser && !error && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md">
            <div className="flex items-start">
              <svg
                className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="font-medium">系统初始化</p>
                <p className="text-sm mt-1">
                  您将成为系统的第一个用户，注册后将自动获得管理员权限，无需等待审核。
                </p>
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div
              className={`px-4 py-3 rounded ${
                error.includes("注册成功")
                  ? "bg-green-50 border border-green-200 text-green-700"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}
            >
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-ink-700"
              >
                用户名
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-ink-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="请输入用户名"
              />
            </div>
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-ink-700"
              >
                姓名
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-ink-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="请输入真实姓名"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-ink-700"
              >
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-ink-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="请输入密码"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || checkingFirstUser}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checkingFirstUser
                ? "加载中..."
                : loading
                  ? "注册中..."
                  : error.includes("注册成功")
                    ? "返回首页 (3s)"
                    : isFirstUser
                      ? "注册并成为管理员"
                      : "注册"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
