import { useEffect, useState } from "react";
import { Save, Plus, Check, Lock, Trash2, Settings, Users, MessageSquare, Cpu } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
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
import { listStudentsForPromptManagement } from "@/services/students";
import { testAIConnection } from "@/services/settings";
import { getCurrentUser } from "@/utils/auth";
import AddAIProviderModal from "@/components/modals/AddAIProviderModal";
import api from "@/services/api";

// User interface for Users tab
interface User {
  id: string;
  username: string;
  email?: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

type TabType = "ai-provider" | "prompts" | "users";

export default function SettingsPage() {
  const currentUser = getCurrentUser();
  const isTeacher = currentUser?.role === "TEACHER";
  const isAdmin = currentUser?.role === "ADMIN";
  
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("ai-provider");

  // AI Provider settings state
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

  const [studentSearch] = useState("");
  const [studentPage] = useState(1);
  const [, setStudents] = useState<
    Array<{
      id: string;
      studentId: string;
      name: string;
      class?: { id: string; name: string } | null;
      aiAnalysisPrompt?: string | null;
    }>
  >([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [providers, setProviders] = useState<AIModelConfig[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [editingProvider, setEditingProvider] = useState<AIModelConfig | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingPromptTemplate, setSavingPromptTemplate] = useState(false);
  const [savingGradingPromptTemplate, setSavingGradingPromptTemplate] = useState(false);
  const [savingAnalysisPromptTemplate, setSavingAnalysisPromptTemplate] = useState(false);
  const [savingStudentAiAnalysisPromptTemplate, setSavingStudentAiAnalysisPromptTemplate] = useState(false);
  const [promptTemplateChanged, setPromptTemplateChanged] = useState(false);
  const [gradingPromptTemplateChanged, setGradingPromptTemplateChanged] = useState(false);
  const [analysisPromptTemplateChanged, setAnalysisPromptTemplateChanged] = useState(false);
  const [studentAiAnalysisPromptTemplateChanged, setStudentAiAnalysisPromptTemplateChanged] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [showAddProviderModal, setShowAddProviderModal] = useState(false);

  // Users tab state
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState({
    username: '',
    email: '',
    password: '',
    name: '',
    role: 'STUDENT',
    isActive: true,
  });

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const [settingsData, userSettingsData, providersData] = await Promise.all(
        [getSettings(), getUserSettings(), getProviders()],
      );
      setSettings({ ...userSettingsData });

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
        setSettings((prev) => ({ ...prev, analysisPromptTemplate: defaultAnalysisPrompt }));
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
        setSettings((prev) => ({ ...prev, studentAiAnalysisPromptTemplate: defaultStudentAiAnalysisPrompt }));
      }

      setProviders(providersData);
      setSelectedProvider(settingsData.aiProvider);

      const currentProvider = providersData.find((p) => p.id === settingsData.aiProvider);
      if (currentProvider) {
        setEditingProvider({
          ...currentProvider,
          apiKey: settingsData.aiApiKey,
          baseUrl: settingsData.aiBaseUrl,
          model: settingsData.aiModel,
        });
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
      setError(axiosError.response?.data?.message || axiosError.message || "加载设置失败");
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
      if (result.data.length > 0) {
        const stillExists = selectedStudentId ? result.data.some((s) => s.id === selectedStudentId) : false;
        if (!stillExists) setSelectedStudentId(result.data[0].id);
      } else {
        setSelectedStudentId(null);
      }
    } catch (err) {
      console.error("Failed to load students for prompt management", err);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await api.get('/api/users');
      setUsers(response.data.data);
    } catch (error) {
      console.error('加载用户失败:', error);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    loadStudentsForPromptManagement();
  }, [isTeacher, studentSearch, studentPage]);

  useEffect(() => {
    if (activeTab === 'users' && isAdmin) {
      loadUsers();
    }
  }, [activeTab, isAdmin]);

  // AI Provider handlers
  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    const provider = providers.find((p) => p.id === providerId);
    if (provider) {
      const isSystemProvider = ["gpt-4", "gpt-3.5-turbo", "qwen-turbo", "qwen-plus", "qwen-max"].includes(providerId);
      if (isSystemProvider) {
        setEditingProvider({
          ...provider,
          apiKey: providerId === settings.aiProvider ? settings.aiApiKey : "",
          baseUrl: providerId === settings.aiProvider ? settings.aiBaseUrl : provider.defaultBaseUrl || "",
          model: providerId === settings.aiProvider ? settings.aiModel : provider.defaultModel || "",
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
      const isSystemProvider = ["gpt-4", "gpt-3.5-turbo", "qwen-turbo", "qwen-plus", "qwen-max"].includes(selectedProvider);
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
        const originalProvider = providers.find((p) => p.id === selectedProvider);
        if (originalProvider && editingProvider.name !== originalProvider.name) {
          await updateAIProvider(selectedProvider, { name: editingProvider.name });
        }
      }
      setSettings((prev) => ({
        ...prev,
        aiProvider: selectedProvider,
        aiApiKey: isSystemProvider ? editingProvider.apiKey || "" : "",
        aiBaseUrl: isSystemProvider ? editingProvider.baseUrl || "" : "",
        aiModel: isSystemProvider ? editingProvider.model || "" : "",
      }));
      setProviders((prev) => prev.map((p) => p.id === selectedProvider ? { ...p, name: editingProvider.name } : p));
      setHasChanges(false);
      setError("AI Provider 设置保存成功");
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
      setError(axiosError.response?.data?.message || axiosError.message || "保存设置失败");
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
      const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
      setError(axiosError.response?.data?.message || axiosError.message || "保存提示词失败");
    } finally {
      setSavingPromptTemplate(false);
    }
  };

  const handleSaveGradingPromptTemplate = async () => {
    setSavingGradingPromptTemplate(true);
    setError(null);
    try {
      await updateUserSetting("GRADING_PROMPT_TEMPLATE", settings.gradingPromptTemplate);
      setGradingPromptTemplateChanged(false);
      setError("AI评分提示词保存成功");
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
      setError(axiosError.response?.data?.message || axiosError.message || "保存提示词失败");
    } finally {
      setSavingGradingPromptTemplate(false);
    }
  };

  const handleSaveStudentAiAnalysisPromptTemplate = async () => {
    setSavingStudentAiAnalysisPromptTemplate(true);
    setError(null);
    try {
      await updateUserSetting("STUDENT_AI_ANALYSIS_PROMPT_TEMPLATE", settings.studentAiAnalysisPromptTemplate);
      setStudentAiAnalysisPromptTemplateChanged(false);
      setError("评分管理AI分析提示词保存成功");
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
      setError(axiosError.response?.data?.message || axiosError.message || "保存提示词失败");
    } finally {
      setSavingStudentAiAnalysisPromptTemplate(false);
    }
  };

  const handleSaveAnalysisPromptTemplate = async () => {
    setSavingAnalysisPromptTemplate(true);
    setError(null);
    try {
      await updateUserSetting("ANALYSIS_PROMPT_TEMPLATE", settings.analysisPromptTemplate);
      setAnalysisPromptTemplateChanged(false);
      setError("分析报告提示词保存成功");
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
      setError(axiosError.response?.data?.message || axiosError.message || "保存提示词失败");
    } finally {
      setSavingAnalysisPromptTemplate(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setError(null);
    if (field === "promptTemplate") setPromptTemplateChanged(true);
    else if (field === "gradingPromptTemplate") setGradingPromptTemplateChanged(true);
    else if (field === "analysisPromptTemplate") setAnalysisPromptTemplateChanged(true);
    else if (field === "studentAiAnalysisPromptTemplate") setStudentAiAnalysisPromptTemplateChanged(true);
  };

  const handleInsertJsonStructure = async () => {
    try {
      const jsonTemplate = await getJsonStructureTemplate();
      const insertText = `\n\n输出JSON格式要求：\n${jsonTemplate}`;
      setSettings((prev) => ({ ...prev, promptTemplate: prev.promptTemplate + insertText }));
    } catch {
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
    setSettings((prev) => ({ ...prev, promptTemplate: defaultTemplate }));
  };

  const handleTestAIConnection = async () => {
    if (!editingProvider?.apiKey) {
      setError("请先配置 API Key");
      return;
    }
    setTestResult(null);
    try {
      const result = await testAIConnection("Hello, please respond with just 'Connection successful!'");
      setTestResult(`AI 连接测试成功！AI响应: ${result.response}`);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = axiosError.response?.data?.message || axiosError.message || "AI 连接测试失败";
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
    setSettings((prev) => ({ ...prev, gradingPromptTemplate: prev.gradingPromptTemplate + variables }));
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
    setSettings((prev) => ({ ...prev, analysisPromptTemplate: prev.analysisPromptTemplate + variables }));
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
    if (!confirm("确定要删除这个 AI Provider 吗？此操作不可撤销。")) return;
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

  // User management handlers
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingUser) {
        const updateData = { ...userFormData } as any;
        if (!updateData.password) delete updateData.password;
        await api.patch(`/api/users/${editingUser.id}`, updateData);
      } else {
        await api.post('/api/users', userFormData);
      }
      setShowUserModal(false);
      setEditingUser(null);
      setUserFormData({ username: '', email: '', password: '', name: '', role: 'STUDENT', isActive: true });
      loadUsers();
    } catch (error: any) {
      setError(error.response?.data?.message || error.message || '操作失败');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserFormData({
      username: user.username,
      email: user.email || '',
      password: '',
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    });
    setShowUserModal(true);
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`确定要删除用户 "${user.name}" 吗？`)) return;
    setError(null);
    try {
      await api.delete(`/api/users/${user.id}`);
      loadUsers();
    } catch (error: any) {
      setError(error.response?.data?.message || error.message || '删除失败');
    }
  };

  const getRoleName = (role: string) => {
    const roleMap: Record<string, string> = { 'ADMIN': '系统管理员', 'TEACHER': '教师', 'STUDENT': '学生' };
    return roleMap[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colorMap: Record<string, string> = {
      'ADMIN': 'bg-red-100 text-red-800',
      'TEACHER': 'bg-blue-100 text-blue-800',
      'STUDENT': 'bg-green-100 text-green-800'
    };
    return colorMap[role] || 'bg-gray-100 text-gray-800';
  };

  const tabs = [
    { id: "ai-provider" as TabType, label: "AI Provider 设置", icon: Cpu },
    { id: "prompts" as TabType, label: "提示词设置", icon: MessageSquare },
    ...(isAdmin ? [{ id: "users" as TabType, label: "用户设置", icon: Users }] : []),
  ];

  return (
    <>
      <div className="bg-slatebg text-ink-900 antialiased min-h-screen pt-28">
        <div className="mx-auto max-w-none px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-purple-100 p-3">
                <Settings className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-ink-900">系统设置</h1>
                <p className="text-ink-600">管理AI配置、提示词和用户</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b border-border">
            <nav className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? "border-purple-500 text-purple-600"
                      : "border-transparent text-ink-500 hover:text-ink-700 hover:border-gray-300"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Error/Success Message */}
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

          {loading && (
            <div className="rounded-2xl border border-border bg-white p-12 text-center">
              <p className="text-ink-700">加载中...</p>
            </div>
          )}

          {!loading && activeTab === "ai-provider" && (
            <AIProviderTab
              settings={settings}
              providers={providers}
              selectedProvider={selectedProvider}
              editingProvider={editingProvider}
              hasChanges={hasChanges}
              saving={saving}
              testResult={testResult}
              isTeacher={isTeacher}
              currentUser={currentUser}
              onProviderSelect={handleProviderSelect}
              onProviderFieldChange={handleProviderFieldChange}
              onSaveProvider={handleSaveProvider}
              onTestAIConnection={handleTestAIConnection}
              onDeleteAIProvider={handleDeleteAIProvider}
              onShowAddProviderModal={() => setShowAddProviderModal(true)}
            />
          )}

          {!loading && activeTab === "prompts" && (
            <PromptsTab
              settings={settings}
              savingPromptTemplate={savingPromptTemplate}
              savingGradingPromptTemplate={savingGradingPromptTemplate}
              savingAnalysisPromptTemplate={savingAnalysisPromptTemplate}
              savingStudentAiAnalysisPromptTemplate={savingStudentAiAnalysisPromptTemplate}
              promptTemplateChanged={promptTemplateChanged}
              gradingPromptTemplateChanged={gradingPromptTemplateChanged}
              analysisPromptTemplateChanged={analysisPromptTemplateChanged}
              studentAiAnalysisPromptTemplateChanged={studentAiAnalysisPromptTemplateChanged}
              onInputChange={handleInputChange}
              onSavePromptTemplate={handleSavePromptTemplate}
              onSaveGradingPromptTemplate={handleSaveGradingPromptTemplate}
              onSaveAnalysisPromptTemplate={handleSaveAnalysisPromptTemplate}
              onSaveStudentAiAnalysisPromptTemplate={handleSaveStudentAiAnalysisPromptTemplate}
              onInsertJsonStructure={handleInsertJsonStructure}
              onResetToDefault={handleResetToDefault}
              onInsertGradingVariables={handleInsertGradingVariables}
              onInsertAnalysisVariables={handleInsertAnalysisVariables}
              setSettings={setSettings}
            />
          )}

          {!loading && activeTab === "users" && isAdmin && (
            <UsersTab
              users={users}
              loading={usersLoading}
              onAddUser={() => {
                setEditingUser(null);
                setUserFormData({ username: '', email: '', password: '', name: '', role: 'STUDENT', isActive: true });
                setShowUserModal(true);
              }}
              onEditUser={handleEditUser}
              onDeleteUser={handleDeleteUser}
              getRoleName={getRoleName}
              getRoleColor={getRoleColor}
            />
          )}
        </div>
      </div>

      <AddAIProviderModal
        isOpen={showAddProviderModal}
        onClose={() => setShowAddProviderModal(false)}
        onSave={handleCreateAIProvider}
        userRole={currentUser?.role || "TEACHER"}
      />

      {/* User Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => { setShowUserModal(false); setError(null); }}
        title={editingUser ? '编辑用户' : '添加用户'}
      >
        <form onSubmit={handleUserSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
            <input
              type="text"
              required
              value={userFormData.username}
              onChange={(e) => setUserFormData(prev => ({ ...prev, username: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              disabled={!!editingUser}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
            <input
              type="text"
              required
              value={userFormData.name}
              onChange={(e) => setUserFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
            <input
              type="email"
              value={userFormData.email}
              onChange={(e) => setUserFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              密码 {editingUser && '(留空则不修改)'}
            </label>
            <input
              type="password"
              required={!editingUser}
              value={userFormData.password}
              onChange={(e) => setUserFormData(prev => ({ ...prev, password: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
            <select
              value={userFormData.role}
              onChange={(e) => setUserFormData(prev => ({ ...prev, role: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="STUDENT">学生</option>
              <option value="TEACHER">教师</option>
              <option value="ADMIN">系统管理员</option>
            </select>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="userIsActive"
              checked={userFormData.isActive}
              onChange={(e) => setUserFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="mr-2"
            />
            <label htmlFor="userIsActive" className="text-sm font-medium text-gray-700">启用用户</label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowUserModal(false)}>取消</Button>
            <Button type="submit">{editingUser ? '更新' : '创建'}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// AI Provider Tab Component
function AIProviderTab({
  settings, providers, selectedProvider, editingProvider, hasChanges, saving, testResult, isTeacher, currentUser,
  onProviderSelect, onProviderFieldChange, onSaveProvider, onTestAIConnection, onDeleteAIProvider, onShowAddProviderModal
}: any) {
  const isSystemProvider = (id: string) => ["gpt-4", "gpt-3.5-turbo", "qwen-turbo", "qwen-plus", "qwen-max"].includes(id);
  const isProviderEditable = editingProvider && (!isTeacher || !isSystemProvider(editingProvider.id || ""));

  return (
    <div className="rounded-3xl border border-border bg-white p-6 shadow-soft">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink-900">AI Provider 配置</h2>
        <Button variant="outline" size="sm" onClick={onShowAddProviderModal}>
          <Plus className="h-4 w-4 mr-2" />新增 Provider
        </Button>
      </div>

      <div className="mb-4 rounded-xl border border-gray-300 bg-gray-50 p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-gray-600" />
              <div className="text-sm font-medium text-gray-800">当前系统默认 AI Provider</div>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {providers.find((p: any) => p.id === settings.aiProvider)?.name || settings.aiProvider}
              {settings.aiModel && ` (${settings.aiModel})`}
            </div>
          </div>
          <div className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-md">系统配置</div>
        </div>
      </div>

      <div className="mb-6">
        <label className="mb-3 block text-sm font-semibold text-ink-900">
          选择 AI Provider{" "}
          {isTeacher && <span className="text-xs text-gray-500">(系统配置为只读，可选择自定义配置)</span>}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {providers.map((provider: any, index: number) => {
            const isSysProvider = isSystemProvider(provider.id);
            const isCustomProvider = !isSysProvider;
            const colors = [
              "bg-blue-50 border-blue-200 hover:bg-blue-100",
              "bg-green-50 border-green-200 hover:bg-green-100",
              "bg-purple-50 border-purple-200 hover:bg-purple-100",
              "bg-orange-50 border-orange-200 hover:bg-orange-100",
            ];
            let colorClass = isTeacher && isSysProvider
              ? "bg-gray-50 border-gray-200"
              : isCustomProvider
              ? "bg-yellow-50 border-yellow-200 hover:bg-yellow-100"
              : colors[index % colors.length];
            const isProviderDisabled = isTeacher && isSysProvider;

            return (
              <button
                key={provider.id}
                onClick={() => !isProviderDisabled && onProviderSelect(provider.id)}
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
                    {isProviderDisabled && <Lock className="h-3 w-3 text-gray-500" />}
                    {isCustomProvider && <span className="text-xs bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded">自定义</span>}
                  </div>
                  <div className="text-xs text-ink-600">{provider.id}</div>
                </div>
                {selectedProvider === provider.id && settings.aiProvider === provider.id && (
                  <Check className={`h-4 w-4 ${isProviderDisabled ? "text-gray-600" : "text-blue-600"}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {editingProvider && (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-ink-900 flex items-center gap-2">
              Provider 名称 {!isProviderEditable && <Lock className="h-3 w-3 text-gray-500" />}
            </label>
            <input
              type="text"
              className={`w-full rounded-xl border px-3 py-2 text-sm ${!isProviderEditable ? "border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed" : "border-border bg-white text-ink-900"}`}
              placeholder="Provider 名称"
              value={editingProvider?.name || ""}
              onChange={(e) => isProviderEditable && onProviderFieldChange("name", e.target.value)}
              disabled={!isProviderEditable}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-ink-900 flex items-center gap-2">
              API Key {!isProviderEditable && <Lock className="h-3 w-3 text-gray-500" />}
            </label>
            <input
              type="password"
              className={`w-full rounded-xl border px-3 py-2 text-sm ${!isProviderEditable ? "border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed" : "border-border bg-white text-ink-900"}`}
              placeholder="sk-..."
              value={editingProvider.apiKey || ""}
              onChange={(e) => isProviderEditable && onProviderFieldChange("apiKey", e.target.value)}
              disabled={!isProviderEditable}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-ink-900 flex items-center gap-2">
              Base URL {!isProviderEditable && <Lock className="h-3 w-3 text-gray-500" />}
            </label>
            <input
              type="url"
              className={`w-full rounded-xl border px-3 py-2 text-sm ${!isProviderEditable ? "border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed" : "border-border bg-white text-ink-900"}`}
              placeholder="https://api.openai.com/v1/chat/completions"
              value={editingProvider.baseUrl || ""}
              onChange={(e) => isProviderEditable && onProviderFieldChange("baseUrl", e.target.value)}
              disabled={!isProviderEditable}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-ink-900 flex items-center gap-2">
              Model {!isProviderEditable && <Lock className="h-3 w-3 text-gray-500" />}
            </label>
            <input
              type="text"
              className={`w-full rounded-xl border px-3 py-2 text-sm ${!isProviderEditable ? "border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed" : "border-border bg-white text-ink-900"}`}
              placeholder="gpt-4o"
              value={editingProvider.model || ""}
              onChange={(e) => isProviderEditable && onProviderFieldChange("model", e.target.value)}
              disabled={!isProviderEditable}
            />
          </div>

          {hasChanges && isProviderEditable && (
            <div className="flex gap-2">
              <Button onClick={onSaveProvider} disabled={saving} className="flex-1">
                <Save className="h-4 w-4 mr-2" />{saving ? "保存中..." : "保存设置"}
              </Button>
              <Button onClick={() => onProviderSelect(selectedProvider)} variant="outline" className="flex-1 text-gray-600 border-gray-300 hover:bg-gray-50">
                取消更改
              </Button>
            </div>
          )}

          {!isProviderEditable && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Lock className="h-4 w-4" /><span>系统级 AI Provider 配置无法修改</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Button
          onClick={onTestAIConnection}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white border-green-600"
          variant="outline"
          disabled={!editingProvider?.apiKey || (isTeacher && isSystemProvider(editingProvider?.id || ""))}
        >
          {isTeacher && isSystemProvider(editingProvider?.id || "") ? (
            <><Lock className="h-4 w-4 mr-2" />无法测试连接</>
          ) : "测试 AI 连接"}
        </Button>
      </div>

      {testResult && (
        <div className={`mt-4 rounded-xl border p-3 text-sm ${testResult.includes("成功") ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}>
          {testResult}
        </div>
      )}

      {editingProvider && !isSystemProvider(editingProvider.id || "") && (currentUser?.role === "ADMIN" || !isTeacher) && (
        <div className="mt-4">
          <Button onClick={() => onDeleteAIProvider(editingProvider.id || "")} className="w-full bg-red-600 hover:bg-red-700 text-white border-red-600">
            <Trash2 className="h-4 w-4 mr-2" />删除此 Provider
          </Button>
        </div>
      )}
    </div>
  );
}

// Prompts Tab Component
function PromptsTab({
  settings, savingPromptTemplate, savingGradingPromptTemplate, savingAnalysisPromptTemplate,
  savingStudentAiAnalysisPromptTemplate, promptTemplateChanged, gradingPromptTemplateChanged,
  analysisPromptTemplateChanged, studentAiAnalysisPromptTemplateChanged, onInputChange,
  onSavePromptTemplate, onSaveGradingPromptTemplate, onSaveAnalysisPromptTemplate,
  onSaveStudentAiAnalysisPromptTemplate, onInsertJsonStructure, onResetToDefault,
  onInsertGradingVariables, onInsertAnalysisVariables, setSettings
}: any) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* 试卷生成提示词 */}
      <div className="rounded-3xl border border-border bg-white p-6 shadow-soft">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-900">试卷生成提示词配置</h2>
          <div className="flex gap-2">
            <Button onClick={onInsertJsonStructure} variant="outline" size="sm">插入JSON结构</Button>
            <Button onClick={onResetToDefault} variant="outline" size="sm">重置默认</Button>
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink-900">提示词模板</label>
          <textarea
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900 min-h-[200px] font-mono"
            value={settings.promptTemplate}
            onChange={(e) => onInputChange("promptTemplate", e.target.value)}
            placeholder="输入AI提示词模板..."
          />
          <p className="mt-1 text-xs text-ink-700">提示词模板用于指导AI如何根据试卷图像生成题目。此为您的个人设置。</p>
        </div>
        <Button
          onClick={onSavePromptTemplate}
          disabled={savingPromptTemplate || !promptTemplateChanged}
          className={`mt-4 w-full ${promptTemplateChanged ? "bg-ink-900 hover:bg-ink-800 text-white" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}
        >
          <Save className="h-4 w-4 mr-2" />{savingPromptTemplate ? "保存中..." : "保存提示词设置"}
        </Button>
      </div>

      {/* AI评分提示词 */}
      <div className="rounded-3xl border border-border bg-white p-6 shadow-soft">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-900">AI评分提示词配置</h2>
          <Button onClick={onInsertGradingVariables} variant="outline" size="sm">插入支持变量</Button>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink-900">评分提示词模板</label>
          <textarea
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900 min-h-[200px] font-mono"
            value={settings.gradingPromptTemplate}
            onChange={(e) => onInputChange("gradingPromptTemplate", e.target.value)}
            placeholder="输入AI评分提示词模板..."
          />
          <p className="mt-1 text-xs text-ink-700">
            评分提示词模板用于指导AI如何评分学生答案。支持变量：{"{questionContent}"}, {"{questionType}"}, {"{referenceAnswer}"}, {"{studentAnswer}"}, {"{maxScore}"}。
          </p>
        </div>
        <Button
          onClick={onSaveGradingPromptTemplate}
          disabled={savingGradingPromptTemplate || !gradingPromptTemplateChanged}
          className={`mt-4 w-full ${gradingPromptTemplateChanged ? "bg-ink-900 hover:bg-ink-800 text-white" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}
        >
          <Save className="h-4 w-4 mr-2" />{savingGradingPromptTemplate ? "保存中..." : "保存评分提示词设置"}
        </Button>
      </div>

      {/* 评分管理AI分析提示词 */}
      <div className="rounded-3xl border border-border bg-white p-6 shadow-soft">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-900">评分管理 AI分析提示词配置</h2>
          <Button
            onClick={() => {
              const variables = `\n支持的变量：\n- {studentLabel} - 学生显示名/账号\n- {studentPrompt} - 学生个性化提示词\n- {payload} - 评分详情JSON`;
              setSettings((prev: any) => ({ ...prev, studentAiAnalysisPromptTemplate: prev.studentAiAnalysisPromptTemplate + variables }));
            }}
            variant="outline"
            size="sm"
          >
            插入支持变量
          </Button>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink-900">学生个人AI分析提示词模板</label>
          <textarea
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900 min-h-[200px] font-mono"
            value={settings.studentAiAnalysisPromptTemplate}
            onChange={(e) => onInputChange("studentAiAnalysisPromptTemplate", e.target.value)}
            placeholder="输入评分管理-学生AI分析提示词模板..."
          />
          <p className="mt-1 text-xs text-ink-700">用于评分管理页面对单个学生生成AI分析报告。此为您的个人设置。</p>
        </div>
        <Button
          onClick={onSaveStudentAiAnalysisPromptTemplate}
          disabled={savingStudentAiAnalysisPromptTemplate || !studentAiAnalysisPromptTemplateChanged}
          className={`mt-4 w-full ${studentAiAnalysisPromptTemplateChanged ? "bg-ink-900 hover:bg-ink-800 text-white" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}
        >
          <Save className="h-4 w-4 mr-2" />{savingStudentAiAnalysisPromptTemplate ? "保存中..." : "保存评分管理AI提示词设置"}
        </Button>
      </div>

      {/* 分析报告提示词 */}
      <div className="rounded-3xl border border-border bg-white p-6 shadow-soft">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-900">分析报告提示词配置</h2>
          <Button onClick={onInsertAnalysisVariables} variant="outline" size="sm">插入支持变量</Button>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink-900">分析报告提示词模板</label>
          <textarea
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900 min-h-[200px] font-mono"
            value={settings.analysisPromptTemplate}
            onChange={(e) => onInputChange("analysisPromptTemplate", e.target.value)}
            placeholder="输入AI分析报告提示词模板..."
          />
          <p className="mt-1 text-xs text-ink-700">分析报告提示词模板用于指导AI如何生成考试分析报告。此为您的个人设置。</p>
        </div>
        <Button
          onClick={onSaveAnalysisPromptTemplate}
          disabled={savingAnalysisPromptTemplate || !analysisPromptTemplateChanged}
          className={`mt-4 w-full ${analysisPromptTemplateChanged ? "bg-ink-900 hover:bg-ink-800 text-white" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}
        >
          <Save className="h-4 w-4 mr-2" />{savingAnalysisPromptTemplate ? "保存中..." : "保存分析提示词设置"}
        </Button>
      </div>
    </div>
  );
}

// Users Tab Component
function UsersTab({ users, loading, onAddUser, onEditUser, onDeleteUser, getRoleName, getRoleColor }: any) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-white p-12 text-center">
        <p className="text-ink-700">加载用户数据中...</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-white shadow-soft">
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-blue-100 p-2">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-ink-900">用户管理</h2>
        </div>
        <Button onClick={onAddUser} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />添加用户
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-ink-700">用户名</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-ink-700">姓名</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-ink-700">邮箱</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-ink-700">角色</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-ink-700">状态</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-ink-700">创建时间</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-ink-700">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user: any) => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-sm font-medium text-ink-900">{user.username}</td>
                <td className="px-6 py-4 text-sm text-ink-700">{user.name}</td>
                <td className="px-6 py-4 text-sm text-ink-700">{user.email || '-'}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getRoleColor(user.role)}`}>
                    {getRoleName(user.role)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {user.isActive ? '启用' : '禁用'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-ink-700">{new Date(user.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEditUser(user)} className="flex items-center gap-1">
                      编辑
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onDeleteUser(user)} className="flex items-center gap-1 text-red-600 hover:text-red-700">
                      <Trash2 className="h-3 w-3" />删除
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
