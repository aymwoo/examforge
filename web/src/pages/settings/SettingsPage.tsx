import { useEffect, useState } from "react";
import { Settings, Users, MessageSquare, Cpu } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import {
  getUserSettings,
  updateUserSetting,
  getJsonStructureTemplate,
  getDefaultProviderId,
  setDefaultProvider,
  type SystemSettings,
} from "@/services/settings";
import { listStudentsForPromptManagement } from "@/services/students";
import { getCurrentUser } from "@/utils/auth";
import api from "@/services/api";
import { AIProviderTab } from "./components/AIProviderTab.tsx";
import { PromptsTab } from "./components/PromptsTab.tsx";
import { UsersTab } from "./components/UsersTab.tsx";
import type {
  AIProviderFormData,
  AIProviderItem,
  TabType,
  User,
} from "./components/types.ts";

export default function SettingsPage() {
  const { success: showSuccess, error: showError } = useToast();
  const currentUser = getCurrentUser();
  const isTeacher = currentUser?.role === "TEACHER";
  const isAdmin = currentUser?.role === "ADMIN";
  const userRole = currentUser?.role || "TEACHER";

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("ai-provider");

  // AI Provider state
  const [providers, setProviders] = useState<AIProviderItem[]>([]);
  const [defaultProviderId, setDefaultProviderId] = useState<string | null>(
    null,
  );

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
    jsonGenerationPromptTemplate: "",
  });

  // AI Provider form state
  const [showModal, setShowModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProviderItem | null>(
    null,
  );
  const [formData, setFormData] = useState<AIProviderFormData>({
    name: "",
    apiKey: "",
    baseUrl: "",
    model: "",
    isGlobal: false,
    isActive: true,
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
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingPromptTemplate, setSavingPromptTemplate] = useState(false);
  const [savingGradingPromptTemplate, setSavingGradingPromptTemplate] =
    useState(false);
  const [savingAnalysisPromptTemplate, setSavingAnalysisPromptTemplate] =
    useState(false);
  const [
    savingStudentAiAnalysisPromptTemplate,
    setSavingStudentAiAnalysisPromptTemplate,
  ] = useState(false);
  const [
    savingJsonGenerationPromptTemplate,
    setSavingJsonGenerationPromptTemplate,
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
  const [
    jsonGenerationPromptTemplateChanged,
    setJsonGenerationPromptTemplateChanged,
  ] = useState(false);

  // Users tab state
  const [users, setUsers] = useState<User[]>([]);
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState({
    username: "",
    email: "",
    password: "",
    name: "",
    role: "STUDENT",
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

      if (!userSettingsData.jsonGenerationPromptTemplate) {
        const defaultJsonGenerationPrompt = `你是一个专业的题目生成AI助手。
根据用户提供的试卷图像或文本，生成一次线上考试的JSON格式数据。

要求：
1. 根据输入识别所有题目
2. 确保题目格式正确，包括题干、选项（选择题）、答案、解析
3. 为每道题提供合理的难度（1-5）、知识点和标签
4. 输出严格的JSON格式，格式要求：
{
  "questions": [
    {
      "content": "题干内容",
      "type": "题型(SINGLE_CHOICE/MULTIPLE_CHOICE/TRUE_FALSE/FILL_BLANK/MATCHING/ESSAY)",
      "options": [{"label": "A", "content": "选项1"}, ...],
      "answer": "正确答案",
      "explanation": "题目解析",
      "matching": {
        "leftItems": ["左侧1", "左侧2"],
        "rightItems": ["右侧A", "右侧B"],
        "matches": {"左侧1": "右侧A", "左侧2": "右侧B"}
      },
      "difficulty": 1,
      "tags": ["标签1", "标签2"],
      "knowledgePoint": "知识点"
    }
  ]
}

数学公式表示：
- 行内公式：使用 $...$ 或 \\( ... \\) 包围
- 块级公式：使用 $$...$$ 或 \\[ ... \\] 包围

请只返回JSON格式的题目数据，不要包含其他说明文字。`;
        setSettings((prev) => ({
          ...prev,
          jsonGenerationPromptTemplate: defaultJsonGenerationPrompt,
        }));
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
        const stillExists = selectedStudentId
          ? result.data.some((s) => s.id === selectedStudentId)
          : false;
        if (!stillExists) setSelectedStudentId(result.data[0].id);
      } else {
        setSelectedStudentId(null);
      }
    } catch (err: any) {
      console.error("Failed to load students for prompt management", err);
      // 添加更具体的错误信息
      if (err.response) {
        console.error(
          "Response error:",
          err.response.status,
          err.response.data,
        );
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
      const response = await api.get("/api/users", {
        params: {
          page: userPage,
          limit: 10,
        },
      });
      setUsers(response.data.data);
      setUserTotalPages(response.data.meta.totalPages);
    } catch (error) {
      console.error("加载用户失败:", error);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    loadProviders();
  }, []);

  // 加载AI Providers
  const loadProviders = async () => {
    try {
      const [providersResponse, defaultId] = await Promise.all([
        api.get("/api/ai-providers"),
        getDefaultProviderId().catch(() => null),
      ]);
      setProviders(providersResponse.data);
      setDefaultProviderId(defaultId);
    } catch (error) {
      console.error("加载AI Providers失败:", error);
      // 不显示错误，因为这不应该阻止用户使用其他功能
    }
  };

  useEffect(() => {
    loadStudentsForPromptManagement();
  }, [isTeacher, studentSearch, studentPage]);

  useEffect(() => {
    if (activeTab === "users" && isAdmin) {
      loadUsers();
    }
  }, [activeTab, isAdmin, userPage]);

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

  const handleSaveJsonGenerationPromptTemplate = async () => {
    setSavingJsonGenerationPromptTemplate(true);
    setError(null);
    try {
      await updateUserSetting(
        "JSON_GENERATION_PROMPT_TEMPLATE",
        settings.jsonGenerationPromptTemplate,
      );
      setJsonGenerationPromptTemplateChanged(false);
      setError("AI生成JSON格式提示词保存成功");
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
      setSavingJsonGenerationPromptTemplate(false);
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
    if (field === "promptTemplate") setPromptTemplateChanged(true);
    else if (field === "gradingPromptTemplate")
      setGradingPromptTemplateChanged(true);
    else if (field === "analysisPromptTemplate")
      setAnalysisPromptTemplateChanged(true);
    else if (field === "studentAiAnalysisPromptTemplate")
      setStudentAiAnalysisPromptTemplateChanged(true);
    else if (field === "jsonGenerationPromptTemplate")
      setJsonGenerationPromptTemplateChanged(true);
  };

  const handleInsertJsonStructure = async () => {
    try {
      const jsonTemplate = await getJsonStructureTemplate();
      const insertText = `\n\n输出JSON格式要求：\n${jsonTemplate}`;
      setSettings((prev) => ({
        ...prev,
        promptTemplate: prev.promptTemplate + insertText,
      }));
    } catch {
      setError("获取JSON结构模板失败");
    }
  };

  const handleResetToDefault = async (
    templateType: string = "PROMPT_TEMPLATE",
  ) => {
    try {
      // 获取系统默认值而不是直接删除用户设置
      const response = await api.post("/api/settings/default-prompt-template", {
        templateType,
      });
      const defaultTemplate = response.data.template;

      // 只更新本地状态，不保存到数据库
      setSettings((prev) => {
        switch (templateType) {
          case "PROMPT_TEMPLATE":
            return { ...prev, promptTemplate: defaultTemplate };
          case "GRADING_PROMPT_TEMPLATE":
            return { ...prev, gradingPromptTemplate: defaultTemplate };
          case "ANALYSIS_PROMPT_TEMPLATE":
            return { ...prev, analysisPromptTemplate: defaultTemplate };
          case "STUDENT_AI_ANALYSIS_PROMPT_TEMPLATE":
            return {
              ...prev,
              studentAiAnalysisPromptTemplate: defaultTemplate,
            };
          case "JSON_GENERATION_PROMPT_TEMPLATE":
            return { ...prev, jsonGenerationPromptTemplate: defaultTemplate };
          default:
            return prev;
        }
      });

      // 设置变更标志为true，以便用户知道需要保存
      switch (templateType) {
        case "PROMPT_TEMPLATE":
          setPromptTemplateChanged(true);
          break;
        case "GRADING_PROMPT_TEMPLATE":
          setGradingPromptTemplateChanged(true);
          break;
        case "ANALYSIS_PROMPT_TEMPLATE":
          setAnalysisPromptTemplateChanged(true);
          break;
        case "STUDENT_AI_ANALYSIS_PROMPT_TEMPLATE":
          setStudentAiAnalysisPromptTemplateChanged(true);
          break;
        case "JSON_GENERATION_PROMPT_TEMPLATE":
          setJsonGenerationPromptTemplateChanged(true);
          break;
      }

      let message = "";
      switch (templateType) {
        case "PROMPT_TEMPLATE":
          message = "试卷生成提示词";
          break;
        case "GRADING_PROMPT_TEMPLATE":
          message = "AI评分提示词";
          break;
        case "ANALYSIS_PROMPT_TEMPLATE":
          message = "分析报告提示词";
          break;
        case "STUDENT_AI_ANALYSIS_PROMPT_TEMPLATE":
          message = "学生AI分析提示词";
          break;
        case "JSON_GENERATION_PROMPT_TEMPLATE":
          message = "AI生成JSON格式提示词";
          break;
        default:
          message = "提示词";
      }

      setError(`${message}已重置为系统默认值（需点击保存按钮生效）`);
    } catch (error: any) {
      console.error("重置提示词失败:", error);
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
        await api.post("/api/users", userFormData);
      }
      setShowUserModal(false);
      setEditingUser(null);
      setUserFormData({
        username: "",
        email: "",
        password: "",
        name: "",
        role: "STUDENT",
        isActive: true,
      });
      loadUsers();
    } catch (error: any) {
      setError(error.response?.data?.message || error.message || "操作失败");
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserFormData({
      username: user.username,
      email: user.email || "",
      password: "",
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
      setError(error.response?.data?.message || error.message || "删除失败");
    }
  };

  const handleBatchDeleteUsers = async (userIds: string[]) => {
    if (!confirm(`确定要删除选中的 ${userIds.length} 个用户吗？`)) return;
    setError(null);
    try {
      await api.post("/admin/users/batch-delete", { ids: userIds });
      loadUsers();
      showSuccess(`成功删除 ${userIds.length} 个用户`);
    } catch (error: any) {
      setError(
        error.response?.data?.message || error.message || "批量删除失败",
      );
      showError(
        "批量删除失败: " + (error.response?.data?.message || error.message),
      );
    }
  };

  const handleBatchResetPasswords = async (userIds: string[]) => {
    if (
      !confirm(
        `确定要重置选中的 ${userIds.length} 个用户的密码为 "123456" 吗？`,
      )
    )
      return;
    setError(null);
    try {
      await api.post("/admin/users/batch-reset-password", { ids: userIds });
      loadUsers();
      showSuccess(`成功重置 ${userIds.length} 个用户的密码`);
    } catch (error: any) {
      setError(
        error.response?.data?.message || error.message || "批量重置密码失败",
      );
      showError(
        "批量重置密码失败: " + (error.response?.data?.message || error.message),
      );
    }
  };

  // AI Provider handlers
  const canEditProvider = (provider: AIProviderItem): boolean => {
    if (currentUser?.role === "ADMIN") return true;
    if (provider.isGlobal) return false;
    return provider.createdBy === currentUser?.id;
  };

  const canDeleteProvider = (provider: AIProviderItem): boolean => {
    if (currentUser?.role === "ADMIN") return true;
    if (provider.isGlobal) return false;
    return provider.createdBy === currentUser?.id;
  };

  const handleEdit = (provider: AIProviderItem) => {
    if (!canEditProvider(provider)) {
      showError("您没有权限编辑此Provider");
      return;
    }
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      apiKey: provider.apiKey,
      baseUrl: provider.baseUrl || "",
      model: provider.model,
      isGlobal: provider.isGlobal,
      isActive: provider.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = async (provider: AIProviderItem) => {
    if (!canDeleteProvider(provider)) {
      showError("您没有权限删除此Provider");
      return;
    }
    if (!confirm(`确定要删除AI Provider "${provider.name}" 吗？`)) return;
    try {
      await api.delete(`/api/ai-providers/${provider.id}`);
      loadProviders();
    } catch (error: any) {
      showError(
        "删除失败: " + (error.response?.data?.message || error.message),
      );
    }
  };

  const handleUserProviderSelect = async (providerId: string) => {
    try {
      // 更新用户设置
      await updateUserSetting("AI_PROVIDER", providerId);
      // 更新本地状态
      setSettings((prev) => ({ ...prev, aiProvider: providerId }));
      showSuccess("AI Provider 设置成功");
    } catch (error: any) {
      showError(
        "设置失败: " + (error.response?.data?.message || error.message),
      );
    }
  };

  const handleSetDefault = async (provider: AIProviderItem) => {
    if (currentUser?.role !== "ADMIN") {
      showError("只有管理员可以设置系统默认Provider");
      return;
    }
    if (!confirm(`确定要将 "${provider.name}" 设为系统默认AI Provider吗？`))
      return;
    try {
      const result = await setDefaultProvider(provider.id);
      showSuccess(result.message);
      loadProviders();
    } catch (error: any) {
      showError(
        "设置失败: " + (error.response?.data?.message || error.message),
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProvider) {
        if (!canEditProvider(editingProvider)) {
          showError("您没有权限编辑此Provider");
          return;
        }
        await api.patch(`/api/ai-providers/${editingProvider.id}`, formData);
      } else {
        await api.post("/api/ai-providers", formData);
      }
      setShowModal(false);
      setEditingProvider(null);
      resetForm();
      loadProviders();
    } catch (error: any) {
      showError(
        "操作失败: " + (error.response?.data?.message || error.message),
      );
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      apiKey: "",
      baseUrl: "",
      model: "",
      isGlobal: false,
      isActive: true,
    });
  };

  const getRoleName = (role: string) => {
    const roleMap: Record<string, string> = {
      ADMIN: "系统管理员",
      TEACHER: "教师",
      STUDENT: "学生",
    };
    return roleMap[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colorMap: Record<string, string> = {
      ADMIN: "bg-red-100 text-red-800",
      TEACHER: "bg-blue-100 text-blue-800",
      STUDENT: "bg-green-100 text-green-800",
    };
    return colorMap[role] || "bg-gray-100 text-gray-800";
  };

  const tabs = [
    { id: "ai-provider" as TabType, label: "AI Provider 设置", icon: Cpu },
    { id: "prompts" as TabType, label: "提示词设置", icon: MessageSquare },
    ...(isAdmin
      ? [{ id: "users" as TabType, label: "用户设置", icon: Users }]
      : []),
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
                <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
                  系统设置
                </h1>
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
              providers={providers}
              loading={loading}
              showModal={showModal}
              setShowModal={setShowModal}
              editingProvider={editingProvider}
              setEditingProvider={setEditingProvider}
              formData={formData}
              setFormData={setFormData}
              defaultProviderId={defaultProviderId}
              loadProviders={loadProviders}
              handleEdit={handleEdit}
              handleDelete={handleDelete}
              handleSetDefault={handleSetDefault}
              canEditProvider={canEditProvider}
              canDeleteProvider={canDeleteProvider}
              handleSubmit={handleSubmit}
              resetForm={resetForm}
              userRole={userRole}
              showError={showError}
              showSuccess={showSuccess}
            />
          )}

          {!loading && activeTab === "prompts" && (
            <PromptsTab
              settings={settings}
              savingPromptTemplate={savingPromptTemplate}
              savingGradingPromptTemplate={savingGradingPromptTemplate}
              savingAnalysisPromptTemplate={savingAnalysisPromptTemplate}
              savingStudentAiAnalysisPromptTemplate={
                savingStudentAiAnalysisPromptTemplate
              }
              savingJsonGenerationPromptTemplate={
                savingJsonGenerationPromptTemplate
              }
              promptTemplateChanged={promptTemplateChanged}
              gradingPromptTemplateChanged={gradingPromptTemplateChanged}
              analysisPromptTemplateChanged={analysisPromptTemplateChanged}
              studentAiAnalysisPromptTemplateChanged={
                studentAiAnalysisPromptTemplateChanged
              }
              jsonGenerationPromptTemplateChanged={
                jsonGenerationPromptTemplateChanged
              }
              onInputChange={handleInputChange}
              onSavePromptTemplate={handleSavePromptTemplate}
              onSaveGradingPromptTemplate={handleSaveGradingPromptTemplate}
              onSaveAnalysisPromptTemplate={handleSaveAnalysisPromptTemplate}
              onSaveStudentAiAnalysisPromptTemplate={
                handleSaveStudentAiAnalysisPromptTemplate
              }
              onSaveJsonGenerationPromptTemplate={
                handleSaveJsonGenerationPromptTemplate
              }
              onInsertJsonStructure={handleInsertJsonStructure}
              onResetToDefault={handleResetToDefault}
              onInsertGradingVariables={handleInsertGradingVariables}
              onInsertAnalysisVariables={handleInsertAnalysisVariables}
              setSettings={setSettings}
              providers={providers}
              defaultProviderId={defaultProviderId}
              handleUserProviderSelect={handleUserProviderSelect}
            />
          )}

          {!loading && activeTab === "users" && isAdmin && (
            <UsersTab
              users={users}
              loading={usersLoading}
              currentPage={userPage}
              totalPages={userTotalPages}
              onPageChange={setUserPage}
              onAddUser={() => {
                setEditingUser(null);
                setUserFormData({
                  username: "",
                  email: "",
                  password: "",
                  name: "",
                  role: "STUDENT",
                  isActive: true,
                });
                setShowUserModal(true);
              }}
              onEditUser={handleEditUser}
              onDeleteUser={handleDeleteUser}
              onBatchDeleteUsers={handleBatchDeleteUsers}
              onBatchResetPasswords={handleBatchResetPasswords}
              onRefreshUsers={loadUsers}
              getRoleName={getRoleName}
              getRoleColor={getRoleColor}
            />
          )}
        </div>
      </div>

      {/* User Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setError(null);
        }}
        title={editingUser ? "编辑用户" : "添加用户"}
      >
        <form onSubmit={handleUserSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              用户名
            </label>
            <input
              type="text"
              required
              value={userFormData.username}
              onChange={(e) =>
                setUserFormData((prev) => ({
                  ...prev,
                  username: e.target.value,
                }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              disabled={!!editingUser}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              姓名
            </label>
            <input
              type="text"
              required
              value={userFormData.name}
              onChange={(e) =>
                setUserFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              邮箱
            </label>
            <input
              type="email"
              value={userFormData.email}
              onChange={(e) =>
                setUserFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              密码 {editingUser && "(留空则不修改)"}
            </label>
            <input
              type="password"
              required={!editingUser}
              value={userFormData.password}
              onChange={(e) =>
                setUserFormData((prev) => ({
                  ...prev,
                  password: e.target.value,
                }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              角色
            </label>
            <select
              value={userFormData.role}
              onChange={(e) =>
                setUserFormData((prev) => ({ ...prev, role: e.target.value }))
              }
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
              onChange={(e) =>
                setUserFormData((prev) => ({
                  ...prev,
                  isActive: e.target.checked,
                }))
              }
              className="mr-2"
            />
            <label
              htmlFor="userIsActive"
              className="text-sm font-medium text-gray-700"
            >
              启用用户
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowUserModal(false)}
            >
              取消
            </Button>
            <Button type="submit">{editingUser ? "更新" : "创建"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
