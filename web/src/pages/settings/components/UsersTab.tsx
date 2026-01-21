import { useEffect, useState } from "react";
import {
  KeyRound,
  Plus,
  Trash2,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import ApprovalNotificationButton from "@/components/ApprovalNotificationButton";
import Button from "@/components/ui/Button";
import type { User } from "./types.ts";

interface UsersTabProps {
  users: User[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onAddUser: () => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (user: User) => Promise<void>;
  onBatchDeleteUsers: (userIds: string[]) => Promise<void>;
  onBatchResetPasswords: (userIds: string[]) => Promise<void>;
  onRefreshUsers: () => Promise<void>;
  getRoleName: (role: string) => string;
  getRoleColor: (role: string) => string;
}

export function UsersTab({
  users,
  loading,
  currentPage,
  totalPages,
  onPageChange,
  onAddUser,
  onEditUser,
  onDeleteUser,
  onBatchDeleteUsers,
  onBatchResetPasswords,
  onRefreshUsers,
  getRoleName,
  getRoleColor,
}: UsersTabProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    setSelectedUserIds(new Set());
  }, [users]);

  const handleToggleSelect = (userId: string) => {
    setSelectedUserIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedUserIds.size === users.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(users.map((user) => user.id)));
    }
  };

  const handleBatchReset = async () => {
    if (selectedUserIds.size === 0) return;
    await onBatchResetPasswords(Array.from(selectedUserIds));
    setSelectedUserIds(new Set());
  };

  const handleBatchDelete = async () => {
    if (selectedUserIds.size === 0) return;
    await onBatchDeleteUsers(Array.from(selectedUserIds));
    setSelectedUserIds(new Set());
  };

  const selectedUsers = users.filter((user) => selectedUserIds.has(user.id));

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-white p-12 text-center">
        <p className="text-ink-700">加载用户数据中...</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-white shadow-soft">
      <div className="flex items-center justify-between border-b border-border p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-blue-100 p-2">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-ink-900">用户管理</h2>
          {selectedUsers.length > 0 && (
            <span className="text-sm text-ink-600">
              已选择 {selectedUsers.length} 个用户
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedUsers.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBatchReset}
                className="flex items-center gap-1"
              >
                <KeyRound className="h-4 w-4" />
                重置密码
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBatchDelete}
                className="flex items-center gap-1 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                批量删除
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedUserIds(new Set())}
                className="text-ink-600"
              >
                取消选择
              </Button>
            </div>
          )}
          <ApprovalNotificationButton onModalClose={onRefreshUsers} />
          <Button onClick={onAddUser} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            添加用户
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border bg-slate-50">
            <tr>
              <th className="w-10 px-4 py-4 text-left">
                <input
                  type="checkbox"
                  checked={
                    selectedUserIds.size === users.length && users.length > 0
                  }
                  onChange={handleToggleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-ink-700">
                用户名
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-ink-700">
                姓名
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-ink-700">
                邮箱
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-ink-700">
                角色
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-ink-700">
                状态
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-ink-700">
                创建时间
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-ink-700">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr
                key={user.id}
                className={`hover:bg-slate-50 ${
                  selectedUserIds.has(user.id) ? "bg-blue-50" : ""
                }`}
              >
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.has(user.id)}
                    onChange={() => handleToggleSelect(user.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 text-sm font-medium text-ink-900">
                  {user.username}
                </td>
                <td className="px-6 py-4 text-sm text-ink-700">{user.name}</td>
                <td className="px-6 py-4 text-sm text-ink-700">
                  {user.email || "-"}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getRoleColor(user.role)}`}
                  >
                    {getRoleName(user.role)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      user.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {user.isActive ? "启用" : "禁用"}
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
                      onClick={() => onEditUser(user)}
                      className="flex items-center gap-1"
                    >
                      编辑
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDeleteUser(user)}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <div className="text-sm text-ink-600">
            第 {currentPage} 页，共 {totalPages} 页
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="flex items-center gap-1"
            >
              下一页
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
