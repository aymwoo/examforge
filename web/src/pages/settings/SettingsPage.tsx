import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Save, Plus, Check, Lock, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import {
  getSettings,
  getUserSettings,
  updateSetting,
  updateUserSetting,
  getProviders,
  getJsonStructureTemplate,
  createAIProvider,
  getAIProviderDetails,
  deleteAIProvider,
  updateAIProvider,
  type SystemSettings,
  type AIModelConfig,
} from "@/services/settings";
import {
  listStudentsForPromptManagement,
  updateStudentAiAnalysisPrompt,
} from "@/services/students";
import { testAIConnection } from "@/services/settings";
import { getCurrentUser } from "@/utils/auth";
import AddAIProviderModal from "@/components/modals/AddAIProviderModal";

export default function SettingsPage() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const isTeacher = currentUser?.role === "TEACHER";
  const [settings, setSettings] = useState<SystemSettings>({
    aiProvider: "openai",
    aiApiKey: "",
    aiBaseUrl: "",
    aiModel: "",
    promptTemplate: "",
    gradingPromptTemplate: "",
    analysisPromptTemplate: "",
    studentAiAnalysisPromptTemplate: "",
  });

  const [studentSearch, setStudentSearch] = useState("");
  const [studentPage, setStudentPage] = useState(1);
  const [students, setStudents] = useState<
    Array<{
      id: string;
      studentId: string;
      name: string;
      class?: { id: string; name: string } | null;
      aiAnalysisPrompt?: string | null;
    }>
  >([]);
  const [studentsTotalPages, setStudentsTotalPages] = useState(1);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );
  const [studentPromptDraft, setStudentPromptDraft] = useState("");
  const [savingStudentPrompt, setSavingStudentPrompt] = useState(false);
  const [providers, setProviders] = useState<AIModelConfig[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [editingProvider, setEditingProvider] = useState<AIModelConfig | null>(
    null,
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingPromptTemplate, setSavingPromptTemplate] = useState(false);
  const [savingGradingPromptTemplate, setSavingGradingPromptTemplate] =
    useState(false);
  const [savingAnalysisPromptTemplate, setSavingAnalysisPromptTemplate] =
    useState(false);
  const [
    savingStudentAiAnalysisPromptTemplate,
    setSavingStudentAiAnalysisPromptTemplate,
  ] = useState(false);
  const [promptTemplateChanged, setPromptTemplateChanged] = useState(false);
  const [gradingPromptTemplateChanged, setGradingPromptTemplateChanged] =
    useState(false);
  const [analysisPromptTemplateChanged, setAnalysisPromptTemplateChanged] =
    useState(false);
  const [
    studentAiAnalysisPromptTemplateChanged,
    setStudentAiAnalysisPromptTemplateChanged,
  ] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [showAddProviderModal, setShowAddProviderModal] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const [settingsData, userSettingsData, providersData] = await Promise.all(
        [getSettings(), getUserSettings(), getProviders()],
      );
      setSettings({
        ...userSettingsData,
      });

      if (!userSettingsData.analysisPromptTemplate) {
        const defaultAnalysisPrompt = `请基于以下考试数据生成一份详细的分析报告：

考试信息：
- 考试名称：{examTitle}
- 考试描述：{examDescription}
- 考试时长：{duration}分钟
- 总分：{totalScore}分
- 题目数量：{questionCount}道

统计数据：
- 平均分：{averageScore}分
- 最高分：{highestScore}分
- 最低分：{lowestScore}分
- 及格率：{passRate}%
- 参与学生：{submittedCount}人
- 参与率：{participationRate}%

题目分析：
{questionStats}

知识点分析：
{knowledgePointStats}

请从以下几个方面进行分析：
1. 整体考试表现评价
2. 学生掌握情况分析
3. 题目难度和区分度分析
4. 知识点掌握情况分析
5. 教学建议和改进方向

请用中文回答，内容要专业、详细、有针对性。`;

        setSettings((prev) => ({
          ...prev,
          analysisPromptTemplate: defaultAnalysisPrompt,
        }));
      }

      if (!userSettingsData.studentAiAnalysisPromptTemplate) {
        const defaultStudentAiAnalysisPrompt = `你是一名严格但建设性的阅卷专家与学习教练。

请基于下列"评分详情数据(JSON)"生成该学生的个人学习诊断报告。

要求：
- 用中文回答
- 重点分析扣分原因、常见错误类型、薄弱知识点、作答策略问题
- 给出可执行的改进建议（短期1周/中期1月）

输出格式（Markdown）：
- 总体表现概述
- 主要失分原因（按重要性排序）
- 薄弱知识点与专项建议
- 作答策略与时间分配建议
- 1周提升计划
- 1月提升计划

【学生信息】
{studentLabel}

【该学生的个性化分析提示词】
{studentPrompt}

【评分详情数据(JSON)】
{payload}`;

        setSettings((prev) => ({
          ...prev,
          studentAiAnalysisPromptTemplate: defaultStudentAiAnalysisPrompt,
        }));
      }

      setProviders(providersData);
      setSelectedProvider(settingsData.aiProvider);

      const currentProvider = providersData.find(
        (p) => p.id === settingsData.aiProvider,
      );
      if (currentProvider) {
        setEditingProvider({
          ...currentProvider,
          apiKey: settingsData.aiApiKey,
          baseUrl: settingsData.aiBaseUrl,
          model: settingsData.aiModel,
        });
      }
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

  const loadStudentsForPromptManagement = async () => {
    if (!isTeacher) return;
    try {
      const result = await listStudentsForPromptManagement({
        search: studentSearch || undefined,
        page: studentPage,
        limit: 20,
      });
      setStudents(result.data);
      setStudentsTotalPages(result.meta.totalPages || 1);

      if (result.data.length > 0) {
        const stillExists = selectedStudentId
          ? result.data.some((s) => s.id === selectedStudentId)
          : false;
        if (!stillExists) {
          setSelectedStudentId(result.data[0].id);
          setStudentPromptDraft(result.data[0].aiAnalysisPrompt || "");
        }
      } else {
        setSelectedStudentId(null);
        setStudentPromptDraft("");
      }
    } catch (err) {
      console.error("Failed to load students for prompt management", err);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    loadStudentsForPromptManagement();
  }, [isTeacher, studentSearch, studentPage]);

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    const provider = providers.find((p) => p.id === providerId);
    if (provider) {
      const isSystemProvider = [
        "gpt-4",
        "gpt-3.5-turbo",
        "qwen-turbo",
        "qwen-plus",
        "qwen-max",
      ].includes(providerId);

      if (isSystemProvider) {
        setEditingProvider({
          ...provider,
          apiKey: providerId === settings.aiProvider ? settings.aiApiKey : "",
          baseUrl:
            providerId === settings.aiProvider
              ? settings.aiBaseUrl
              : provider.defaultBaseUrl || "",
          model:
            providerId === settings.aiProvider
              ? settings.aiModel
              : provider.defaultModel || "",
        });
      } else {
        getAIProviderDetails(providerId)
          .then((details) => {
            setEditingProvider({
              ...provider,
              apiKey: details.apiKey,
              baseUrl: details.baseUrl || provider.defaultBaseUrl || "",
              model: details.model || provider.defaultModel || "",
            });
          })
          .catch((err) => {
            console.error("Failed to load provider details:", err);
            setEditingProvider({
              ...provider,
              apiKey: "",
              baseUrl: provider.defaultBaseUrl || "",
              model: provider.defaultModel || "",
            });
          });
      }
    }
    setHasChanges(false);
  };

  const handleProviderFieldChange = (field: string, value: string) => {
    if (editingProvider) {
      setEditingProvider((prev) => (prev ? { ...prev, [field]: value } : null));
      setHasChanges(true);
    }
  };

  const handleSaveProvider = async () => {
    if (!editingProvider) return;

    setSaving(true);
    setError(null);
    try {
      const isSystemProvider = [
        "gpt-4",
        "gpt-3.5-turbo",
        "qwen-turbo",
        "qwen-plus",
        "qwen-max",
      ].includes(selectedProvider);

      if (isSystemProvider) {
        await updateSetting("AI_PROVIDER", selectedProvider);
        await updateSetting("AI_API_KEY", editingProvider.apiKey || "");
        await updateSetting("AI_BASE_URL", editingProvider.baseUrl || "");
        await updateSetting("AI_MODEL", editingProvider.model || "");
      } else {
        await updateSetting("AI_PROVIDER", selectedProvider);
        await updateSetting("AI_API_KEY", "");
        await updateSetting("AI_BASE_URL", "");
        await updateSetting("AI_MODEL", "");

        const originalProvider = providers.find(
          (p) => p.id === selectedProvider,
        );
        if (
          originalProvider &&
          editingProvider.name !== originalProvider.name
        ) {
          await updateAIProvider(selectedProvider, {
            name: editingProvider.name,
          });
        }
      }

      setSettings((prev) => ({
        ...prev,
        aiProvider: selectedProvider,
        aiApiKey: isSystemProvider ? editingProvider.apiKey || "" : "",
        aiBaseUrl: isSystemProvider ? editingProvider.baseUrl || "" : "",
        aiModel: isSystemProvider ? editingProvider.model || "" : "",
      }));

      setProviders((prev) =>
        prev.map((p) =>
          p.id === selectedProvider ? { ...p, name: editingProvider.name } : p,
        ),
      );

      setHasChanges(false);
      setError("AI Provider 设置保存成功");
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

  const handleSavePromptTemplate = async () => {
    setSavingPromptTemplate(true);
    setError(null);
    try {
      await updateUserSetting("PROMPT_TEMPLATE", settings.promptTemplate);
      setPromptTemplateChanged(false);
      setError("试卷生成提示词保存成功");
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(
        axiosError.response?.data?.message ||
          axiosError.message ||
          "保存提示词失败",
      );
    } finally {
      setSavingPromptTemplate(false);
    }
  };

  const handleSaveGradingPromptTemplate = async () => {
    setSavingGradingPromptTemplate(true);
    setError(null);
    try {
      await updateUserSetting(
        "GRADING_PROMPT_TEMPLATE",
        settings.gradingPromptTemplate,
      );
      setGradingPromptTemplateChanged(false);
      setError("AI评分提示词保存成功");
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(
        axiosError.response?.data?.message ||
          axiosError.message ||
          "保存提示词失败",
      );
    } finally {
      setSavingGradingPromptTemplate(false);
    }
  };

  const handleSaveStudentAiAnalysisPromptTemplate = async () => {
    setSavingStudentAiAnalysisPromptTemplate(true);
    setError(null);
    try {
      await updateUserSetting(
        "STUDENT_AI_ANALYSIS_PROMPT_TEMPLATE",
        settings.studentAiAnalysisPromptTemplate,
      );
      setStudentAiAnalysisPromptTemplateChanged(false);
      setError("评分管理AI分析提示词保存成功");
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(
        axiosError.response?.data?.message ||
          axiosError.message ||
          "保存提示词失败",
      );
    } finally {
      setSavingStudentAiAnalysisPromptTemplate(false);
    }
  };

  const handleSaveAnalysisPromptTemplate = async () => {
    setSavingAnalysisPromptTemplate(true);
    setError(null);
    try {
      await updateUserSetting(
        "ANALYSIS_PROMPT_TEMPLATE",
        settings.analysisPromptTemplate,
      );
      setAnalysisPromptTemplateChanged(false);
      setError("分析报告提示词保存成功");
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(
        axiosError.response?.data?.message ||
          axiosError.message ||
          "保存提示词失败",
      );
    } finally {
      setSavingAnalysisPromptTemplate(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setError(null);

    if (field === "promptTemplate") {
      setPromptTemplateChanged(true);
    } else if (field === "gradingPromptTemplate") {
      setGradingPromptTemplateChanged(true);
    } else if (field === "analysisPromptTemplate") {
      setAnalysisPromptTemplateChanged(true);
    } else if (field === "studentAiAnalysisPromptTemplate") {
      setStudentAiAnalysisPromptTemplateChanged(true);
    }
  };

  const handleInsertJsonStructure = async () => {
    try {
      const jsonTemplate = await getJsonStructureTemplate();
      const currentTemplate = settings.promptTemplate;
      const insertText = `\n\n输出JSON格式要求：\n${jsonTemplate}`;

      setSettings((prev) => ({
        ...prev,
        promptTemplate: currentTemplate + insertText,
      }));
    } catch (err: unknown) {
      setError("获取JSON结构模板失败");
    }
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
    if (!editingProvider?.apiKey) {
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

  const handleInsertGradingVariables = () => {
    const variables = `
支持的变量：
- {questionContent} - 题目内容
- {questionType} - 题目类型
- {referenceAnswer} - 参考答案
- {studentAnswer} - 学生答案
- {maxScore} - 满分`;

    setSettings((prev) => ({
      ...prev,
      gradingPromptTemplate: prev.gradingPromptTemplate + variables,
    }));
  };

  const handleInsertAnalysisVariables = () => {
    const variables = `
支持的变量：
- {examTitle} - 考试标题
- {examDescription} - 考试描述
- {duration} - 考试时长
- {totalScore} - 总分
- {questionCount} - 题目数量
- {averageScore} - 平均分
- {highestScore} - 最高分
- {lowestScore} - 最低分
- {passRate} - 及格率
- {participationRate} - 参与率
- {questionStats} - 题目统计数据
- {knowledgePointStats} - 知识点统计数据`;

    setSettings((prev) => ({
      ...prev,
      analysisPromptTemplate: prev.analysisPromptTemplate + variables,
    }));
  };

  const handleCreateAIProvider = async (providerData: {
    name: string;
    apiKey: string;
    baseUrl: string;
    model: string;
    isGlobal?: boolean;
  }) => {
    const createdProvider = await createAIProvider(providerData);
    await loadSettings();
    handleProviderSelect(createdProvider.id);
  };

  const handleDeleteAIProvider = async (providerId: string) => {
    if (!confirm("确定要删除这个 AI Provider 吗？此操作不可撤销。")) {
      return;
    }

    try {
      await deleteAIProvider(providerId);
      await loadSettings();
      if (selectedProvider === providerId) {
        setSelectedProvider("");
        setEditingProvider(null);
      }
      setError("AI Provider 删除成功");
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "删除失败");
    }
  };

  return (
    <>
      <div className="bg-slatebg text-ink-900 antialiased min-h-screen pt-28">
        <div className="mx-auto max-w-none px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
                系统设置
              </h1>
            </div>
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
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="flex flex-col">
                <div className="rounded-3xl border border-border bg-white p-6 shadow-soft flex-1">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-ink-900">
                      AI Provider 配置
                    </h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddProviderModal(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      新增 Provider
                    </Button>
                  </div>

                  <div className="mb-4 rounded-xl border border-gray-300 bg-gray-50 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4 text-gray-600" />
                          <div className="text-sm font-medium text-gray-800">
                            当前系统默认 AI Provider
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {providers.find((p) => p.id === settings.aiProvider)
                            ?.name || settings.aiProvider}
                          {settings.aiModel && ` (${settings.aiModel})`}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-md">
                        系统配置
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="mb-3 block text-sm font-semibold text-ink-900">
                      选择 AI Provider{" "}
                      {isTeacher && (
                        <span className="text-xs text-gray-500">
                          (系统配置为只读，可选择自定义配置)
                        </span>
                      )}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {providers.map((provider, index) => {
                        const isSystemProvider = [
                          "gpt-4",
                          "gpt-3.5-turbo",
                          "qwen-turbo",
                          "qwen-plus",
                          "qwen-max",
                        ].includes(provider.id);
                        const isCustomProvider = !isSystemProvider;

                        const colors = [
                          "bg-blue-50 border-blue-200 hover:bg-blue-100",
                          "bg-green-50 border-green-200 hover:bg-green-100",
                          "bg-purple-50 border-purple-200 hover:bg-purple-100",
                          "bg-orange-50 border-orange-200 hover:bg-orange-100",
                          "bg-pink-50 border-pink-200 hover:bg-pink-100",
                          "bg-indigo-50 border-indigo-200 hover:bg-indigo-100",
                          "bg-teal-50 border-teal-200 hover:bg-teal-100",
                          "bg-red-50 border-red-200 hover:bg-red-100",
                        ];

                        let colorClass;
                        if (isTeacher && isSystemProvider) {
                          colorClass = "bg-gray-50 border-gray-200";
                        } else if (isCustomProvider) {
                          colorClass =
                            "bg-yellow-50 border-yellow-200 hover:bg-yellow-100";
                        } else {
                          colorClass = colors[index % colors.length];
                        }

                        const isProviderDisabled =
                          isTeacher && isSystemProvider;

                        return (
                          <button
                            key={provider.id}
                            onClick={() =>
                              !isProviderDisabled &&
                              handleProviderSelect(provider.id)
                            }
                            disabled={isProviderDisabled}
                            className={`relative flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                              selectedProvider === provider.id
                                ? isProviderDisabled
                                  ? "border-gray-400 bg-gray-100 text-gray-700"
                                  : "border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-200"
                                : `${colorClass} text-ink-900 ${isProviderDisabled ? "cursor-not-allowed opacity-75" : "cursor-pointer"}`
                            }`}
                          >
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {provider.name}
                                {isProviderDisabled && (
                                  <Lock className="h-3 w-3 text-gray-500" />
                                )}
                                {isCustomProvider && (
                                  <span className="text-xs bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded">
                                    自定义
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-ink-600">
                                {provider.id}
                              </div>
                            </div>
                            {selectedProvider === provider.id &&
                              settings.aiProvider === provider.id && (
                                <Check
                                  className={`h-4 w-4 ${isProviderDisabled ? "text-gray-600" : "text-blue-600"}`}
                                />
                              )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {editingProvider && (
                    <div className="space-y-4">
                      {(() => {
                        const isSystemProvider = [
                          "gpt-4",
                          "gpt-3.5-turbo",
                          "qwen-turbo",
                          "qwen-plus",
                          "qwen-max",
                        ].includes(editingProvider.id || "");
                        const isProviderEditable =
                          !isTeacher || !isSystemProvider;

                        return (
                          <>
                            {(() => {
                              const isSystemProvider = [
                                "gpt-4",
                                "gpt-3.5-turbo",
                                "qwen-turbo",
                                "qwen-plus",
                                "qwen-max",
                              ].includes(editingProvider?.id || "");
                              const canEditName =
                                !isTeacher || !isSystemProvider;

                              return (
                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-ink-900 flex items-center gap-2">
                                    Provider 名称
                                    {!canEditName && (
                                      <Lock className="h-3 w-3 text-gray-500" />
                                    )}
                                  </label>
                                  <input
                                    type="text"
                                    className={`w-full rounded-xl border px-3 py-2 text-sm ${
                                      !canEditName
                                        ? "border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed"
                                        : "border-border bg-white text-ink-900"
                                    }`}
                                    placeholder="Provider 名称"
                                    value={editingProvider?.name || ""}
                                    onChange={(e) =>
                                      canEditName &&
                                      handleProviderFieldChange(
                                        "name",
                                        e.target.value,
                                      )
                                    }
                                    disabled={!canEditName}
                                  />
                                </div>
                              );
                            })()}

                            <div>
                              <label className="mb-2 block text-sm font-semibold text-ink-900 flex items-center gap-2">
                                API Key
                                {!isProviderEditable && (
                                  <Lock className="h-3 w-3 text-gray-500" />
                                )}
                              </label>
                              <input
                                type="password"
                                className={`w-full rounded-xl border px-3 py-2 text-sm ${
                                  !isProviderEditable
                                    ? "border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed"
                                    : "border-border bg-white text-ink-900"
                                }`}
                                placeholder="sk-..."
                                value={editingProvider.apiKey || ""}
                                onChange={(e) =>
                                  isProviderEditable &&
                                  handleProviderFieldChange(
                                    "apiKey",
                                    e.target.value,
                                  )
                                }
                                disabled={!isProviderEditable}
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-semibold text-ink-900 flex items-center gap-2">
                                Base URL
                                {!isProviderEditable && (
                                  <Lock className="h-3 w-3 text-gray-500" />
                                )}
                              </label>
                              <input
                                type="url"
                                className={`w-full rounded-xl border px-3 py-2 text-sm ${
                                  !isProviderEditable
                                    ? "border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed"
                                    : "border-border bg-white text-ink-900"
                                }`}
                                placeholder="https://api.openai.com/v1/chat/completions"
                                value={editingProvider.baseUrl || ""}
                                onChange={(e) =>
                                  isProviderEditable &&
                                  handleProviderFieldChange(
                                    "baseUrl",
                                    e.target.value,
                                  )
                                }
                                disabled={!isProviderEditable}
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-semibold text-ink-900 flex items-center gap-2">
                                Model
                                {!isProviderEditable && (
                                  <Lock className="h-3 w-3 text-gray-500" />
                                )}
                              </label>
                              <input
                                type="text"
                                className={`w-full rounded-xl border px-3 py-2 text-sm ${
                                  !isProviderEditable
                                    ? "border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed"
                                    : "border-border bg-white text-ink-900"
                                }`}
                                placeholder="gpt-4o"
                                value={editingProvider.model || ""}
                                onChange={(e) =>
                                  isProviderEditable &&
                                  handleProviderFieldChange(
                                    "model",
                                    e.target.value,
                                  )
                                }
                                disabled={!isProviderEditable}
                              />
                            </div>

                            {hasChanges && isProviderEditable && (
                              <div className="flex gap-2">
                                <Button
                                  onClick={handleSaveProvider}
                                  disabled={saving}
                                  className="flex-1"
                                >
                                  <Save className="h-4 w-4 mr-2" />
                                  {saving ? "保存中..." : "保存设置"}
                                </Button>
                                <Button
                                  onClick={() =>
                                    handleProviderSelect(selectedProvider)
                                  }
                                  variant="outline"
                                  className="flex-1 text-gray-600 border-gray-300 hover:bg-gray-50"
                                >
                                  取消更改
                                </Button>
                              </div>
                            )}

                            {!isProviderEditable && (
                              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Lock className="h-4 w-4" />
                                  <span>系统级 AI Provider 配置无法修改</span>
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <Button
                      onClick={handleTestAIConnection}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white border-green-600"
                      variant="outline"
                      disabled={
                        !editingProvider?.apiKey ||
                        (isTeacher &&
                          [
                            "gpt-4",
                            "gpt-3.5-turbo",
                            "qwen-turbo",
                            "qwen-plus",
                            "qwen-max",
                          ].includes(editingProvider?.id || ""))
                      }
                    >
                      {isTeacher &&
                      [
                        "gpt-4",
                        "gpt-3.5-turbo",
                        "qwen-turbo",
                        "qwen-plus",
                        "qwen-max",
                      ].includes(editingProvider?.id || "") ? (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          无法测试连接
                        </>
                      ) : (
                        "测试 AI 连接"
                      )}
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

                  {(() => {
                    const isSystemProvider = [
                      "gpt-4",
                      "gpt-3.5-turbo",
                      "qwen-turbo",
                      "qwen-plus",
                      "qwen-max",
                    ].includes(editingProvider?.id || "");
                    const canDeleteProvider =
                      !isSystemProvider &&
                      (currentUser?.role === "ADMIN" ||
                        (!isTeacher && !isSystemProvider));

                    return (
                      canDeleteProvider && (
                        <div className="mt-4">
                          <Button
                            onClick={() =>
                              handleDeleteAIProvider(editingProvider?.id || "")
                            }
                            className="w-full bg-red-600 hover:bg-red-700 text-white border-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            删除此 Provider
                          </Button>
                        </div>
                      )
                    );
                  })()}
                </div>
                <div className="rounded-3xl border border-border bg-white p-6 shadow-soft">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-ink-900">
                      试卷生成提示词配置
                    </h2>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleInsertJsonStructure}
                        variant="outline"
                        size="sm"
                      >
                        插入JSON结构
                      </Button>
                      <Button
                        onClick={handleResetToDefault}
                        variant="outline"
                        size="sm"
                      >
                        重置默认
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-ink-900">
                      提示词模板
                    </label>
                    <textarea
                      className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900 min-h-[200px] font-mono"
                      value={settings.promptTemplate}
                      onChange={(e) =>
                        handleInputChange("promptTemplate", e.target.value)
                      }
                      placeholder="输入AI提示词模板..."
                    />
                    <p className="mt-1 text-xs text-ink-700">
                      提示词模板用于指导AI如何根据试卷图像生成题目。支持变量占位符。此为您的个人设置。
                    </p>
                  </div>

                  <Button
                    onClick={handleSavePromptTemplate}
                    disabled={savingPromptTemplate || !promptTemplateChanged}
                    className={`mt-4 w-full ${
                      promptTemplateChanged
                        ? "bg-ink-900 hover:bg-ink-800 text-white"
                        : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                    }`}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {savingPromptTemplate ? "保存中..." : "保存提示词设置"}
                  </Button>
                </div>

                <div className="rounded-3xl border border-border bg-white p-6 shadow-soft">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-ink-900">
                      AI评分提示词配置
                    </h2>
                    <Button
                      onClick={handleInsertGradingVariables}
                      variant="outline"
                      size="sm"
                    >
                      插入支持变量
                    </Button>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-ink-900">
                      评分提示词模板
                    </label>
                    <textarea
                      className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900 min-h-[200px] font-mono"
                      value={settings.gradingPromptTemplate}
                      onChange={(e) =>
                        handleInputChange(
                          "gradingPromptTemplate",
                          e.target.value,
                        )
                      }
                      placeholder="输入AI评分提示词模板..."
                    />
                    <p className="mt-1 text-xs text-ink-700">
                      评分提示词模板用于指导AI如何评分学生答案。支持变量：
                      {"{questionContent}"}, {"{questionType}"},{" "}
                      {"{referenceAnswer}"}, {"{studentAnswer}"}, {"{maxScore}"}
                      。此为您的个人设置。
                    </p>
                  </div>

                  <Button
                    onClick={handleSaveGradingPromptTemplate}
                    disabled={
                      savingGradingPromptTemplate ||
                      !gradingPromptTemplateChanged
                    }
                    className={`mt-4 w-full ${
                      gradingPromptTemplateChanged
                        ? "bg-ink-900 hover:bg-ink-800 text-white"
                        : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                    }`}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {savingGradingPromptTemplate
                      ? "保存中..."
                      : "保存评分提示词设置"}
                  </Button>
                </div>

                <div className="rounded-3xl border border-border bg-white p-6 shadow-soft">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-ink-900">
                      评分管理 AI分析提示词配置
                    </h2>
                    <Button
                      onClick={() => {
                        const variables = `
支持的变量：
- {studentLabel} - 学生显示名/账号
- {studentPrompt} - 学生个性化提示词（来自学生设置）
- {payload} - 评分详情JSON（包含考试、学生、得分等）`;

                        setSettings((prev) => ({
                          ...prev,
                          studentAiAnalysisPromptTemplate:
                            prev.studentAiAnalysisPromptTemplate + variables,
                        }));
                      }}
                      variant="outline"
                      size="sm"
                    >
                      插入支持变量
                    </Button>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-ink-900">
                      学生个人AI分析提示词模板
                    </label>
                    <textarea
                      className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900 min-h-[200px] font-mono"
                      value={settings.studentAiAnalysisPromptTemplate}
                      onChange={(e) =>
                        handleInputChange(
                          "studentAiAnalysisPromptTemplate",
                          e.target.value,
                        )
                      }
                      placeholder="输入评分管理-学生AI分析提示词模板..."
                    />
                    <p className="mt-1 text-xs text-ink-700">
                      用于评分管理页面对单个学生生成AI分析报告。此为您的个人设置。
                    </p>
                  </div>

                  <Button
                    onClick={handleSaveStudentAiAnalysisPromptTemplate}
                    disabled={
                      savingStudentAiAnalysisPromptTemplate ||
                      !studentAiAnalysisPromptTemplateChanged
                    }
                    className={`mt-4 w-full ${
                      studentAiAnalysisPromptTemplateChanged
                        ? "bg-ink-900 hover:bg-ink-800 text-white"
                        : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                    }`}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {savingStudentAiAnalysisPromptTemplate
                      ? "保存中..."
                      : "保存评分管理AI提示词设置"}
                  </Button>
                </div>

                <div className="rounded-3xl border border-border bg-white p-6 shadow-soft">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-ink-900">
                      分析报告提示词配置
                    </h2>
                    <Button
                      onClick={handleInsertAnalysisVariables}
                      variant="outline"
                      size="sm"
                    >
                      插入支持变量
                    </Button>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-ink-900">
                      分析报告提示词模板
                    </label>
                    <textarea
                      className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900 min-h-[200px] font-mono"
                      value={settings.analysisPromptTemplate}
                      onChange={(e) =>
                        handleInputChange(
                          "analysisPromptTemplate",
                          e.target.value,
                        )
                      }
                      placeholder="输入AI分析报告提示词模板..."
                    />
                    <p className="mt-1 text-xs text-ink-700">
                      分析报告提示词模板用于指导AI如何生成考试分析报告。支持变量：
                      {"{examTitle}"}, {"{examDescription}"}, {"{scoreStats}"},{" "}
                      {"{questionStats}"}, {"{knowledgePointStats}"}
                      等。此为您的个人设置。
                    </p>
                  </div>

                  <Button
                    onClick={handleSaveAnalysisPromptTemplate}
                    disabled={
                      savingAnalysisPromptTemplate ||
                      !analysisPromptTemplateChanged
                    }
                    className={`mt-4 w-full ${
                      analysisPromptTemplateChanged
                        ? "bg-ink-900 hover:bg-ink-800 text-white"
                        : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                    }`}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {savingAnalysisPromptTemplate
                      ? "保存中..."
                      : "保存分析提示词设置"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <AddAIProviderModal
        isOpen={showAddProviderModal}
        onClose={() => setShowAddProviderModal(false)}
        onSave={handleCreateAIProvider}
        userRole={currentUser?.role || "TEACHER"}
      />
    </>
  );
}
