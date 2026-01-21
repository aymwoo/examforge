import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getCurrentUser, isAuthenticated } from "../utils/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "ADMIN" | "TEACHER" | "STUDENT";
  fallbackPath?: string;
}

export default function ProtectedRoute({
  children,
  requiredRole,
  fallbackPath = "/",
}: ProtectedRouteProps) {
  const location = useLocation();

  if (!isAuthenticated()) {
    // 尽量避免闪屏：用声明式重定向
    return (
      <Navigate to={fallbackPath} replace state={{ from: location.pathname }} />
    );
  }

  const user = getCurrentUser();
  if (!user) {
    return (
      <Navigate to={fallbackPath} replace state={{ from: location.pathname }} />
    );
  }

  // 管理员可以访问所有功能
  if (user.role === "ADMIN") return <>{children}</>;

  if (!requiredRole) return <>{children}</>;

  const roleAllowed = user.role === requiredRole;

  if (!roleAllowed) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
