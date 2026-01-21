import { ReactNode, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  CheckSquare,
  Download,
  Trash2,
  FileText,
  UserCheck,
  Play,
  Square,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import {
  getExamById,
  deleteExam,
  updateExam,
  examAccountModes,
  type Exam,
  type ExamAccountMode,
} from "@/services/exams";
import api from "@/services/api";
import { useToast } from "@/components/ui/Toast";

interface ExamLayoutProps {
  children: ReactNode;
  activeTab: "questions" | "students" | "analytics" | "grading" | "export";
  onExport?: () => void;
}

export default function ExamLayout({
  children,
  activeTab,
  onExport,
}: ExamLayoutProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  void onExport;
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [updating, setUpdating] = useState(false);
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type:
      | "publish"
      | "withdraw"
      | "delete"
      | "success"
      | "error"
      | "accountModes";
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: "publish",
    title: "",
    message: "",
  });
  const [selectedAccountModes, setSelectedAccountModes] = useState<string[]>(
    [],
  );

  useEffect(() => {
    if (id) {
      loadExam();
    }
  }, [id]);

  const loadExam = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [examData, submissionsResponse] = await Promise.all([
        getExamById(id),
        api.get(`/api/exams/${id}/submissions`).catch(() => ({ data: [] })),
      ]);
      setExam(examData);
      setSubmissionCount(submissionsResponse.data.length || 0);
    } catch (err) {
      console.error("加载考试信息失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExam = async () => {
    if (!id || !exam) return;

    setModal({
      isOpen: true,
      type: "delete",
      title: "删除考试",
      message: `确定要删除考试"${exam.title}"吗？此操作不可撤销。`,
    });
  };

  const confirmDelete = async () => {
    if (!id) return;
    try {
      await deleteExam(id);
      navigate("/exams");
    } catch (err) {
      setModal({
        isOpen: true,
        type: "error",
        title: "删除失败",
        message: "删除失败，请重试",
      });
    }
  };

  const handlePublishExam = async () => {
    if (!exam || !id) return;

    if (exam.examQuestions?.length === 0) {
      setModal({
        isOpen: true,
        type: "error",
        title: "无法发布",
        message: "请先添加题目再发布考试",
      });
      return;
    }

    setModal({
      isOpen: true,
      type: "publish",
      title: "发布考试",
      message: "确定要发布这个考试吗？发布后学生就可以参加考试了。",
    });
  };

  const confirmPublish = async () => {
    if (!id) return;
    setUpdating(true);
    try {
      const updatedExam = await updateExam(id, { status: "PUBLISHED" });
      setExam(updatedExam);
      setModal({
        isOpen: true,
        type: "success",
        title: "发布成功",
        message: "考试发布成功！",
      });
    } catch (err: any) {
      setModal({
        isOpen: true,
        type: "error",
        title: "发布失败",
        message: err.response?.data?.message || "发布失败，请重试",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleAccountModesEdit = () => {
    setSelectedAccountModes(normalizeAccountModes(exam?.accountModes || []));
    setModal({
      isOpen: true,
      type: "accountModes",
      title: "修改学生登录模式",
      message: "",
    });
  };

  const normalizeAccountModes = (modes: unknown): ExamAccountMode[] => {
    const rawModes = Array.isArray(modes)
      ? modes
      : typeof modes === "string"
        ? (() => {
            try {
              return JSON.parse(modes);
            } catch {
              return [];
            }
          })()
        : [];

    return (rawModes || []).filter((m: string): m is ExamAccountMode =>
      (examAccountModes as readonly string[]).includes(m),
    );
  };

  const handleAccountModeToggle = (mode: ExamAccountMode) => {
    setSelectedAccountModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode],
    );
  };

  const confirmAccountModes = async () => {
    const normalizedModes = normalizeAccountModes(selectedAccountModes);
    if (!id || normalizedModes.length === 0) return;

    setUpdating(true);
    try {
      const updatedExam = await updateExam(id, {
        accountModes: normalizedModes,
      });
      setExam({
        ...updatedExam,
        accountModes: normalizeAccountModes(updatedExam.accountModes || []),
      });
      setModal({
        isOpen: true,
        type: "success",
        title: "修改成功",
        message: "学生登录模式已更新！",
      });
    } catch (err: any) {
      if (err?.response?.status === 400) {
        try {
          const refreshedExam = await getExamById(id);
          const refreshedModes = normalizeAccountModes(
            (refreshedExam as any).accountModes,
          );
          if (
            refreshedModes.length > 0 &&
            refreshedModes.sort().join(",") === normalizedModes.sort().join(",")
          ) {
            setExam({
              ...refreshedExam,
              accountModes: refreshedModes,
            });
            setModal({
              isOpen: true,
              type: "success",
              title: "修改成功",
              message: "学生登录模式已更新！",
            });
          } else {
            setModal({
              isOpen: true,
              type: "error",
              title: "修改失败",
              message: err.response?.data?.message || "修改失败，请重试",
            });
          }
        } catch (refreshError: any) {
          setModal({
            isOpen: true,
            type: "error",
            title: "修改失败",
            message: err.response?.data?.message || "修改失败，请重试",
          });
        }
      } else {
        setModal({
          isOpen: true,
          type: "error",
          title: "修改失败",
          message: err.response?.data?.message || "修改失败，请重试",
        });
      }
    } finally {
      setUpdating(false);
    }
  };

  const copyExamLink = () => {
    const examUrl = `${window.location.origin}/exam/${id}/login`;
    if (!navigator.clipboard) {
      toast.error("复制失败", "浏览器不支持自动复制，请手动复制链接");
      return;
    }
    navigator.clipboard
      .writeText(examUrl)
      .then(() => {
        toast.success("已复制", "考试链接已复制到剪贴板");
      })
      .catch(() => {
        toast.error("复制失败", "无法复制链接，请手动复制");
      });
  };

  const handleWithdrawExam = async () => {
    if (!exam || !id) return;

    setModal({
      isOpen: true,
      type: "withdraw",
      title: "撤回考试",
      message: "确定要撤回这个考试吗？撤回后学生将无法继续参加考试。",
    });
  };

  const confirmWithdraw = async () => {
    if (!id) return;
    setUpdating(true);
    try {
      const updatedExam = await updateExam(id, { status: "DRAFT" });
      setExam(updatedExam);
      setModal({
        isOpen: true,
        type: "success",
        title: "撤回成功",
        message: "考试已撤回！",
      });
    } catch (err: any) {
      setModal({
        isOpen: true,
        type: "error",
        title: "撤回失败",
        message: err.response?.data?.message || "撤回失败，请重试",
      });
    } finally {
      setUpdating(false);
    }
  };

  const closeModal = () => {
    setModal({ isOpen: false, type: "publish", title: "", message: "" });
  };

  const getModalAction = () => {
    switch (modal.type) {
      case "publish":
        return confirmPublish;
      case "withdraw":
        return confirmWithdraw;
      case "delete":
        return confirmDelete;
      case "accountModes":
        return confirmAccountModes;
      default:
        return undefined;
    }
  };

  if (loading) {
    return (
      <div className="bg-slatebg text-ink-900 antialiased min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600 mx-auto mb-4"></div>
          <p className="text-ink-700">加载中...</p>
        </div>
      </div>
    );
  }

  if (!exam) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return "bg-green-100 text-green-800";
      case "DRAFT":
        return "bg-yellow-100 text-yellow-800";
      case "ARCHIVED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return "已发布";
      case "DRAFT":
        return "草稿";
      case "ARCHIVED":
        return "已归档";
      default:
        return status;
    }
  };

  return (
    <div className="bg-slatebg text-ink-900 antialiased min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面头部 */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              onClick={() => navigate("/exams")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              返回考试列表
            </Button>
          </div>

          {/* 考试基本信息 */}
          <div className="rounded-3xl border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white p-8 shadow-lg mb-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-blue-900">
                    {exam.title}
                  </h1>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(exam.status)}`}
                  >
                    {getStatusText(exam.status)}
                  </span>
                </div>
                <p className="text-blue-700 mb-4">{exam.description}</p>
                <div className="flex items-center gap-4 text-sm text-blue-600">
                  <span>时长: {exam.duration} 分钟</span>
                  <span>总分: {exam.totalScore} 分</span>
                  <span>题目数: {exam.examQuestions?.length || 0}</span>
                </div>
                {exam.accountModes &&
                  Array.isArray(exam.accountModes) &&
                  exam.accountModes.length > 0 && (
                    <div className="mt-3">
                      <span className="text-sm text-blue-600 mr-2">
                        登录模式:
                      </span>
                      <div className="inline-flex flex-wrap gap-2">
                        {(Array.isArray(exam.accountModes)
                          ? exam.accountModes
                          : []
                        ).map((mode: string) => (
                          <span
                            key={mode}
                            className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs"
                          >
                            {mode === "PERMANENT"
                              ? "固定学生"
                              : mode === "TEMPORARY_IMPORT"
                                ? "临时导入"
                                : mode === "TEMPORARY_REGISTER"
                                  ? "临时注册"
                                  : mode === "CLASS_IMPORT"
                                    ? "班级导入"
                                    : mode === "GENERATE_ACCOUNTS"
                                      ? "生成账号"
                                      : mode}
                          </span>
                        ))}
                        <button
                          onClick={handleAccountModesEdit}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs transition-colors"
                        >
                          修改
                        </button>
                      </div>
                    </div>
                  )}
                <div className="mt-3">
                  <span className="text-sm text-blue-600 mr-2">考试链接:</span>
                  <div className="mt-1">
                    <button
                      onClick={copyExamLink}
                      className="bg-blue-50 border border-blue-200 rounded px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-100 font-mono transition-colors underline cursor-pointer"
                      title="点击复制链接"
                    >
                      {`${window.location.origin}/exam/${exam.id}/login`}
                    </button>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-3 mb-3">
                  <Button
                    onClick={() =>
                      window.open(`/exam/${exam.id}/login`, "_blank")
                    }
                    size="sm"
                    className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white"
                  >
                    <Play className="h-4 w-4" />
                    进入考试
                  </Button>

                  {exam.status === "PUBLISHED" ? (
                    <>
                      <Button
                        onClick={handleWithdrawExam}
                        disabled={updating}
                        size="sm"
                        className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white"
                      >
                        <Square className="h-4 w-4" />
                        {updating ? "撤回中..." : "撤回考试"}
                      </Button>
                      <Button
                        onClick={handleDeleteExam}
                        disabled={updating}
                        size="sm"
                        className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white"
                      >
                        <Trash2 className="h-4 w-4" />
                        删除考试
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={handlePublishExam}
                        disabled={
                          updating || (exam.examQuestions?.length || 0) === 0
                        }
                        size="sm"
                        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        <Play className="h-4 w-4" />
                        {updating ? "发布中..." : "发布考试"}
                      </Button>
                      <Button
                        onClick={handleDeleteExam}
                        disabled={updating}
                        size="sm"
                        className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white"
                      >
                        <Trash2 className="h-4 w-4" />
                        删除考试
                      </Button>
                    </>
                  )}
                </div>
                <div className="text-sm text-blue-600">
                  创建时间:{" "}
                  {new Date(exam.createdAt).toLocaleDateString("zh-CN")}
                </div>
              </div>
            </div>

            {/* 快速操作 - 移除此部分 */}
          </div>

          {/* 标签页导航 */}
          <div className="flex flex-wrap border-b-2 border-gray-200 mb-8 gap-1">
            <button
              onClick={() => navigate(`/exams/${id}`)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors rounded-t-lg ${
                activeTab === "questions"
                  ? "border-b-2 border-blue-500 text-blue-700 bg-blue-50"
                  : "text-gray-600 hover:text-blue-700 hover:bg-blue-50"
              }`}
            >
              <FileText className="h-4 w-4" />
              考试题目
              {exam.examQuestions && exam.examQuestions.length > 0 && (
                <span className="ml-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                  {exam.examQuestions.length}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate(`/exams/${id}/students`)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors rounded-t-lg ${
                activeTab === "students"
                  ? "border-b-2 border-indigo-500 text-indigo-700 bg-indigo-50"
                  : "text-gray-600 hover:text-indigo-700 hover:bg-indigo-50"
              }`}
            >
              <UserCheck className="h-4 w-4" />
              学生管理
              {(exam.totalStudents || 0) > 0 && (
                <span className="ml-1 bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs">
                  {exam.totalStudents}
                </span>
              )}
              {submissionCount > 0 && (
                <span className="ml-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">
                  已开始: {submissionCount}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate(`/exams/${id}/grading`)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors rounded-t-lg ${
                activeTab === "grading"
                  ? "border-b-2 border-green-500 text-green-700 bg-green-50"
                  : "text-gray-600 hover:text-green-700 hover:bg-green-50"
              }`}
            >
              <CheckSquare className="h-4 w-4" />
              评分管理
            </button>
            <button
              onClick={() => navigate(`/exams/${id}/analytics`)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors rounded-t-lg ${
                activeTab === "analytics"
                  ? "border-b-2 border-purple-500 text-purple-700 bg-purple-50"
                  : "text-gray-600 hover:text-purple-700 hover:bg-purple-50"
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              统计分析
            </button>
            <button
              onClick={() => navigate(`/exams/${id}/export`)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors rounded-t-lg ${
                activeTab === "export"
                  ? "border-b-2 border-orange-500 text-orange-700 bg-orange-50"
                  : "text-gray-600 hover:text-orange-700 hover:bg-orange-50"
              }`}
            >
              <Download className="h-4 w-4" />
              导出数据
            </button>
          </div>
        </div>

        {/* 页面内容 */}
        {children}

        {/* Exam Action Modal */}
        <Modal
          isOpen={modal.isOpen}
          onClose={closeModal}
          title={modal.title}
          onConfirm={getModalAction()}
          confirmText={
            modal.type === "delete"
              ? "删除"
              : modal.type === "publish"
                ? "发布"
                : modal.type === "withdraw"
                  ? "撤回"
                  : modal.type === "accountModes"
                    ? "保存"
                    : undefined
          }
          confirmVariant={modal.type === "delete" ? "danger" : "primary"}
        >
          {modal.type === "accountModes" ? (
            <div className="space-y-4">
              <p className="text-gray-600 mb-4">选择学生可以使用的登录方式：</p>
              <div className="space-y-3">
                {[
                  {
                    value: "TEMPORARY_IMPORT" as const,
                    label: "临时导入",
                    desc: "从Excel/CSV文件导入临时学生账号",
                  },
                  {
                    value: "TEMPORARY_REGISTER" as const,
                    label: "临时注册",
                    desc: "学生自行注册临时账号参加考试",
                  },
                  {
                    value: "PERMANENT" as const,
                    label: "固定账号",
                    desc: "使用班级中的固定学生账号",
                  },
                ].map((mode) => (
                  <label
                    key={mode.value}
                    className="flex items-start gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAccountModes.includes(mode.value)}
                      onChange={() => handleAccountModeToggle(mode.value)}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        {mode.label}
                      </div>
                      <div className="text-sm text-gray-500">{mode.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-600 whitespace-pre-wrap">{modal.message}</p>
          )}
        </Modal>
      </div>
    </div>
  );
}
