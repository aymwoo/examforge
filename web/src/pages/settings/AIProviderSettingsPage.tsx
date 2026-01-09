import { useState, useEffect } from "react";
import { Settings, Plus, Edit, Trash2, Globe, User } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import api from "@/services/api";

interface AIProvider {
  id: string;
  name: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
  isGlobal: boolean;
  isActive: boolean;
  createdBy?: string;
  creator?: {
    id: string;
    name: string;
    username: string;
  };
  createdAt: string;
}

export default function SettingsPage() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    apiKey: '',
    baseUrl: '',
    model: '',
    isGlobal: false,
    isActive: true,
  });

  // 模拟用户角色，实际应该从认证状态获取
  const [userRole] = useState('ADMIN'); // 或 'TEACHER'

  const loadProviders = async () => {
    try {
      const response = await api.get('/api/ai-providers');
      setProviders(response.data);
    } catch (error) {
      console.error('加载AI Provider失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingProvider) {
        await api.patch(`/api/ai-providers/${editingProvider.id}`, formData);
      } else {
        await api.post('/api/ai-providers', formData);
      }
      
      setShowModal(false);
      setEditingProvider(null);
      resetForm();
      loadProviders();
    } catch (error: any) {
      alert('操作失败: ' + (error.response?.data?.message || error.message));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      apiKey: '',
      baseUrl: '',
      model: '',
      isGlobal: false,
      isActive: true,
    });
  };

  const handleEdit = (provider: AIProvider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      apiKey: provider.apiKey,
      baseUrl: provider.baseUrl || '',
      model: provider.model,
      isGlobal: provider.isGlobal,
      isActive: provider.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = async (provider: AIProvider) => {
    if (!confirm(`确定要删除AI Provider "${provider.name}" 吗？`)) return;
    
    try {
      await api.delete(`/api/ai-providers/${provider.id}`);
      loadProviders();
    } catch (error: any) {
      alert('删除失败: ' + (error.response?.data?.message || error.message));
    }
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
        {/* 页面标题 */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-purple-100 p-3">
              <Settings className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-ink-900">AI Provider 设置</h1>
              <p className="text-ink-600">管理AI服务提供商配置</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setEditingProvider(null);
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            添加 Provider
          </Button>
        </div>

        {/* Provider列表 */}
        <div className="rounded-3xl border border-border bg-white shadow-soft">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-ink-900 mb-4">AI Provider 列表</h2>
            
            {providers.length === 0 ? (
              <div className="text-center py-12">
                <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无AI Provider</h3>
                <p className="text-gray-500 mb-6">请添加AI服务提供商配置</p>
                <Button onClick={() => setShowModal(true)}>
                  添加第一个 Provider
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {providers.map((provider) => (
                  <div 
                    key={provider.id} 
                    className="rounded-2xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6 shadow-lg"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-full p-2 ${
                          provider.isGlobal ? 'bg-blue-100' : 'bg-green-100'
                        }`}>
                          {provider.isGlobal ? (
                            <Globe className="h-5 w-5 text-blue-600" />
                          ) : (
                            <User className="h-5 w-5 text-green-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{provider.name}</h3>
                          <p className="text-sm text-gray-600">
                            {provider.isGlobal ? '全局配置' : '个人配置'}
                            {provider.creator && ` · 创建者: ${provider.creator.name}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          provider.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {provider.isActive ? '启用' : '禁用'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">模型:</span>
                        <span className="font-medium">{provider.model}</span>
                      </div>
                      {provider.baseUrl && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Base URL:</span>
                          <span className="font-medium truncate ml-2">{provider.baseUrl}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">API Key:</span>
                        <span className="font-medium">{'*'.repeat(8)}...{provider.apiKey.slice(-4)}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleEdit(provider)}
                        variant="outline"
                        className="flex-1 flex items-center gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        编辑
                      </Button>
                      <Button 
                        onClick={() => handleDelete(provider)}
                        variant="outline"
                        className="flex items-center gap-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        删除
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Provider表单模态框 */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingProvider ? '编辑 AI Provider' : '添加 AI Provider'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Provider 名称
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="例如: OpenAI GPT-4"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                required
                value={formData.apiKey}
                onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="sk-..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base URL (可选)
              </label>
              <input
                type="url"
                value={formData.baseUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, baseUrl: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="https://api.openai.com/v1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                模型名称
              </label>
              <input
                type="text"
                required
                value={formData.model}
                onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="gpt-4, claude-3, qwen-turbo 等"
              />
            </div>

            {userRole === 'ADMIN' && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isGlobal"
                  checked={formData.isGlobal}
                  onChange={(e) => setFormData(prev => ({ ...prev, isGlobal: e.target.checked }))}
                  className="mr-2"
                />
                <label htmlFor="isGlobal" className="text-sm font-medium text-gray-700">
                  设为全局 Provider (所有用户可见)
                </label>
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="mr-2"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                启用此 Provider
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
                {editingProvider ? '更新' : '创建'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
