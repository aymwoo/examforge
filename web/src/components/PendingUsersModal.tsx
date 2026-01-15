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
}

const PendingUsersModal: React.FC<PendingUsersModalProps> = ({ open, onOpenChange }) => {
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
      setUsers(response.data.data);
      setTotalPages(response.data.meta.totalPages);
      setTotalUsers(response.data.meta.total);
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
      onClose={() => onOpenChange(false)}
      title="待审核用户列表"
      size="large"
    >
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-500">
          共 {totalUsers} 个待审核用户
        </div>

        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleApproveSelected}
            disabled={selectedUsers.length === 0}
          >
            批准选中
          </Button>
          <Button
            variant="destructive"
            onClick={handleRejectSelected}
            disabled={selectedUsers.length === 0}
          >
            拒绝选中
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                      checked={selectedUsers.length === users.length && users.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="p-3 text-left">用户名</th>
                  <th className="p-3 text-left">姓名</th>
                  <th className="p-3 text-left">邮箱</th>
                  <th className="p-3 text-left">角色</th>
                  <th className="p-3 text-left">注册时间</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t hover:bg-gray-50">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                      />
                    </td>
                    <td className="p-3 font-medium">{user.username}</td>
                    <td className="p-3">{user.name}</td>
                    <td className="p-3 text-gray-600">{user.email || '-'}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {user.role}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-gray-500">{formatDate(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-500">
                第 {page} 页，共 {totalPages} 页
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
};

export default PendingUsersModal;