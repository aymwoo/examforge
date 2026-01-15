import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/auth';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 如果已经有成功消息，点击按钮应打开登录模态框
    if (error.includes('注册成功')) {
      window.dispatchEvent(new CustomEvent("show401Login"));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authService.register(formData);
      // 不再自动登录，而是显示成功消息
      setError('注册成功！您的账户正在等待管理员审核，审核通过后即可登录使用系统。');
      setFormData({ username: '', password: '', name: '' }); // 清空表单
    } catch (err: any) {
      setError(err.response?.data?.message || '注册失败');
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
            {error.includes('注册成功') ? '注册成功' : '注册账户'}
          </h2>
          <p className="mt-2 text-center text-sm text-ink-600">
            {error.includes('注册成功')
              ? '请等待管理员审核，审核通过后即可登录系统'
              : '已有账户？'}
            {' '}
            {error.includes('注册成功') ? (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("show401Login"))}
                className="font-medium text-blue-600 hover:text-blue-500 bg-transparent border-none cursor-pointer"
              >
                立即登录
              </button>
            ) : (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("show401Login"))}
                className="font-medium text-blue-600 hover:text-blue-500 bg-transparent border-none cursor-pointer"
              >
                立即登录
              </button>
            )}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className={`px-4 py-3 rounded ${
              error.includes('注册成功')
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-ink-700">
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
              <label htmlFor="name" className="block text-sm font-medium text-ink-700">
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
              <label htmlFor="password" className="block text-sm font-medium text-ink-700">
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
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '注册中...' : error.includes('注册成功') ? '返回登录' : '注册'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
