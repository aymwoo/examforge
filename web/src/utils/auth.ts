export interface User {
  id: string;
  username: string;
  name: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  email?: string;
  phone?: string;
  bio?: string;
  avatar?: string;
  createdAt?: string;
}

export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem("user");
  if (!userStr) return null;

  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem("token");
  const user = getCurrentUser();
  return !!(token && user);
};

export const logout = (): void => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  // 清除考试登录信息
  localStorage.removeItem("examToken");
  localStorage.removeItem("examStudent");
  window.location.href = "/";
};

export const hasRole = (
  requiredRole: "ADMIN" | "TEACHER" | "STUDENT",
): boolean => {
  const user = getCurrentUser();
  if (!user) return false;

  // 管理员可以访问所有功能
  if (user.role === "ADMIN") return true;

  // 检查具体权限
  if (requiredRole === "TEACHER") {
    return user.role === "TEACHER";
  }

  return user.role === requiredRole;
};

export const canAccessSettings = (): boolean => {
  return hasRole("TEACHER"); // 教师和管理员可以访问设置
};

export const canAccessUserManagement = (): boolean => {
  return hasRole("ADMIN"); // 只有管理员可以访问用户管理
};
