import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import { authService } from "../services/auth";
import { useAuth } from "../contexts/AuthContext";

export default function GlobalLoginModal() {
  const {
    showGlobalLogin,
    setShowGlobalLogin,
    addPendingRequest,
    retryPendingRequests,
    clearPendingRequests,
  } = useAuth();
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const addPendingRequestRef = useRef<typeof addPendingRequest | undefined>(
    undefined,
  );

  // 更新 ref 当函数改变时
  useEffect(() => {
    addPendingRequestRef.current = addPendingRequest;
  }, [addPendingRequest]);

  useEffect(() => {
    const handleShow401Login = () => {
      setShowGlobalLogin(true);
    };

    const handleAdd401Request = (event: CustomEvent) => {
      const { config, resolve, reject } = event.detail;
      if (addPendingRequestRef.current) {
        addPendingRequestRef.current({ config, resolve, reject });
      }
    };

    window.addEventListener("show401Login", handleShow401Login);
    window.addEventListener(
      "add401Request",
      handleAdd401Request as EventListener,
    );

    return () => {
      window.removeEventListener("show401Login", handleShow401Login);
      window.removeEventListener(
        "add401Request",
        handleAdd401Request as EventListener,
      );
    };
  }, [setShowGlobalLogin]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    try {
      const response = await authService.login(loginForm);
      localStorage.setItem("user", JSON.stringify(response.user));
      window.dispatchEvent(new Event("authChanged"));

      // 重试之前失败的请求
      await retryPendingRequests();

      // 根据用户角色跳转
      if (response.user.role === "STUDENT") {
        window.location.href = `/student/${response.user.username}`;
      }

      setShowGlobalLogin(false);
      setLoginForm({ username: "", password: "" });
    } catch (err: any) {
      setLoginError(err.response?.data?.message || "登录失败");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleClose = () => {
    setShowGlobalLogin(false);
    setLoginError("");
    setLoginForm({ username: "", password: "" });
    clearPendingRequests();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginForm({
      ...loginForm,
      [e.target.name]: e.target.value,
    });
  };

  if (!showGlobalLogin) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">需要登录</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="关闭登录弹窗"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-gray-600 mb-4">
          您的登录已过期，请重新登录以继续操作
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          {loginError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {loginError}
            </div>
          )}

          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              用户名
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              value={loginForm.username}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入用户名"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              密码
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={loginForm.password}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入密码"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={loginLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {loginLoading ? "登录中..." : "登录"}
            </Button>
          </div>

          <div className="text-center text-sm text-gray-600 pt-2">
            还没有账户？{" "}
            <Link
              to="/register"
              className="text-blue-600 hover:text-blue-500 font-medium"
              onClick={handleClose}
            >
              立即注册
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
