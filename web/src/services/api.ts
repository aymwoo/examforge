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
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Don't add auth header for dashboard endpoint (allow public access)
    if (config.url?.includes('/dashboard')) {
      return config;
    }
    
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect to /auth if we're on an exam login page or homepage login
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/exam/') || !currentPath.includes('/login')) {
        // Don't redirect if this is a login request from homepage modal
        if (error.config?.url?.includes('/auth/login') && currentPath === '/') {
          // Let the component handle the login error
          return Promise.reject(error);
        }
        localStorage.removeItem("token");
        window.location.href = "/auth";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
