import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Users } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import api from "@/services/api";

interface User {
  id: string;
  username: string;
  email?: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    name: '',
    role: 'STUDENT',
    isActive: true,
  });

  const loadUsers = async () => {
    try {
      const response = await api.get('/api/users');
      setUsers(response.data.data);
    } catch (error) {
      console.error('加载用户失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      if (editingUser) {
        // For updates, don't send password if it's empty
        const updateData = { ...formData };
        if (!updateData.password) {
          delete updateData.password;
        }
        await api.patch(`/api/users/${editingUser.id}`, updateData);
      } else {
        await api.post('/api/users', formData);
      }
      
      setShowModal(false);
      setEditingUser(null);
      setFormData({
        username: '',
        email: '',
        password: '',
        name: '',
        role: 'STUDENT',
        isActive: true,
      });
      loadUsers();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || '操作失败';
      setError(errorMessage);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email || '',
      password: '',
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`确定要删除用户 "${user.name}" 吗？`)) return;
    
    setError(null);
    try {
      await api.delete(`/api/users/${user.id}`);
      loadUsers();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || '删除失败';
      setError(errorMessage);
    }
  };

  const getRoleName = (role: string) => {
    const roleMap: Record<string, string> = {
      'ADMIN': '系统管理员',
      'TEACHER': '教师',
      'STUDENT': '学生'
    };
    return roleMap[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colorMap: Record<string, string> = {
      'ADMIN': 'bg-red-100 text-red-800',
      'TEACHER': 'bg-blue-100 text-blue-800',
      'STUDENT': 'bg-green-100 text-green-800'
    };
    return colorMap[role] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="bg-slatebg text-ink-900 antialiased min-h-screen pt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-ink-700">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slatebg text-ink-900 antialiased min-h-screen pt-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 错误提示 */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-600 hover:text-red-800"
            >
              关闭
            </button>
          </div>
        )}

        {/* 页面标题 */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-blue-100 p-3">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-ink-900">用户管理</h1>
              <p className="text-ink-600">管理系统用户和权限</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setEditingUser(null);
              setFormData({
                username: '',
                email: '',
                password: '',
                name: '',
                role: 'STUDENT',
                isActive: true,
              });
              setShowModal(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            添加用户
          </Button>
        </div>

        {/* 用户列表 */}
        <div className="rounded-3xl border border-border bg-white shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-ink-700">用户名</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-ink-700">姓名</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-ink-700">邮箱</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-ink-700">角色</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-ink-700">状态</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-ink-700">创建时间</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-ink-700">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium text-ink-900">
                      {user.username}
                    </td>
                    <td className="px-6 py-4 text-sm text-ink-700">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-ink-700">
                      {user.email || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getRoleColor(user.role)}`}>
                        {getRoleName(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-ink-700">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(user)}
                          className="flex items-center gap-1"
                        >
                          <Edit className="h-3 w-3" />
                          编辑
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(user)}
                          className="flex items-center gap-1 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                          删除
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 用户表单模态框 */}
        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setError(null);
          }}
          title={editingUser ? '编辑用户' : '添加用户'}
        >
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                用户名
              </label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                disabled={!!editingUser}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                姓名
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                邮箱
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                密码 {editingUser && '(留空则不修改)'}
              </label>
              <input
                type="password"
                required={!editingUser}
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                角色
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="STUDENT">学生</option>
                <option value="TEACHER">教师</option>
                <option value="ADMIN">系统管理员</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="mr-2"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                启用用户
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
              >
                取消
              </Button>
              <Button type="submit">
                {editingUser ? '更新' : '创建'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
