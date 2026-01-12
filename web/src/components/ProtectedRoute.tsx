import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated, getCurrentUser } from '../utils/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'ADMIN' | 'TEACHER' | 'STUDENT';
  fallbackPath?: string;
}

export default function ProtectedRoute({ 
  children, 
  requiredRole, 
  fallbackPath = '/' 
}: ProtectedRouteProps) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate(fallbackPath);
      return;
    }

    if (requiredRole) {
      const user = getCurrentUser();
      if (!user) {
        navigate(fallbackPath);
        return;
      }

      // 管理员可以访问所有功能
      if (user.role === 'ADMIN') return;

      // 检查具体权限
      if (requiredRole === 'TEACHER' && user.role !== 'TEACHER') {
        navigate('/');
        return;
      }

      if (requiredRole === 'STUDENT' && user.role !== 'STUDENT') {
        navigate('/');
        return;
      }

      if (requiredRole !== user.role) {
        navigate('/');
        return;
      }
    }
  }, [navigate, requiredRole, fallbackPath]);

  if (!isAuthenticated()) {
    return null;
  }

  if (requiredRole) {
    const user = getCurrentUser();
    if (!user) return null;

    // 管理员可以访问所有功能
    if (user.role === 'ADMIN') return <>{children}</>;

    // 检查具体权限
    if (requiredRole === 'TEACHER' && user.role !== 'TEACHER') {
      return (
        <div className="min-h-screen bg-slatebg flex items-center justify-center">
          <div className="bg-white rounded-xl p-8 text-center max-w-md">
            <h2 className="text-xl font-semibold text-ink-900 mb-4">权限不足</h2>
            <p className="text-ink-600 mb-6">您需要教师权限才能访问此页面</p>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              返回首页
            </button>
          </div>
        </div>
      );
    }

    if (requiredRole !== user.role) {
      return (
        <div className="min-h-screen bg-slatebg flex items-center justify-center">
          <div className="bg-white rounded-xl p-8 text-center max-w-md">
            <h2 className="text-xl font-semibold text-ink-900 mb-4">权限不足</h2>
            <p className="text-ink-600 mb-6">您没有权限访问此页面</p>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              返回首页
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
