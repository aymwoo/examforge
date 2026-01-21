import { useState } from "react";
import { X, Save } from "lucide-react";
import Button from "@/components/ui/Button";

interface AddAIProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (provider: {
    name: string;
    apiKey: string;
    baseUrl: string;
    model: string;
    isGlobal?: boolean;
  }) => Promise<void>;
  userRole: string;
}

export default function AddAIProviderModal({
  isOpen,
  onClose,
  onSave,
  userRole,
}: AddAIProviderModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    apiKey: "",
    baseUrl: "",
    model: "",
    isGlobal: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.apiKey || !formData.model) {
      setError("请填写必填字段");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(formData);
      setFormData({
        name: "",
        apiKey: "",
        baseUrl: "",
        model: "",
        isGlobal: false,
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-ink-900">
            新增 AI Provider
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-ink-900">
              名称 *
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900"
              placeholder="例如：我的 GPT-4"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-ink-900">
              API Key *
            </label>
            <input
              type="password"
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900"
              placeholder="sk-..."
              value={formData.apiKey}
              onChange={(e) => handleInputChange("apiKey", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-ink-900">
              Base URL
            </label>
            <input
              type="url"
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900"
              placeholder="https://api.openai.com/v1/chat/completions"
              value={formData.baseUrl}
              onChange={(e) => handleInputChange("baseUrl", e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-ink-900">
              模型名称 *
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900"
              placeholder="gpt-4o"
              value={formData.model}
              onChange={(e) => handleInputChange("model", e.target.value)}
              required
            />
          </div>

          {userRole === "ADMIN" && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isGlobal"
                className="rounded border-border"
                checked={formData.isGlobal}
                onChange={(e) =>
                  handleInputChange("isGlobal", e.target.checked)
                }
              />
              <label htmlFor="isGlobal" className="text-sm text-ink-900">
                设为系统全局配置（所有用户可见）
              </label>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={saving}
            >
              取消
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
