import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Save } from "lucide-react";
import Button from "@/components/ui/Button";
import {
  getSettings,
  updateSetting,
  getProviders,
  type SystemSettings,
  type AIModelConfig,
} from "@/services/settings";
import { testAIConnection } from "@/services/settings";

export default function SettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SystemSettings>({
    aiProvider: "openai",
    aiApiKey: "",
    aiBaseUrl: "",
    aiModel: "",
    promptTemplate: "",
    gradingPromptTemplate: "",
  });
  const [providers, setProviders] = useState<AIModelConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const [settingsData, providersData] = await Promise.all([
        getSettings(),
        getProviders(),
      ]);
      setSettings(settingsData);
      setProviders(providersData);
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(
        axiosError.response?.data?.message ||
          axiosError.message ||
          "加载设置失败",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleProviderChange = (value: string) => {
    const provider = providers.find((p) => p.id === value);
    if (provider && provider.defaultBaseUrl && provider.defaultModel) {
      handleInputChange("aiBaseUrl", provider.defaultBaseUrl);
      handleInputChange("aiModel", provider.defaultModel);
    }
    handleInputChange("aiProvider", value);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateSetting("AI_PROVIDER", settings.aiProvider);
      await updateSetting("AI_API_KEY", settings.aiApiKey);
      await updateSetting("AI_BASE_URL", settings.aiBaseUrl);
      await updateSetting("AI_MODEL", settings.aiModel);
      await updateSetting("PROMPT_TEMPLATE", settings.promptTemplate);
      await updateSetting("GRADING_PROMPT_TEMPLATE", settings.gradingPromptTemplate);
      setError("设置保存成功");
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(
        axiosError.response?.data?.message ||
          axiosError.message ||
          "保存设置失败",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleResetToDefault = async () => {
    const defaultTemplate = `你是一个专业的题目生成AI助手。
根据用户提供的试卷图像和约束条件，生成一次线上考试。

要求：
1. 根据试卷图像识别所有题目
2. 确保题目格式正确，包括题干、选项（选择题）、答案、解析
3. 为每道题提供合理的难度（1-5）、知识点和标签
4. 输出JSON格式，格式要求：
{
  "questions": [
    {
      "content": "题干内容",
      "type": "题型(SINGLE_CHOICE/MULTIPLE_CHOICE/TRUE_FALSE/FILL_BLANK/ESSAY)",
      "options": [{"label": "A", "content": "选项1"}, ...],
      "answer": "正确答案",
      "explanation": "题目解析",
      "difficulty": 1,
      "tags": ["标签1", "标签2"],
      "knowledgePoint": "知识点"
    }
  ]
}

请只返回JSON格式的题目数据，不要包含其他说明文字。`;

    setSettings((prev) => ({
      ...prev,
      promptTemplate: defaultTemplate,
    }));
  };

  const handleTestAIConnection = async () => {
    if (!settings.aiApiKey) {
      setError("请先配置 API Key");
      return;
    }

    setTestResult(null);
    try {
      const result = await testAIConnection(
        "Hello, please respond with just 'Connection successful!'",
      );
      setTestResult(`AI 连接测试成功！AI响应: ${result.response}`);
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const errorMessage =
        axiosError.response?.data?.message ||
        axiosError.message ||
        "AI 连接测试失败";
      setError(errorMessage);
      setTestResult(`测试失败: ${errorMessage}`);
    }
  };

  return (
    <div className="bg-slatebg text-ink-900 antialiased min-h-screen pt-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/questions")}>
              <Settings className="h-4 w-4 mr-2" />
              返回题库
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
              系统设置
            </h1>
          </div>
          <Button onClick={handleSave} disabled={saving || loading}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "保存中..." : "保存设置"}
          </Button>
        </div>

        {loading && (
          <div className="rounded-2xl border border-border bg-white p-12 text-center">
            <p className="text-ink-700">加载中...</p>
          </div>
        )}

        {error && (
          <div
            className={`mb-4 rounded-2xl border bg-white p-4 text-center ${
              error.includes("成功")
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            <p className="text-ink-900">{error}</p>
          </div>
        )}

        {!loading && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <div className="rounded-3xl border border-border bg-white p-6 shadow-soft">
                <h2 className="mb-6 text-lg font-semibold text-ink-900">
                  AI 配置
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-ink-900">
                      AI Provider
                    </label>
                    <select
                      className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900"
                      value={settings.aiProvider}
                      onChange={(e) => handleProviderChange(e.target.value)}
                    >
                      {providers.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-ink-900">
                      API Key
                    </label>
                    <input
                      type="password"
                      className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900"
                      placeholder="sk-..."
                      value={settings.aiApiKey}
                      onChange={(e) =>
                        handleInputChange("aiApiKey", e.target.value)
                      }
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
                      value={settings.aiBaseUrl}
                      onChange={(e) =>
                        handleInputChange("aiBaseUrl", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-ink-900">
                      Model
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900"
                      placeholder="gpt-4o"
                      value={settings.aiModel}
                      onChange={(e) =>
                        handleInputChange("aiModel", e.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={handleTestAIConnection}
                    className="flex-1"
                    variant="outline"
                  >
                    测试 AI 连接
                  </Button>
                  <Button
                    onClick={handleResetToDefault}
                    className="flex-1"
                    variant="outline"
                  >
                    重置提示词
                  </Button>
                </div>

                {testResult && (
                  <div
                    className={`mt-4 rounded-xl border p-3 text-sm ${
                      testResult.includes("成功")
                        ? "border-green-200 bg-green-50 text-green-800"
                        : "border-red-200 bg-red-50 text-red-800"
                    }`}
                  >
                    {testResult}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-border bg-white p-6 shadow-soft">
                <h2 className="mb-6 text-lg font-semibold text-ink-900">
                  试卷生成提示词配置
                </h2>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink-900">
                    提示词模板
                  </label>
                  <textarea
                    className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900 min-h-[300px] font-mono"
                    value={settings.promptTemplate}
                    onChange={(e) =>
                      handleInputChange("promptTemplate", e.target.value)
                    }
                    placeholder="输入AI提示词模板..."
                  />
                  <p className="mt-1 text-xs text-ink-700">
                    提示词模板用于指导AI如何根据试卷图像生成题目。支持变量占位符。
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-white p-6 shadow-soft">
                <h2 className="mb-6 text-lg font-semibold text-ink-900">
                  AI评分提示词配置
                </h2>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink-900">
                    评分提示词模板
                  </label>
                  <textarea
                    className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900 min-h-[300px] font-mono"
                    value={settings.gradingPromptTemplate}
                    onChange={(e) =>
                      handleInputChange("gradingPromptTemplate", e.target.value)
                    }
                    placeholder="输入AI评分提示词模板..."
                  />
                  <p className="mt-1 text-xs text-ink-700">
                    评分提示词模板用于指导AI如何评分学生答案。支持变量：{"{questionContent}"}, {"{questionType}"}, {"{referenceAnswer}"}, {"{studentAnswer}"}, {"{maxScore}"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
