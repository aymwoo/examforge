import React, { useState, useEffect } from 'react';

interface ImportRecord {
  id: string;
  jobId: string;
  fileName: string;
  fileSize: number;
  mode: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  questionCount: number;
  canCreateExam: boolean;
  errorMessage?: string;
}

export default function ImportHistoryPage() {
  const [records, setRecords] = useState<ImportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [createExamDialog, setCreateExamDialog] = useState<string | null>(null);
  const [examTitle, setExamTitle] = useState('');
  const [examDuration, setExamDuration] = useState(60);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchImportHistory();
  }, []);

  const fetchImportHistory = async () => {
    try {
      const response = await fetch('/api/import/history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setRecords(data);
      } else {
        alert('获取导入历史失败');
      }
    } catch (error) {
      alert('获取导入历史失败');
    } finally {
      setLoading(false);
    }
  };

  const createExamFromRecord = async (jobId: string) => {
    if (!examTitle.trim()) {
      alert('请输入考试标题');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(`/api/import/history/${jobId}/create-exam`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          examTitle: examTitle.trim(),
          duration: examDuration,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`考试创建成功！包含 ${result.questionCount} 道题目`);
        setCreateExamDialog(null);
        setExamTitle('');
        setExamDuration(60);
      } else {
        const error = await response.json();
        alert(error.message || '创建考试失败');
      }
    } catch (error) {
      alert('创建考试失败');
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; className: string }> = {
      completed: { text: '已完成', className: 'bg-green-100 text-green-800' },
      processing: { text: '处理中', className: 'bg-yellow-100 text-yellow-800' },
      failed: { text: '失败', className: 'bg-red-100 text-red-800' },
    };
    
    const config = statusMap[status] || { text: status, className: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.text}
      </span>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">加载中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">导入历史</h1>
        <p className="text-gray-600">查看所有导入记录，并可以基于导入记录创建考试</p>
      </div>

      <div className="space-y-4">
        {records.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
            暂无导入记录
          </div>
        ) : (
          records.map((record) => (
            <div key={record.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{record.fileName}</h3>
                {getStatusBadge(record.status)}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-500">文件大小</div>
                  <div>{formatFileSize(record.fileSize)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">导入模式</div>
                  <div>{record.mode}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">题目数量</div>
                  <div>{record.questionCount} 道</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">导入时间</div>
                  <div>{formatDate(record.createdAt)}</div>
                </div>
              </div>

              {record.errorMessage && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                  <div className="text-sm text-red-600 font-medium">错误信息</div>
                  <div className="text-red-700">{record.errorMessage}</div>
                </div>
              )}

              <div className="flex gap-2">
                {record.canCreateExam && (
                  <button
                    onClick={() => setCreateExamDialog(record.jobId)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    创建考试
                  </button>
                )}
                
                <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
                  查看详情
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 创建考试对话框 */}
      {createExamDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">基于导入记录创建考试</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">文件名</label>
                <div className="text-sm text-gray-600">
                  {records.find(r => r.jobId === createExamDialog)?.fileName}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">题目数量</label>
                <div className="text-sm text-gray-600">
                  {records.find(r => r.jobId === createExamDialog)?.questionCount} 道题目
                </div>
              </div>
              
              <div>
                <label htmlFor="examTitle" className="block text-sm font-medium mb-1">
                  考试标题 *
                </label>
                <input
                  id="examTitle"
                  type="text"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder="请输入考试标题"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="examDuration" className="block text-sm font-medium mb-1">
                  考试时长（分钟）
                </label>
                <input
                  id="examDuration"
                  type="number"
                  value={examDuration}
                  onChange={(e) => setExamDuration(Number(e.target.value))}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setCreateExamDialog(null)}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={() => createExamFromRecord(createExamDialog)}
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? '创建中...' : '创建考试'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
