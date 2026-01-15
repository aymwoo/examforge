import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import { UserCheck } from 'lucide-react';
import { userAdminApi } from '@/services/user-admin-api';
import PendingUsersModal from '@/components/PendingUsersModal';
import { useToast } from '@/components/ui/Toast';

const ApprovalNotificationButton: React.FC = () => {
  const { error: showError, success: showSuccess } = useToast();
  const [pendingCount, setPendingCount] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingCount();
  }, []);

  useEffect(() => {
    if (modalOpen) {
      // 当打开模态框时，重新获取计数
      fetchPendingCount();
    }
  }, [modalOpen]);

  const fetchPendingCount = async () => {
    try {
      setLoading(true);
      const response = await userAdminApi.getPendingApprovalCount();
      setPendingCount(response.data.count);
    } catch (error) {
      console.error('Failed to fetch pending approval count:', error);
      showError('获取待审核用户数量失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setModalOpen(true)}
          className="relative"
        >
          <UserCheck className="h-4 w-4 mr-2" />
          审核用户
        </Button>
        {pendingCount > 0 && (
          <span
            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full bg-red-500 text-white"
          >
            {pendingCount}
          </span>
        )}
      </div>

      <PendingUsersModal
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
};

export default ApprovalNotificationButton;