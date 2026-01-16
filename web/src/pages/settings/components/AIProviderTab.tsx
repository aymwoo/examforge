import { useEffect, useState } from "react";
import {
  Edit,
  Globe,
  Lock,
  Plus,
  Settings,
  Star,
  Trash2,
  User,
  Zap,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import api from "@/services/api";
import type { AIProviderFormData, AIProviderItem } from "./types.ts";

interface AIProviderTabProps {
  providers: AIProviderItem[];
  loading: boolean;
  showModal: boolean;
  setShowModal: (value: boolean) => void;
  editingProvider: AIProviderItem | null;
  setEditingProvider: (provider: AIProviderItem | null) => void;
  formData: AIProviderFormData;
  setFormData: React.Dispatch<React.SetStateAction<AIProviderFormData>>;
  defaultProviderId: string | null;
  loadProviders: () => Promise<void>;
  handleEdit: (provider: AIProviderItem) => void;
  handleDelete: (provider: AIProviderItem) => Promise<void>;
  handleSetDefault: (provider: AIProviderItem) => Promise<void>;
  canEditProvider: (provider: AIProviderItem) => boolean;
  canDeleteProvider: (provider: AIProviderItem) => boolean;
  handleSubmit: (event: React.FormEvent) => Promise<void>;
  resetForm: () => void;
  userRole: string;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
}

const jsonImportExample = [
  {
    name: "OpenAI GPT-4",
    apiKey: "sk-...",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4",
    isGlobal: false,
    isActive: true,
  },
  {
    name: "Anthropic Claude",
    apiKey: "sk-ant-...",
    baseUrl: "https://api.anthropic.com/v1",
    model: "claude-3-opus",
    isGlobal: false,
    isActive: true,
  },
];

export function AIProviderTab({
  providers,
  loading,
  showModal,
  setShowModal,
  editingProvider,
  setEditingProvider,
  formData,
  setFormData,
  defaultProviderId,
  loadProviders,
  handleEdit,
  handleDelete,
  handleSetDefault,
  canEditProvider,
  canDeleteProvider,
  handleSubmit,
  resetForm,
  userRole,
  showError,
  showSuccess,
}: AIProviderTabProps) {
  const [localTestResult, setLocalTestResult] = useState<string | null>(null);
  const [localTestLoading, setLocalTestLoading] = useState(false);
  const [localFormData, setLocalFormData] = useState<AIProviderFormData>({
    name: "",
    apiKey: "",
    baseUrl: "",
    model: "",
    isGlobal: false,
    isActive: true,
  });
  const [localDefaultProviderId, setLocalDefaultProviderId] = useState<
    string | null
  >(null);
  const [localShowJsonImportModal, setLocalShowJsonImportModal] =
    useState(false);
  const [localJsonImportData, setLocalJsonImportData] = useState("");

  const handleLocalJsonImport = async () => {
    if (!localJsonImportData.trim()) {
      showError("请输入JSON数据");
      return;
    }

    try {
      const parsedData = JSON.parse(localJsonImportData);

      if (!Array.isArray(parsedData)) {
        throw new Error("JSON数据必须是一个数组");
      }

      for (const provider of parsedData) {
        if (!provider.name || !provider.apiKey || !provider.model) {
          throw new Error("Provider缺少必需字段: name, apiKey, 或 model");
        }
      }

      for (const provider of parsedData) {
        try {
          const existingProvider = providers.find(
            (item) => item.name === provider.name,
          );
          if (existingProvider) {
            if (!confirm(`Provider "${provider.name}" 已存在，是否覆盖？`)) {
              continue;
            }
          }

          const providerData = {
            name: provider.name,
            apiKey: provider.apiKey,
            baseUrl: provider.baseUrl || "",
            model: provider.model,
            isGlobal: provider.isGlobal || false,
            isActive:
              provider.isActive !== undefined ? provider.isActive : true,
          };

          if (existingProvider) {
            await api.patch(
              `/api/ai-providers/${existingProvider.id}`,
              providerData,
            );
          } else {
            await api.post("/api/ai-providers", providerData);
          }
        } catch (error: any) {
          console.error(`导入Provider "${provider.name}" 失败:`, error);
          showError(
            `导入Provider "${provider.name}" 失败: ${error.response?.data?.message || error.message}`,
          );
        }
      }

      showSuccess("JSON导入完成");
      setLocalShowJsonImportModal(false);
      setLocalJsonImportData("");
      await loadProviders();
    } catch (error: any) {
      console.error("JSON解析错误:", error);
      showError("JSON格式错误: " + error.message);
    }
  };

  const handleLocalTestAIConnection = async () => {
    if (!localFormData.apiKey.trim()) {
      setLocalTestResult("请先输入 API Key");
      return;
    }
    setLocalTestLoading(true);
    setLocalTestResult(null);
    try {
      const response = await api.post<{ response: string }>("/api/ai/test", {
        message: "Hello, please respond with just 'Connection successful!'",
        testApiKey: localFormData.apiKey,
        testBaseUrl: localFormData.baseUrl,
        testModel: localFormData.model,
      });

      setLocalTestResult(
        `✅ AI 连接测试成功！AI响应: ${response.data.response}`,
      );
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || err.message || "连接测试失败";
      setLocalTestResult(`❌ ${errorMessage}`);
    } finally {
      setLocalTestLoading(false);
    }
  };

  useEffect(() => {
    setLocalFormData(formData);
  }, [formData]);

  useEffect(() => {
    setLocalDefaultProviderId(defaultProviderId);
  }, [defaultProviderId]);

  useEffect(() => {
    if (editingProvider) {
      setLocalFormData({
        name: editingProvider.name,
        apiKey: editingProvider.apiKey,
        baseUrl: editingProvider.baseUrl || "",
        model: editingProvider.model,
        isGlobal: editingProvider.isGlobal,
        isActive: editingProvider.isActive,
      });
    }
  }, [editingProvider]);

  useEffect(() => {
    void loadProviders();
  }, [loadProviders]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-border bg-white p-12 text-center shadow-soft">
        <p className="text-ink-700">加载中...</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-3xl border border-border bg-white shadow-soft">
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-ink-900">
              AI Provider 列表
            </h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  resetForm();
                  setEditingProvider(null);
                  setShowModal(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                添加 Provider
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLocalShowJsonImportModal(true);
                  setLocalJsonImportData("");
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                JSON导入
              </Button>
            </div>
          </div>

          {providers.length === 0 ? (
            <div className="py-12 text-center">
              <Settings className="mx-auto mb-4 h-16 w-16 text-gray-400" />
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                暂无AI Provider
              </h3>
              <p className="mb-6 text-gray-500">请添加AI服务提供商配置</p>
              <Button onClick={() => setShowModal(true)}>
                添加第一个 Provider
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {providers.map((provider, index) => {
                const colorThemes = [
                  {
                    border: "border-purple-200",
                    from: "from-purple-50",
                    iconBg: "bg-purple-100",
                    iconText: "text-purple-600",
                    hover: "hover:border-purple-300",
                  },
                  {
                    border: "border-teal-200",
                    from: "from-teal-50",
                    iconBg: "bg-teal-100",
                    iconText: "text-teal-600",
                    hover: "hover:border-teal-300",
                  },
                  {
                    border: "border-orange-200",
                    from: "from-orange-50",
                    iconBg: "bg-orange-100",
                    iconText: "text-orange-600",
                    hover: "hover:border-orange-300",
                  },
                  {
                    border: "border-pink-200",
                    from: "from-pink-50",
                    iconBg: "bg-pink-100",
                    iconText: "text-pink-600",
                    hover: "hover:border-pink-300",
                  },
                  {
                    border: "border-cyan-200",
                    from: "from-cyan-50",
                    iconBg: "bg-cyan-100",
                    iconText: "text-cyan-600",
                    hover: "hover:border-cyan-300",
                  },
                  {
                    border: "border-amber-200",
                    from: "from-amber-50",
                    iconBg: "bg-amber-100",
                    iconText: "text-amber-600",
                    hover: "hover:border-amber-300",
                  },
                  {
                    border: "border-indigo-200",
                    from: "from-indigo-50",
                    iconBg: "bg-indigo-100",
                    iconText: "text-indigo-600",
                    hover: "hover:border-indigo-300",
                  },
                  {
                    border: "border-emerald-200",
                    from: "from-emerald-50",
                    iconBg: "bg-emerald-100",
                    iconText: "text-emerald-600",
                    hover: "hover:border-emerald-300",
                  },
                ];
                const theme = colorThemes[index % colorThemes.length];
                const isDefault = localDefaultProviderId === provider.id;

                return (
                  <div
                    key={provider.id}
                    className={`rounded-2xl border-2 bg-gradient-to-br p-6 shadow-lg transition-all ${
                      isDefault
                        ? "border-blue-400 from-blue-50 to-white ring-2 ring-blue-200 shadow-blue-100"
                        : `${theme.border} ${theme.from} to-white ${theme.hover}`
                    }`}
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`rounded-full p-2 ${
                            isDefault ? "bg-blue-100" : theme.iconBg
                          }`}
                        >
                          {provider.isGlobal ? (
                            <Globe
                              className={`h-5 w-5 ${
                                isDefault ? "text-blue-600" : theme.iconText
                              }`}
                            />
                          ) : (
                            <User
                              className={`h-5 w-5 ${
                                isDefault ? "text-blue-600" : theme.iconText
                              }`}
                            />
                          )}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold text-gray-900">
                              {provider.name}
                            </h3>
                            {localDefaultProviderId === provider.id && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                <Star className="h-3 w-3" />
                                系统默认
                              </span>
                            )}
                            {provider.isGlobal &&
                              !canEditProvider(provider) && (
                                <div title="系统默认，不可修改">
                                  <Lock className="h-4 w-4 text-gray-500" />
                                </div>
                              )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {provider.isGlobal ? "全局配置" : "个人配置"}
                            {provider.creator &&
                              ` · 创建者: ${provider.creator.name}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            provider.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {provider.isActive ? "启用" : "禁用"}
                        </span>
                      </div>
                    </div>

                    <div className="mb-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">模型:</span>
                        <span className="font-medium">{provider.model}</span>
                      </div>
                      {provider.baseUrl && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Base URL:</span>
                          <span className="ml-2 truncate font-medium">
                            {provider.baseUrl}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">API Key:</span>
                        <span className="font-medium">
                          {"*".repeat(8)}...{provider.apiKey.slice(-4)}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {canEditProvider(provider) && (
                        <Button
                          onClick={() => handleEdit(provider)}
                          variant="outline"
                          className="flex flex-1 items-center justify-center gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          编辑
                        </Button>
                      )}
                      {userRole === "ADMIN" && (
                        <Button
                          onClick={() => handleSetDefault(provider)}
                          variant="outline"
                          className={`flex items-center justify-center gap-2 ${
                            localDefaultProviderId === provider.id
                              ? "border-blue-200 bg-blue-50 text-blue-600"
                              : "text-blue-600 hover:text-blue-700"
                          }`}
                          disabled={
                            localDefaultProviderId === provider.id ||
                            !provider.isActive
                          }
                        >
                          <Star className="h-4 w-4" />
                          {localDefaultProviderId === provider.id
                            ? "默认"
                            : "设为默认"}
                        </Button>
                      )}
                      {canDeleteProvider(provider) && (
                        <Button
                          onClick={() => handleDelete(provider)}
                          variant="outline"
                          className="flex items-center justify-center gap-2 text-red-600 hover:text-red-700"
                          disabled={localDefaultProviderId === provider.id}
                        >
                          <Trash2 className="h-4 w-4" />
                          删除
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingProvider ? "编辑 AI Provider" : "添加 AI Provider"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Provider 名称
            </label>
            <input
              type="text"
              required
              value={localFormData.name}
              onChange={(e) => {
                const newValue = e.target.value;
                setLocalFormData((prev) => ({ ...prev, name: newValue }));
                setFormData((prev) => ({ ...prev, name: newValue }));
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="例如: OpenAI GPT-4"
              disabled={editingProvider?.isGlobal && userRole !== "ADMIN"}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              API Key
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                required
                value={localFormData.apiKey}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setLocalFormData((prev) => ({
                    ...prev,
                    apiKey: newValue,
                  }));
                  setFormData((prev) => ({
                    ...prev,
                    apiKey: newValue,
                  }));
                }}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="sk-..."
              />
              <Button
                type="button"
                onClick={handleLocalTestAIConnection}
                disabled={localTestLoading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                {localTestLoading ? "测试中..." : "测试连接"}
              </Button>
            </div>
            {localTestResult && (
              <div
                className={`mt-2 rounded p-2 text-sm ${
                  localTestResult.startsWith("✅")
                    ? "border border-green-200 bg-green-50 text-green-700"
                    : "border border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {localTestResult}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Base URL (可选)
            </label>
            <input
              type="url"
              value={localFormData.baseUrl}
              onChange={(e) => {
                const newValue = e.target.value;
                setLocalFormData((prev) => ({
                  ...prev,
                  baseUrl: newValue,
                }));
                setFormData((prev) => ({
                  ...prev,
                  baseUrl: newValue,
                }));
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="https://api.openai.com/v1"
              disabled={editingProvider?.isGlobal && userRole !== "ADMIN"}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              模型名称
            </label>
            <input
              type="text"
              required
              value={localFormData.model}
              onChange={(e) => {
                const newValue = e.target.value;
                setLocalFormData((prev) => ({ ...prev, model: newValue }));
                setFormData((prev) => ({ ...prev, model: newValue }));
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="gpt-4, claude-3, qwen-turbo 等"
              disabled={editingProvider?.isGlobal && userRole !== "ADMIN"}
            />
          </div>

          {userRole === "ADMIN" && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="providerIsGlobal"
                checked={localFormData.isGlobal}
                onChange={(e) => {
                  const newValue = e.target.checked;
                  setLocalFormData((prev) => ({
                    ...prev,
                    isGlobal: newValue,
                  }));
                  setFormData((prev) => ({
                    ...prev,
                    isGlobal: newValue,
                  }));
                }}
                className="mr-2"
              />
              <label
                htmlFor="providerIsGlobal"
                className="text-sm font-medium text-gray-700"
              >
                设为全局 Provider (所有用户可见)
              </label>
            </div>
          )}

          <div className="flex items-center">
            <input
              type="checkbox"
              id="providerIsActive"
              checked={localFormData.isActive}
              onChange={(e) => {
                const newValue = e.target.checked;
                setLocalFormData((prev) => ({
                  ...prev,
                  isActive: newValue,
                }));
                setFormData((prev) => ({
                  ...prev,
                  isActive: newValue,
                }));
              }}
              className="mr-2"
            />
            <label
              htmlFor="providerIsActive"
              className="text-sm font-medium text-gray-700"
            >
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
            <Button type="submit">{editingProvider ? "更新" : "创建"}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={localShowJsonImportModal}
        onClose={() => setLocalShowJsonImportModal(false)}
        title="从JSON导入 AI Provider"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              JSON 格式示例
            </label>
            <pre className="overflow-x-auto rounded bg-gray-100 p-3 text-xs">
              {JSON.stringify(jsonImportExample, null, 2)}
            </pre>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              导入的 JSON 数据
            </label>
            <textarea
              value={localJsonImportData}
              onChange={(e) => setLocalJsonImportData(e.target.value)}
              rows={8}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
              placeholder='[{ "name": "OpenAI GPT-4", "apiKey": "sk-...", "baseUrl": "https://api.openai.com/v1", "model": "gpt-4", "isGlobal": false, "isActive": true }]'
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocalShowJsonImportModal(false)}
            >
              取消
            </Button>
            <Button onClick={handleLocalJsonImport}>导入</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
