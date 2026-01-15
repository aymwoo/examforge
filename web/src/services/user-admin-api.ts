import api from '@/services/api';

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface BatchOperationResult {
  id: string;
  status: 'success' | 'error';
  data?: User;
  message?: string;
}

export interface BatchOperationResponse {
  results: BatchOperationResult[];
}

export const userAdminApi = {
  // 获取待审核用户列表
  getPendingApprovalUsers: (page: number = 1, limit: number = 10) => {
    return api.get('/admin/users/pending-approval', {
      params: { page, limit }
    });
  },

  // 批量批准用户
  batchApproveUsers: (ids: string[]) => {
    return api.post('/admin/users/batch-approve', { ids });
  },

  // 批量拒绝用户
  batchRejectUsers: (ids: string[]) => {
    return api.post('/admin/users/batch-reject', { ids });
  },

  // 获取待审核用户数量
  getPendingApprovalCount: () => {
    return api.get('/admin/users/pending-count');
  }
};