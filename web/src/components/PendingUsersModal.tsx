import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { User, BatchOperationResponse } from '@/services/user-admin-api';
import { userAdminApi } from '@/services/user-admin-api';
import { useToast } from '@/components/ui/Toast';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface PendingUsersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onModalClose?: () => void;
}

const PendingUsersModal: React.FC<PendingUsersModalProps> = ({ open, onOpenChange, onModalClose }) => {
  const { success: showSuccess, error: showError, warning: showWarning } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    if (open) {
      fetchPendingUsers(page);
    }
  }, [open, page]);

  const fetchPendingUsers = async (currentPage: number) => {
    try {
      setLoading(true);
      const response = await userAdminApi.getPendingApprovalUsers(currentPage, 10);
      console.log('Pending users response:', response); // 调试日志
      // 确保响应具有正确的结构
      if (!response || typeof response !== 'object' || !response.data || !response.meta) {
        console.error('Invalid response structure:', response);
        throw new Error('Invalid response structure from server');
      }
      if (typeof response.meta !== 'object' ||
          typeof response.meta.totalPages === 'undefined' ||
          typeof response.meta.total === 'undefined') {
        console.error('Invalid meta structure in response:', response);
        throw new Error('Invalid meta structure in response from server');
      }
      setUsers(response.data);
      setTotalPages(response.meta.totalPages);
      setTotalUsers(response.meta.total);
    } catch (error) {
      showError?.('获取待审核用户失败');
      console.error('Error fetching pending users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user.id));
    }
  };

  const handleApproveSelected = async () => {
    if (selectedUsers.length === 0) {
      showWarning?.('请至少选择一个用户');
      return;
    }

    try {
      const response: BatchOperationResponse = await userAdminApi.batchApproveUsers(selectedUsers);
      const successCount = response.results.filter(r => r.status === 'success').length;
      showSuccess?.(`成功批准 ${successCount} 个用户`);

      // 刷新列表
      await fetchPendingUsers(page);
      setSelectedUsers([]);
    } catch (error) {
      showError?.('批量批准用户失败');
      console.error('Error approving users:', error);
    }
  };

  const handleRejectSelected = async () => {
    if (selectedUsers.length === 0) {
      showWarning?.('请至少选择一个用户');
      return;
    }

    try {
      const response: BatchOperationResponse = await userAdminApi.batchRejectUsers(selectedUsers);
      const successCount = response.results.filter(r => r.status === 'success').length;
      showSuccess?.(`成功拒绝 ${successCount} 个用户`);

      // 刷新列表
      await fetchPendingUsers(page);
      setSelectedUsers([]);
    } catch (error) {
      showError?.('批量拒绝用户失败');
      console.error('Error rejecting users:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'yyyy-MM-dd HH:mm', { locale: zhCN });
  };

  return (
    <Modal
      isOpen={open}
      onClose={() => {
        onOpenChange(false);
        if (onModalClose) {
          onModalClose();
        }
      }}
      title="待审核用户列表"
      size="extra-large"
    >
      <div className="flex justify-between items-center mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
        <div className="text-sm font-medium text-gray-700">
          共 {totalUsers} 个待审核用户
        </div>

        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleApproveSelected}
            disabled={selectedUsers.length === 0}
            className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
          >
            批准选中
          </Button>
          <Button
            variant="outline"
            onClick={handleRejectSelected}
            disabled={selectedUsers.length === 0}
            className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
          >
            拒绝选中
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {totalUsers === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">暂无待审核用户</h3>
              <p className="mt-2 text-sm text-gray-500">
                当前没有需要审核的用户注册申请。
              </p>
              <div className="mt-6">
                <Button
                  onClick={() => onOpenChange(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  确定
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedUsers.length === users.length && users.length > 0}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户名</th>
                      <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                      <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">邮箱</th>
                      <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">角色</th>
                      <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">注册时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className={`hover:bg-blue-50 transition-colors duration-150 ${
                          selectedUsers.includes(user.id) ? 'bg-blue-50' : ''
                        }`}
                      >
                        <td className="p-4">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => handleSelectUser(user.id)}
                          />
                        </td>
                        <td className="p-4 font-medium text-gray-900">{user.username}</td>
                        <td className="p-4 text-gray-700">{user.name}</td>
                        <td className="p-4 text-gray-600">{user.email || '-'}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            user.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-800'
                              : user.role === 'TEACHER'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                          }`}>
                            {user.role === 'ADMIN' ? '管理员' : user.role === 'TEACHER' ? '教师' : '学生'}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-gray-500">{formatDate(user.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6">
                  <div className="text-sm text-gray-600">
                    第 {page} 页，共 {totalPages} 页
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2"
                    >
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2"
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </Modal>
  );
};

export default PendingUsersModal;