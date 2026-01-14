import { useEffect, useState } from "react";
import { Save, Plus, Lock, Trash2, Settings, Users, MessageSquare, Cpu, Star, Globe, User, Edit, Zap } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import {
  getUserSettings,
  updateUserSetting,
  getJsonStructureTemplate,
  getDefaultProviderId,
  setDefaultProvider,
  deleteUserSetting,
  type SystemSettings,
} from "@/services/settings";
import { listStudentsForPromptManagement } from "@/services/students";
import { testAIConnection } from "@/services/settings";
import { getCurrentUser } from "@/utils/auth";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingPromptTemplate, setSavingPromptTemplate] = useState(false);
  const [savingGradingPromptTemplate, setSavingGradingPromptTemplate] = useState(false);
  const [savingAnalysisPromptTemplate, setSavingAnalysisPromptTemplate] = useState(false);
  const [savingStudentAiAnalysisPromptTemplate, setSavingStudentAiAnalysisPromptTemplate] = useState(false);
  const [promptTemplateChanged, setPromptTemplateChanged] = useState(false);
  const [gradingPromptTemplateChanged, setGradingPromptTemplateChanged] = useState(false);
  const [analysisPromptTemplateChanged, setAnalysisPromptTemplateChanged] = useState(false);
  const [studentAiAnalysisPromptTemplateChanged, setStudentAiAnalysisPromptTemplateChanged] = useState(false);

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
      const userSettingsData = await getUserSettings();
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
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
      setError(axiosError.response?.data?.message || axiosError.message || "加载设置失败");
    } finally {
      setLoading(false);
    }
  };

  const loadStudentsForPromptManagement = async () => {
    if (!isTeacher) {
      // 如果不是教师，清空学生列表
      setStudents([]);
      setSelectedStudentId(null);
      return;
    }
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
      // 添加更具体的错误信息
      if (err.response) {
        console.error("Response error:", err.response.status, err.response.data);
      } else if (err.request) {
        console.error("Request error:", err.request);
      } else {
        console.error("General error:", err.message);
      }
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

  const handleResetToDefault = async (templateType: string = 'PROMPT_TEMPLATE') => {
    try {
      // 删除用户特定的提示词设置，这样就会回退到系统默认值
      await deleteUserSetting(templateType);

      // 重新加载设置以获取系统默认值
      const updatedSettings = await getUserSettings();
      setSettings(updatedSettings);

      // 重置相应的变更标志
      if (templateType === 'PROMPT_TEMPLATE') {
        setPromptTemplateChanged(false);
      } else if (templateType === 'GRADING_PROMPT_TEMPLATE') {
        setGradingPromptTemplateChanged(false);
      } else if (templateType === 'ANALYSIS_PROMPT_TEMPLATE') {
        setAnalysisPromptTemplateChanged(false);
      } else if (templateType === 'STUDENT_AI_ANALYSIS_PROMPT_TEMPLATE') {
        setStudentAiAnalysisPromptTemplateChanged(false);
      }

      let message = "";
      switch(templateType) {
        case 'PROMPT_TEMPLATE':
          message = "试卷生成提示词";
          break;
        case 'GRADING_PROMPT_TEMPLATE':
          message = "AI评分提示词";
          break;
        case 'ANALYSIS_PROMPT_TEMPLATE':
          message = "分析报告提示词";
          break;
        case 'STUDENT_AI_ANALYSIS_PROMPT_TEMPLATE':
          message = "学生AI分析提示词";
          break;
        default:
          message = "提示词";
      }

      setError(`${message}已重置为系统默认值`);
    } catch (error) {
      console.error('重置提示词失败:', error);
      setError("重置失败：" + (error.response?.data?.message || error.message));
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
            <AIProviderTab />
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

// AI Provider interface for the tab
interface AIProviderItem {
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

// AI Provider Tab Component
function AIProviderTab() {
  const [providers, setProviders] = useState<AIProviderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProviderItem | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    apiKey: '',
    baseUrl: '',
    model: '',
    isGlobal: false,
    isActive: true,
  });
  const [defaultProviderId, setDefaultProviderIdState] = useState<string | null>(null);

  const currentUser = getCurrentUser();
  const userRole = currentUser?.role || 'TEACHER';

  const loadProviders = async () => {
    try {
      const [providersResponse, defaultId] = await Promise.all([
        api.get('/api/ai-providers'),
        getDefaultProviderId().catch(() => null),
      ]);
      setProviders(providersResponse.data);
      setDefaultProviderIdState(defaultId);
    } catch (error) {
      console.error('加载AI Provider失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const canEditProvider = (provider: AIProviderItem): boolean => {
    if (userRole === 'ADMIN') return true;
    if (provider.isGlobal) return false;
    return provider.createdBy === currentUser?.id;
  };

  const canDeleteProvider = (provider: AIProviderItem): boolean => {
    if (userRole === 'ADMIN') return true;
    if (provider.isGlobal) return false;
    return provider.createdBy === currentUser?.id;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProvider) {
        if (!canEditProvider(editingProvider)) {
          alert('您没有权限编辑此Provider');
          return;
        }
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
    setFormData({ name: '', apiKey: '', baseUrl: '', model: '', isGlobal: false, isActive: true });
    setTestResult(null);
  };

  const handleTestAIConnection = async () => {
    const apiKeyInput = document.querySelector('input[type="password"]') as HTMLInputElement;
    const currentApiKey = apiKeyInput?.value || '';
    if (!currentApiKey.trim()) {
      setTestResult("请先输入 API Key");
      return;
    }
    setTestLoading(true);
    setTestResult(null);
    try {
      const result = await testAIConnection("Hello, please respond with just 'Connection successful!'");
      setTestResult(`✅ AI 连接测试成功！AI响应: ${result.response}`);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || "连接测试失败";
      setTestResult(`❌ ${errorMessage}`);
    } finally {
      setTestLoading(false);
    }
  };

  const handleEdit = (provider: AIProviderItem) => {
    if (!canEditProvider(provider)) {
      alert('您没有权限编辑此Provider');
      return;
    }
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

  const handleDelete = async (provider: AIProviderItem) => {
    if (!canDeleteProvider(provider)) {
      alert('您没有权限删除此Provider');
      return;
    }
    if (!confirm(`确定要删除AI Provider "${provider.name}" 吗？`)) return;
    try {
      await api.delete(`/api/ai-providers/${provider.id}`);
      loadProviders();
    } catch (error: any) {
      alert('删除失败: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleSetDefault = async (provider: AIProviderItem) => {
    if (userRole !== 'ADMIN') {
      alert('只有管理员可以设置系统默认Provider');
      return;
    }
    if (!confirm(`确定要将 "${provider.name}" 设为系统默认AI Provider吗？`)) return;
    try {
      const result = await setDefaultProvider(provider.id);
      alert(result.message);
      loadProviders();
    } catch (error: any) {
      alert('设置失败: ' + (error.response?.data?.message || error.message));
    }
  };

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
            <h2 className="text-xl font-semibold text-ink-900">AI Provider 列表</h2>
            <Button variant="outline" size="sm" onClick={() => { resetForm(); setEditingProvider(null); setShowModal(true); }}>
              <Plus className="h-4 w-4 mr-2" />添加 Provider
            </Button>
          </div>
          
          {providers.length === 0 ? (
            <div className="text-center py-12">
              <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无AI Provider</h3>
              <p className="text-gray-500 mb-6">请添加AI服务提供商配置</p>
              <Button onClick={() => setShowModal(true)}>添加第一个 Provider</Button>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {providers.map((provider, index) => {
                // 柔和的颜色主题，符合现代网页风格
                const colorThemes = [
                  { border: 'border-purple-200', from: 'from-purple-50', iconBg: 'bg-purple-100', iconText: 'text-purple-600', hover: 'hover:border-purple-300' },
                  { border: 'border-teal-200', from: 'from-teal-50', iconBg: 'bg-teal-100', iconText: 'text-teal-600', hover: 'hover:border-teal-300' },
                  { border: 'border-orange-200', from: 'from-orange-50', iconBg: 'bg-orange-100', iconText: 'text-orange-600', hover: 'hover:border-orange-300' },
                  { border: 'border-pink-200', from: 'from-pink-50', iconBg: 'bg-pink-100', iconText: 'text-pink-600', hover: 'hover:border-pink-300' },
                  { border: 'border-cyan-200', from: 'from-cyan-50', iconBg: 'bg-cyan-100', iconText: 'text-cyan-600', hover: 'hover:border-cyan-300' },
                  { border: 'border-amber-200', from: 'from-amber-50', iconBg: 'bg-amber-100', iconText: 'text-amber-600', hover: 'hover:border-amber-300' },
                  { border: 'border-indigo-200', from: 'from-indigo-50', iconBg: 'bg-indigo-100', iconText: 'text-indigo-600', hover: 'hover:border-indigo-300' },
                  { border: 'border-emerald-200', from: 'from-emerald-50', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600', hover: 'hover:border-emerald-300' },
                ];
                const theme = colorThemes[index % colorThemes.length];
                const isDefault = defaultProviderId === provider.id;

                return (
                  <div 
                    key={provider.id} 
                    className={`rounded-2xl border-2 bg-gradient-to-br p-6 shadow-lg transition-all ${
                      isDefault
                        ? 'border-blue-400 from-blue-50 to-white ring-2 ring-blue-200 shadow-blue-100'
                        : `${theme.border} ${theme.from} to-white ${theme.hover}`
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-full p-2 ${isDefault ? 'bg-blue-100' : theme.iconBg}`}>
                          {provider.isGlobal ? (
                            <Globe className={`h-5 w-5 ${isDefault ? 'text-blue-600' : theme.iconText}`} />
                          ) : (
                            <User className={`h-5 w-5 ${isDefault ? 'text-blue-600' : theme.iconText}`} />
                          )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-bold text-gray-900">{provider.name}</h3>
                          {defaultProviderId === provider.id && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              <Star className="h-3 w-3" />
                              系统默认
                            </span>
                          )}
                          {provider.isGlobal && !canEditProvider(provider) && (
                            <div title="系统默认，不可修改">
                              <Lock className="h-4 w-4 text-gray-500" />
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {provider.isGlobal ? '全局配置' : '个人配置'}
                          {provider.creator && ` · 创建者: ${provider.creator.name}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        provider.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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
                      className="flex-1 flex items-center justify-center gap-2"
                      disabled={!canEditProvider(provider)}
                    >
                      <Edit className="h-4 w-4" />
                      编辑
                    </Button>
                    {userRole === 'ADMIN' && (
                      <Button 
                        onClick={() => handleSetDefault(provider)}
                        variant="outline"
                        className={`flex items-center justify-center gap-2 ${
                          defaultProviderId === provider.id 
                            ? 'bg-blue-50 text-blue-600 border-blue-200' 
                            : 'text-blue-600 hover:text-blue-700'
                        }`}
                        disabled={defaultProviderId === provider.id || !provider.isActive}
                      >
                        <Star className="h-4 w-4" />
                        {defaultProviderId === provider.id ? '默认' : '设为默认'}
                      </Button>
                    )}
                    <Button 
                      onClick={() => handleDelete(provider)}
                      variant="outline"
                      className="flex items-center justify-center gap-2 text-red-600 hover:text-red-700"
                      disabled={!canDeleteProvider(provider) || defaultProviderId === provider.id}
                    >
                      <Trash2 className="h-4 w-4" />
                      删除
                    </Button>
                  </div>
                  </div>
                );
              })}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Provider 名称</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="例如: OpenAI GPT-4"
              disabled={editingProvider?.isGlobal && userRole !== 'ADMIN'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <div className="flex gap-2">
              <input
                type="password"
                required
                value={formData.apiKey}
                onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="sk-..."
              />
              <Button
                type="button"
                onClick={handleTestAIConnection}
                disabled={testLoading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                {testLoading ? '测试中...' : '测试连接'}
              </Button>
            </div>
            {testResult && (
              <div className={`mt-2 p-2 rounded text-sm ${
                testResult.startsWith('✅') 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {testResult}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base URL (可选)</label>
            <input
              type="url"
              value={formData.baseUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, baseUrl: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="https://api.openai.com/v1"
              disabled={editingProvider?.isGlobal && userRole !== 'ADMIN'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">模型名称</label>
            <input
              type="text"
              required
              value={formData.model}
              onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="gpt-4, claude-3, qwen-turbo 等"
              disabled={editingProvider?.isGlobal && userRole !== 'ADMIN'}
            />
          </div>

          {userRole === 'ADMIN' && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="providerIsGlobal"
                checked={formData.isGlobal}
                onChange={(e) => setFormData(prev => ({ ...prev, isGlobal: e.target.checked }))}
                className="mr-2"
              />
              <label htmlFor="providerIsGlobal" className="text-sm font-medium text-gray-700">
                设为全局 Provider (所有用户可见)
              </label>
            </div>
          )}

          <div className="flex items-center">
            <input
              type="checkbox"
              id="providerIsActive"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="mr-2"
            />
            <label htmlFor="providerIsActive" className="text-sm font-medium text-gray-700">
              启用此 Provider
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              取消
            </Button>
            <Button type="submit">
              {editingProvider ? '更新' : '创建'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
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
            <Button onClick={() => onResetToDefault('PROMPT_TEMPLATE')} variant="outline" size="sm">重置默认</Button>
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
          <div className="flex gap-2">
            <Button onClick={onInsertGradingVariables} variant="outline" size="sm">插入支持变量</Button>
            <Button onClick={() => onResetToDefault('GRADING_PROMPT_TEMPLATE')} variant="outline" size="sm">重置默认</Button>
          </div>
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
          <div className="flex gap-2">
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
            <Button onClick={() => onResetToDefault('STUDENT_AI_ANALYSIS_PROMPT_TEMPLATE')} variant="outline" size="sm">重置默认</Button>
          </div>
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
          <div className="flex gap-2">
            <Button onClick={onInsertAnalysisVariables} variant="outline" size="sm">插入支持变量</Button>
            <Button onClick={() => onResetToDefault('ANALYSIS_PROMPT_TEMPLATE')} variant="outline" size="sm">重置默认</Button>
          </div>
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
