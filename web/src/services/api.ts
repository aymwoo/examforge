import axios from "axios";

const resolvedBaseUrl = (() => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && String(envUrl).trim()) {
    return String(envUrl).trim();
  }
  // In dev, prefer relative URLs so Vite proxy handles `/api/*`.
  // In production, relative URLs work when the app is served with the API.
  return "/";
})();

const api = axios.create({
  baseURL: resolvedBaseUrl,
  timeout: 60000, // 增加到60秒，以支持长时间的AI生成任务
  withCredentials: true,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Don't add auth header for dashboard endpoint (allow public access)
    if (config.url?.includes("/dashboard")) {
      return config;
    }

    config.withCredentials = true;
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 如果是登录请求失败，不触发全局401处理
      if (error.config?.url?.includes("/auth/login")) {
        return Promise.reject(error);
      }

      // 清除过期的token
      localStorage.removeItem("token");

      // 触发全局登录模态框
      window.dispatchEvent(
        new CustomEvent("show401Login", {
          detail: {
            config: error.config,
            error: error,
          },
        }),
      );

      // 返回一个永远不会resolve的Promise，让调用方等待重试
      return new Promise((resolve, reject) => {
        // 将resolve和reject保存到事件详情中，供重试时使用
        window.dispatchEvent(
          new CustomEvent("add401Request", {
            detail: {
              config: error.config,
              resolve,
              reject,
            },
          }),
        );
      });
    }
    return Promise.reject(error);
  },
);

export default api;
