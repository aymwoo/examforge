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
      localStorage.removeItem("token");
      window.location.href = "/auth";
    }
    return Promise.reject(error);
  },
);

export default api;
