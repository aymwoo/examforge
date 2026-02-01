import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Bot,
  Save,
  Eye,
  ArrowUp,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ExamLayout from "@/components/ExamLayout";
import { useToast } from "@/components/ui/Toast";
import api from "@/services/api";
import { streamSse } from "@/utils/sse";
import { updateExam } from "@/services/exams";
import {
  buildStudentAiAnalysisStreamUrl,
  getStudentAiAnalysisBySubmission,
  type StudentAiAnalysisReport,
} from "@/services/student-ai-analysis";
const MDEditorMarkdown = lazy(async () => {
  const mod = (await import("@uiw/react-md-editor")) as any;
  return { default: mod.Markdown };
});
import "@uiw/react-md-editor/markdown-editor.css";

interface Student {
  id: string;
  username: string;
  displayName?: string;
  accountType?: string;
}

interface Submission {
  id: string;
  student: Student;
  answers: Record<string, any>;
  score?: number;
  isAutoGraded: boolean;
  isReviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  gradingDetails?: any; // AI预评分详情
  submittedAt: string;
}

interface AIGradingSuggestion {
  type: "objective" | "subjective";
  isCorrect?: boolean;
  score?: number;
  maxScore: number;
  feedback?: string;
  aiSuggestion?: {
    suggestedScore: number;
    reasoning: string;
    suggestions: string;
    confidence: number;
  };
}

export default function ExamGradingPage() {
  const { id: examId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [exam, setExam] = useState<any>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null);
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(
    new Set(),
  );
  const [feedbackVisibility, setFeedbackVisibility] = useState<
    "FINAL_SCORE" | "ANSWERS" | "FULL_DETAILS"
  >("FINAL_SCORE");
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<
    Record<string, AIGradingSuggestion>
  >({});
  const [manualScores, setManualScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [gradingLoading, setGradingLoading] = useState(false);
  const toast = useToast();
  const feedbackOptions = [
    { value: "FINAL_SCORE", label: "仅最终得分" },
    { value: "ANSWERS", label: "答案 + 正确答案" },
    { value: "FULL_DETAILS", label: "全部细节" },
  ] as const;

  const [resetLoading, setResetLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [approveSummary, setApproveSummary] = useState<{
    approvedCount: number;
    approved: Array<{
      submissionId: string;
      student?: { username: string; displayName?: string | null };
    }>;
    skippedCount: number;
    notFoundCount: number;
    skipped: Array<{
      submissionId: string;
      reason: "ALREADY_REVIEWED" | "NO_SCORE";
      student?: { username: string; displayName?: string | null };
    }>;
    notFoundSubmissionIds: string[];
  } | null>(null);
  const [showApproveSummaryModal, setShowApproveSummaryModal] = useState(false);
  const [approveListExpanded, setApproveListExpanded] = useState(false);
  const [skippedListExpanded, setSkippedListExpanded] = useState(false);

  const APPROVE_LIST_PREVIEW_COUNT = 10;
  const [error, setError] = useState<string | null>(null);
  // 点击某个提交后，加载评分详情失败时，仅在右侧 Tab 区域提示
  const [gradingLoadError, setGradingLoadError] = useState<string | null>(null);
  const [showAnswerModal, setShowAnswerModal] = useState(false);

  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisStreaming, setAnalysisStreaming] = useState(false);
  const [analysisProgressMessage, setAnalysisProgressMessage] = useState<
    string | null
  >(null);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisText, setAnalysisText] = useState<string>("");
  const [analysisRecord, setAnalysisRecord] =
    useState<StudentAiAnalysisReport | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const sseAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadExamAndSubmissions();
  }, [examId]);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const loadExamAndSubmissions = async () => {
    try {
      setLoading(true);
      const [examResponse, submissionsResponse] = await Promise.all([
        api.get(`/api/exams/${examId}`),
        api.get(`/api/exams/${examId}/submissions`),
      ]);
      setExam(examResponse.data);
      setFeedbackVisibility(
        examResponse.data?.feedbackVisibility || "FINAL_SCORE",
      );
      setSubmissions(submissionsResponse.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  };

  const closeAnalysisStream = () => {
    if (sseAbortRef.current) {
      sseAbortRef.current.abort();
      sseAbortRef.current = null;
    }
  };

  const startAnalysisStream = (options?: { force?: boolean }) => {
    if (!examId || !selectedSubmission) return;

    closeAnalysisStream();

    setAnalysisError(null);
    setAnalysisText("");
    setAnalysisProgress(0);
    setAnalysisProgressMessage("正在连接...");
    setAnalysisStreaming(true);

    const url = buildStudentAiAnalysisStreamUrl({
      examId,
      submissionId: selectedSubmission.id,
      force: options?.force,
    });

    const abortController = new AbortController();
    sseAbortRef.current = abortController;

    void (async () => {
      try {
        const controller = await streamSse({
          url,
          onMessage: (payload) => {
            try {
              const data = JSON.parse(payload);
              switch (data.type) {
                case "start":
                  setAnalysisProgressMessage(data.message || "开始生成...");
                  setAnalysisProgress(5);
                  break;
                case "progress":
                  if (typeof data.progress === "number") {
                    setAnalysisProgress(data.progress);
                  }
                  setAnalysisProgressMessage(data.message || "生成中...");
                  break;
                case "stream":
                  if (data.content) {
                    setAnalysisText((prev) => prev + data.content);
                  }
                  break;
                case "complete":
                  setAnalysisStreaming(false);
                  setAnalysisProgress(100);
                  setAnalysisProgressMessage("完成");
                  if (typeof data.report === "string") {
                    setAnalysisText(data.report);
                  }
                  closeAnalysisStream();
                  controller.abort();
                  return;
                case "error":
                  setAnalysisStreaming(false);
                  setAnalysisError(data.message || "生成失败");
                  closeAnalysisStream();
                  controller.abort();
                  return;
              }
            } catch (e) {
              console.error("Failed to parse SSE data", e);
            }
          },
          onError: () => {
            setAnalysisStreaming(false);
            setAnalysisError("连接中断，请重试");
            closeAnalysisStream();
          },
        });

        sseAbortRef.current = controller;
      } catch (err: any) {
        if (err?.name === "AbortError") {
          return;
        }
        setAnalysisStreaming(false);
        setAnalysisError("连接中断，请重试");
        closeAnalysisStream();
      }
    })();
  };

  const openAnalysisModal = async () => {
    if (!selectedSubmission) {
      setShowAnswerModal(true);
      return;
    }

    setShowAnswerModal(true);
    setAnalysisLoading(true);
    setAnalysisError(null);
    setAnalysisProgress(0);
    setAnalysisProgressMessage(null);
    setAnalysisText("");

    try {
      const report = await getStudentAiAnalysisBySubmission(
        selectedSubmission.id,
      );
      setAnalysisRecord(report);

      if (report?.status === "COMPLETED" && report.report) {
        setAnalysisText(report.report);
        setAnalysisProgress(100);
        setAnalysisProgressMessage("已生成");
      } else {
        startAnalysisStream();
      }
    } catch (err: any) {
      setAnalysisError(
        err.response?.data?.message || err.message || "获取报告失败",
      );
    } finally {
      setAnalysisLoading(false);
    }
  };

  useEffect(() => {
    if (!showAnswerModal) {
      closeAnalysisStream();
      setAnalysisStreaming(false);
    }
  }, [showAnswerModal]);

  useEffect(() => {
    // if submission changes while modal open, refresh
    if (showAnswerModal) {
      setAnalysisRecord(null);
      setAnalysisText("");
      setAnalysisProgress(0);
      setAnalysisProgressMessage(null);
      setAnalysisError(null);
      closeAnalysisStream();
    }
  }, [selectedSubmission?.id]);

  useEffect(() => {
    return () => {
      closeAnalysisStream();
    };
  }, []);

  const loadAISuggestions = async (submission: Submission) => {
    setGradingLoading(true);
    setGradingLoadError(null);
    try {
      // 这个方法现在只是从数据库读取已存储的评分数据
      const response = await api.post(
        `/api/exams/${examId}/submissions/${submission.id}/ai-grade`,
      );
      setAiSuggestions(response.data.suggestions);

      // 初始化手动评分为已存储的分数
      const initialScores: Record<string, number> = {};
      Object.entries(response.data.suggestions).forEach(
        ([questionId, suggestion]: [string, any]) => {
          if (suggestion.type === "objective") {
            initialScores[questionId] = suggestion.score;
          } else if (suggestion.aiSuggestion) {
            initialScores[questionId] = suggestion.aiSuggestion.suggestedScore;
          }
        },
      );
      setManualScores(initialScores);
    } catch (err: any) {
      console.error("加载评分数据失败:", err);

      // 保持在当前页面/Tab，不跳转，只在右侧区域提示
      setAiSuggestions({});
      setManualScores({});
      const errorMessage =
        err.response?.data?.message || "评分数据加载失败，可能需要重新提交考试";
      setGradingLoadError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setGradingLoading(false);
    }
  };

  const handleSubmissionSelect = (submission: Submission) => {
    setSelectedSubmission(submission);
    setAiSuggestions({});
    setManualScores({});
    setGradingLoadError(null);

    // 优先使用预存储的评分详情
    if (submission.gradingDetails && submission.gradingDetails.details) {
      const suggestions: Record<string, AIGradingSuggestion> = {};
      const initialScores: Record<string, number> = {};

      Object.entries(submission.gradingDetails.details).forEach(
        ([questionId, detail]: [string, any]) => {
          if (detail.type === "objective") {
            suggestions[questionId] = {
              type: "objective",
              isCorrect: detail.isCorrect,
              score: detail.score,
              maxScore: detail.maxScore,
              feedback: detail.feedback,
            };
            initialScores[questionId] = detail.score;
          } else if (detail.type === "subjective") {
            suggestions[questionId] = {
              type: "subjective",
              maxScore: detail.maxScore,
              aiSuggestion: {
                suggestedScore: detail.aiGrading.suggestedScore,
                reasoning: detail.aiGrading.reasoning,
                suggestions: detail.aiGrading.suggestions,
                confidence: detail.aiGrading.confidence,
              },
            };
            initialScores[questionId] = detail.score;
          }
        },
      );

      setAiSuggestions(suggestions);
      setManualScores(initialScores);
      setGradingLoadError(null);
      setGradingLoading(false);
    } else {
      // 如果没有预评分数据，尝试从API获取（兼容旧数据）
      loadAISuggestions(submission);
    }
  };

  const handleSubmissionCheck = (submissionId: string, checked: boolean) => {
    const newSelected = new Set(selectedSubmissions);
    if (checked) {
      newSelected.add(submissionId);
    } else {
      newSelected.delete(submissionId);
    }
    setSelectedSubmissions(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSubmissions(new Set(submissions.map((s) => s.id)));
    } else {
      setSelectedSubmissions(new Set());
    }
  };

  const handleBatchReset = async () => {
    if (selectedSubmissions.size === 0) {
      toast.error("请先选择要重置的提交记录");
      return;
    }

    if (
      !confirm(
        `确定要重置选中的 ${selectedSubmissions.size} 个学生的答题记录吗？学生将可以重新答题。`,
      )
    ) {
      return;
    }

    setResetLoading(true);
    try {
      await api.post(`/api/exams/${examId}/submissions/batch-reset`, {
        submissionIds: Array.from(selectedSubmissions),
      });

      await loadExamAndSubmissions();
      setSelectedSubmissions(new Set());
      toast.success("重置成功！学生可以重新答题。");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "重置失败");
    } finally {
      setResetLoading(false);
    }
  };

  const handleBatchApprove = async () => {
    if (selectedSubmissions.size === 0) {
      toast.error("请先选择要复核确认得分的提交记录");

      return;
    }

    if (
      !confirm(
        `确定要对选中的 ${selectedSubmissions.size} 份提交执行“复核确认得分并生效”吗？`,
      )
    ) {
      return;
    }

    setApproveLoading(true);
    try {
      const response = await api.post(
        `/api/exams/${examId}/submissions/batch-approve`,
        {
          submissionIds: Array.from(selectedSubmissions),
        },
      );

      const {
        approvedCount = 0,
        approved = [],
        skippedCount = 0,
        notFoundCount = 0,
        skipped = [],
        notFoundSubmissionIds = [],
      } = response.data || {};

      await loadExamAndSubmissions();
      setSelectedSubmissions(new Set());

      setApproveSummary({
        approvedCount,
        approved,
        skippedCount,
        notFoundCount,
        skipped,
        notFoundSubmissionIds,
      });
      setApproveListExpanded(false);
      setSkippedListExpanded(false);
      setShowApproveSummaryModal(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "批量审核通过失败");
    } finally {
      setApproveLoading(false);
    }
  };

  const getStudentSourceLabel = (accountType?: string) => {
    switch (accountType) {
      case "PERMANENT":
        return "固定学生";
      case "TEMPORARY_IMPORT":
        return "临时导入";
      case "TEMPORARY_REGISTER":
        return "临时注册";
      default:
        return "";
    }
  };

  const getStudentSourceBadgeClass = (accountType?: string) => {
    switch (accountType) {
      case "PERMANENT":
        return "bg-indigo-100 text-indigo-700";
      case "TEMPORARY_IMPORT":
        return "bg-amber-100 text-amber-700";
      case "TEMPORARY_REGISTER":
        return "bg-emerald-100 text-emerald-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case "SINGLE_CHOICE":
        return "单选题";
      case "MULTIPLE_CHOICE":
        return "多选题";
      case "TRUE_FALSE":
        return "判断题";
      case "FILL_BLANK":
        return "填空题";
      case "MATCHING":
        return "连线题";
      case "SHORT_ANSWER":
        return "简答题";
      case "ESSAY":
        return "论述题";
      default:
        return type;
    }
  };

  const normalizeTrueFalseLabel = (value: unknown) => {
    if (
      value === true ||
      value === "true" ||
      value === "正确" ||
      value === "对"
    ) {
      return "正确";
    }
    if (
      value === false ||
      value === "false" ||
      value === "错误" ||
      value === "错"
    ) {
      return "错误";
    }
    return value ? String(value) : "";
  };

  const formatAnswerDisplay = (
    answer: string | string[] | boolean | null,
    question: any,
  ) => {
    if (!question) return answer ? String(answer) : "";

    if (question.type === "TRUE_FALSE") {
      return normalizeTrueFalseLabel(answer);
    }

    if (question.type === "MATCHING") {
      return formatMatchingAnswer(answer, question.matching);
    }

    if (!question.options) return answer ? String(answer) : "";

    if (Array.isArray(answer)) {
      return answer.join(", ");
    }

    return answer ? String(answer) : "";
  };

  const convertAnswerToText = (answer: string | null, question: any) => {
    if (!answer || !question) return answer || "";

    if (question.type === "TRUE_FALSE") {
      return normalizeTrueFalseLabel(answer);
    }

    if (question.type === "MATCHING") {
      return formatMatchingAnswer(answer, question.matching);
    }

    if (!question.options) return answer || "";

    try {
      const options = Array.isArray(question.options)
        ? question.options
        : JSON.parse(question.options);

      // 如果答案是选项标识（如"B"或"BCD"），转换为选项文本
      if (/^[A-Z]+$/.test(answer)) {
        if (answer.length === 1) {
          // 单选题
          const index = answer.charCodeAt(0) - 65;
          const option = options[index];
          return typeof option === "object" ? option.content : option;
        } else {
          // 多选题
          const selectedOptions = [];
          for (let i = 0; i < answer.length; i++) {
            const index = answer.charCodeAt(i) - 65;
            const option = options[index];
            if (option) {
              selectedOptions.push(
                typeof option === "object" ? option.content : option,
              );
            }
          }
          return selectedOptions.join(", ");
        }
      }

      return answer;
    } catch (error) {
      return answer || "";
    }
  };

  const formatMatchingAnswer = (
    answer: any,
    matching?: {
      leftItems: string[];
      rightItems: string[];
      matches: Record<string, string>;
    },
  ) => {
    if (!answer || !matching) return "";
    const pairs = parseMatchingAnswer(answer);
    if (pairs.length === 0) return "";
    return pairs.map((pair) => `${pair.left}→${pair.right}`).join(", ");
  };

  const parseMatchingAnswer = (answer: any) => {
    if (!answer) return [] as Array<{ left: string; right: string }>;
    if (Array.isArray(answer)) {
      return answer
        .map((pair) => ({
          left: String(pair.left || ""),
          right: String(pair.right || ""),
        }))
        .filter((pair) => pair.left && pair.right);
    }
    if (typeof answer === "string") {
      try {
        const parsed = JSON.parse(answer);
        if (Array.isArray(parsed)) {
          return parsed
            .map((pair) => ({
              left: String(pair.left || ""),
              right: String(pair.right || ""),
            }))
            .filter((pair) => pair.left && pair.right);
        }
      } catch {
        return [];
      }
    }
    return [];
  };

  const normalizeMatchingQuestion = (question: any) => {
    if (question.type !== "MATCHING") return question;
    if (question.matching) return question;
    if (!question.answer) return question;
    try {
      const parsed = JSON.parse(question.answer);
      if (parsed && typeof parsed === "object") {
        const matching = Array.isArray(parsed)
          ? {
              leftItems: parsed
                .map((pair: any) => String(pair.left || ""))
                .filter((item: string) => item.length > 0),
              rightItems: parsed
                .map((pair: any) => String(pair.right || ""))
                .filter((item: string) => item.length > 0),
              matches: Object.fromEntries(
                parsed
                  .filter((pair: any) => pair.left && pair.right)
                  .map((pair: any) => [String(pair.left), String(pair.right)]),
              ),
            }
          : parsed;
        return {
          ...question,
          matching,
        };
      }
    } catch {
      return question;
    }
    return question;
  };

  const handleScoreChange = (questionId: string, score: number) => {
    setManualScores((prev) => ({
      ...prev,
      [questionId]: score,
    }));
  };

  const handleFeedbackVisibilityChange = async (
    value: "FINAL_SCORE" | "ANSWERS" | "FULL_DETAILS",
  ) => {
    if (!examId) return;
    setFeedbackVisibility(value);
    setSavingVisibility(true);

    try {
      await updateExam(examId, { feedbackVisibility: value });
      toast.success("学生反馈显示设置已更新");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "更新显示设置失败");
    } finally {
      setSavingVisibility(false);
    }
  };

  const handleSaveGrading = async () => {
    if (!selectedSubmission) return;

    const totalScore = Object.values(manualScores).reduce(
      (sum, score) => sum + score,
      0,
    );

    try {
      await api.post(
        `/api/exams/${examId}/submissions/${selectedSubmission.id}/grade`,
        {
          scores: manualScores,
          totalScore,
          reviewerId: "teacher", // 临时使用固定值，实际应该从用户上下文获取
        },
      );

      toast.success("评分复核完成！");
      await loadExamAndSubmissions();
    } catch (err: any) {
      setError(err.response?.data?.message || "保存失败");
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

  if (error) {
    return (
      <div className="bg-slatebg text-ink-900 antialiased min-h-screen pt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-white p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-ink-900 mb-4">{error}</p>
            <Button onClick={() => navigate("/exams")}>返回考试列表</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ExamLayout activeTab="grading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {showBackToTop && (
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-green-200 bg-white/90 px-4 py-2 text-sm font-semibold text-green-800 shadow-lg backdrop-blur transition hover:bg-white"
          >
            <ArrowUp className="h-4 w-4" />
            回到顶部
          </button>
        )}
        <div className="rounded-3xl border-2 border-green-100 bg-gradient-to-br from-green-50 to-white p-8 shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-green-900">评分管理</h2>
              <p className="mt-1 text-sm text-green-800">
                {exam?.title ? `考试：${exam.title}` : ""}
                {typeof submissions.length === "number"
                  ? `（共 ${submissions.length} 份提交）`
                  : ""}
              </p>
            </div>

            {submissions.length > 0 && (
              <div className="flex flex-wrap items-center justify-end gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">学生反馈显示</span>
                  <select
                    value={feedbackVisibility}
                    onChange={(event) =>
                      handleFeedbackVisibilityChange(
                        event.target.value as
                          | "FINAL_SCORE"
                          | "ANSWERS"
                          | "FULL_DETAILS",
                      )
                    }
                    disabled={savingVisibility}
                    className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-ink-900"
                  >
                    {feedbackOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {savingVisibility && (
                    <span className="text-xs text-gray-500">保存中...</span>
                  )}
                </div>
                <span className="text-sm text-gray-600">
                  已选择 {selectedSubmissions.size} 项
                </span>
                <Button
                  onClick={handleBatchApprove}
                  disabled={selectedSubmissions.size === 0 || approveLoading}
                  variant="outline"
                >
                  {approveLoading ? "复核中..." : "多选复核确认得分"}
                </Button>
                <Button
                  onClick={handleBatchReset}
                  disabled={selectedSubmissions.size === 0 || resetLoading}
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  {resetLoading ? "重置中..." : "批量重置"}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 提交列表 */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-border bg-white p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-ink-900">学生提交</h3>
                {submissions.length > 0 && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedSubmissions.size === submissions.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded"
                    />
                    全选
                  </label>
                )}
              </div>
              <div className="space-y-2">
                {submissions.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">暂无提交记录</p>
                ) : (
                  submissions.map((submission) => {
                    return (
                      <div
                        key={submission.id}
                        className={`border rounded-xl transition-colors ${
                          selectedSubmission?.id === submission.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-border bg-white hover:border-blue-300"
                        }`}
                      >
                        <div className="flex items-center gap-3 p-3">
                          <input
                            type="checkbox"
                            checked={selectedSubmissions.has(submission.id)}
                            onChange={(e) =>
                              handleSubmissionCheck(
                                submission.id,
                                e.target.checked,
                              )
                            }
                            className="rounded"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            onClick={() => handleSubmissionSelect(submission)}
                            className="flex-1 text-left"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-ink-600" />
                                <span className="font-medium text-ink-900">
                                  {submission.student.displayName ||
                                    submission.student.username}
                                </span>
                                {submission.student.accountType && (
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${getStudentSourceBadgeClass(
                                      submission.student.accountType,
                                    )}`}
                                  >
                                    {getStudentSourceLabel(
                                      submission.student.accountType,
                                    )}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {submission.score !== null ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : submission.gradingDetails ? (
                                  <div className="flex items-center gap-1">
                                    <Bot className="h-4 w-4 text-blue-500" />
                                    <span className="text-xs text-blue-600">
                                      AI已评
                                    </span>
                                  </div>
                                ) : (
                                  <Clock className="h-4 w-4 text-orange-500" />
                                )}
                              </div>
                            </div>
                            <div className="mt-1 text-xs text-ink-600">
                              提交时间:{" "}
                              {new Date(
                                submission.submittedAt,
                              ).toLocaleString()}
                            </div>
                            {submission.gradingDetails && (
                              <div className="mt-1 text-sm">
                                <span className="text-blue-600 font-semibold">
                                  AI预评分:{" "}
                                  {submission.gradingDetails.totalScore}/
                                  {submission.gradingDetails.maxTotalScore}
                                </span>
                                {!submission.gradingDetails
                                  .isFullyAutoGraded && (
                                  <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                                    需复审
                                  </span>
                                )}
                                {submission.isReviewed ? (
                                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                    已复核
                                  </span>
                                ) : (
                                  submission.isAutoGraded && (
                                    <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                                      待复核
                                    </span>
                                  )
                                )}
                              </div>
                            )}
                            {submission.score !== null && (
                              <div className="mt-1 text-sm font-semibold text-green-600">
                                最终得分: {submission.score}/{exam?.totalScore}
                                {submission.isReviewed &&
                                  submission.reviewedAt && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      复核时间:{" "}
                                      {new Date(
                                        submission.reviewedAt,
                                      ).toLocaleString()}
                                    </div>
                                  )}
                              </div>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* 评分区域 */}
          <div className="lg:col-span-2">
            {selectedSubmission ? (
              <div className="rounded-2xl border border-border bg-white p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-ink-900">
                    评分 -{" "}
                    {selectedSubmission.student.displayName ||
                      selectedSubmission.student.username}
                  </h3>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={openAnalysisModal}
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      AI分析
                    </Button>
                    {gradingLoading && (
                      <div className="flex items-center gap-2 text-blue-600">
                        <Bot className="h-4 w-4" />
                        <span className="text-sm">AI分析中...</span>
                      </div>
                    )}
                  </div>
                </div>

                {gradingLoadError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5" />
                      <div>
                        <div className="font-semibold">数据加载失败</div>
                        <div className="mt-1">{gradingLoadError}</div>
                        <div className="mt-3">
                          <Button
                            variant="outline"
                            onClick={() =>
                              loadAISuggestions(selectedSubmission)
                            }
                          >
                            重试加载
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : Object.keys(aiSuggestions).length > 0 ? (
                  <div className="space-y-6">
                    {/* 考试概览 */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <h4 className="font-semibold text-blue-800 mb-2">
                        答题概览
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {(() => {
                          const totalQuestions =
                            exam?.examQuestions?.length || 0;
                          const answeredQuestions =
                            exam?.examQuestions?.filter((examQuestion: any) => {
                              const answer =
                                selectedSubmission.answers[
                                  examQuestion.question.id
                                ];
                              return (
                                answer !== undefined &&
                                answer !== null &&
                                answer !== "" &&
                                (Array.isArray(answer)
                                  ? answer.length > 0
                                  : true)
                              );
                            }).length || 0;

                          return (
                            <>
                              <div>
                                <span className="text-blue-600">总题数:</span>
                                <span className="font-semibold ml-1">
                                  {totalQuestions}
                                </span>
                              </div>
                              <div>
                                <span className="text-blue-600">已答题:</span>
                                <span className="font-semibold ml-1">
                                  {answeredQuestions}
                                </span>
                              </div>
                              <div>
                                <span className="text-blue-600">满分:</span>
                                <span className="font-semibold ml-1">
                                  {exam?.totalScore}
                                </span>
                              </div>
                              <div>
                                <span className="text-blue-600">提交时间:</span>
                                <span className="font-semibold ml-1">
                                  {new Date(
                                    selectedSubmission.submittedAt,
                                  ).toLocaleString()}
                                </span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {exam?.examQuestions?.map(
                      (examQuestion: any, index: number) => {
                        const question = normalizeMatchingQuestion(
                          examQuestion.question,
                        );
                        const suggestion = aiSuggestions[question.id];
                        const studentAnswer =
                          selectedSubmission.answers[question.id];
                        const hasAnswer =
                          studentAnswer !== undefined &&
                          studentAnswer !== null &&
                          studentAnswer !== "";

                        return (
                          <div
                            key={question.id}
                            className="border border-border rounded-xl p-6"
                          >
                            {/* 题目信息 */}
                            <div className="mb-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-ink-900">
                                  第 {index + 1} 题
                                  <span className="ml-2 text-sm bg-gray-100 px-2 py-1 rounded">
                                    {getQuestionTypeLabel(question.type)}
                                  </span>
                                </h4>
                                <span className="text-sm font-semibold text-blue-600">
                                  {examQuestion.score} 分
                                </span>
                              </div>

                              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                <p className="text-ink-900 font-medium mb-2">
                                  题目内容:
                                </p>
                                <p className="text-ink-700">
                                  {question.content}
                                </p>

                                {/* 显示选项（如果是选择题） */}
                                {(question.type === "SINGLE_CHOICE" ||
                                  question.type === "MULTIPLE_CHOICE") &&
                                  question.options && (
                                    <div className="mt-3">
                                      <p className="text-sm font-medium text-ink-700 mb-2">
                                        选项:
                                      </p>
                                      <div className="space-y-1">
                                        {(Array.isArray(question.options)
                                          ? question.options
                                          : JSON.parse(question.options)
                                        ).map(
                                          (
                                            option:
                                              | string
                                              | {
                                                  label?: string;
                                                  content: string;
                                                },
                                            optIndex: number,
                                          ) => {
                                            const optionText =
                                              typeof option === "string"
                                                ? option
                                                : option.content;
                                            const optionLabel =
                                              typeof option === "string"
                                                ? String.fromCharCode(
                                                    65 + optIndex,
                                                  )
                                                : option.label ||
                                                  String.fromCharCode(
                                                    65 + optIndex,
                                                  );

                                            return (
                                              <div
                                                key={optIndex}
                                                className="text-sm text-ink-600"
                                              >
                                                {optionLabel}. {optionText}
                                              </div>
                                            );
                                          },
                                        )}
                                      </div>
                                    </div>
                                  )}

                                {/* 显示参考答案 */}
                                {question.answer && (
                                  <div className="mt-3 pt-3 border-t border-gray-200">
                                    <p className="text-sm font-medium text-green-700 mb-1">
                                      参考答案:
                                    </p>
                                    <p className="text-sm text-green-600">
                                      {(() => {
                                        const converted = convertAnswerToText(
                                          question.answer,
                                          question,
                                        );
                                        return converted;
                                      })()}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* 学生答案 */}
                            <div className="mb-4">
                              <div
                                className={`rounded-lg p-4 border-2 ${
                                  hasAnswer
                                    ? "bg-white border-blue-200"
                                    : "bg-red-50 border-red-200"
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <p className="font-medium text-ink-700">
                                    学生答案:
                                  </p>
                                  {!hasAnswer && (
                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                      未作答
                                    </span>
                                  )}
                                </div>

                                {hasAnswer ? (
                                  <div className="text-ink-900">
                                    {question.type === "MULTIPLE_CHOICE" &&
                                    Array.isArray(studentAnswer) ? (
                                      <div className="space-y-1">
                                        {String(
                                          formatAnswerDisplay(
                                            studentAnswer,
                                            question,
                                          ),
                                        )
                                          .split(", ")
                                          .map(
                                            (answer: string, idx: number) => (
                                              <div
                                                key={idx}
                                                className="text-sm"
                                              >
                                                • {answer}
                                              </div>
                                            ),
                                          )}
                                      </div>
                                    ) : (
                                      <div className="whitespace-pre-wrap">
                                        {formatAnswerDisplay(
                                          studentAnswer,
                                          question,
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-gray-500 italic">
                                    学生未回答此题
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* AI评分建议 */}
                            {suggestion?.type === "objective" && (
                              <div
                                className={`rounded-lg p-4 mb-4 ${
                                  suggestion.isCorrect
                                    ? "bg-green-50 border border-green-200"
                                    : "bg-red-50 border border-red-200"
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <span
                                    className={`text-lg ${suggestion.isCorrect ? "text-green-600" : "text-red-600"}`}
                                  >
                                    {suggestion.isCorrect ? "✓" : "✗"}
                                  </span>
                                  <p className="font-medium">
                                    {suggestion.isCorrect
                                      ? "答案正确"
                                      : "答案错误"}
                                  </p>
                                  <span
                                    className={`text-sm px-2 py-1 rounded ${
                                      suggestion.isCorrect
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    自动评分: {suggestion.score}/
                                    {suggestion.maxScore}
                                  </span>
                                </div>
                                <p className="text-sm">{suggestion.feedback}</p>
                              </div>
                            )}

                            {suggestion?.aiSuggestion && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <Bot className="h-5 w-5 text-blue-600" />
                                  <span className="font-medium text-blue-800">
                                    AI评分建议
                                  </span>
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                    置信度:{" "}
                                    {Math.round(
                                      (suggestion.aiSuggestion?.confidence ||
                                        0) * 100,
                                    )}
                                    %
                                  </span>
                                </div>

                                <div className="space-y-2 text-sm">
                                  <div>
                                    <span className="font-medium text-blue-700">
                                      建议得分:
                                    </span>
                                    <span className="ml-2 bg-blue-100 px-2 py-1 rounded font-semibold">
                                      {suggestion.aiSuggestion
                                        ?.suggestedScore || 0}
                                      /{suggestion.maxScore}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-blue-700">
                                      评分理由:
                                    </span>
                                    <p className="mt-1 text-blue-600">
                                      {suggestion.aiSuggestion?.reasoning}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="font-medium text-blue-700">
                                      改进建议:
                                    </span>
                                    <p className="mt-1 text-blue-600">
                                      {suggestion.aiSuggestion?.suggestions}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 教师评分 */}
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <label className="font-medium text-yellow-800">
                                  教师评分:
                                </label>
                                <div className="flex items-center gap-3">
                                  <input
                                    type="number"
                                    min="0"
                                    max={
                                      suggestion?.maxScore || examQuestion.score
                                    }
                                    value={manualScores[question.id] || 0}
                                    onChange={(e) =>
                                      handleScoreChange(
                                        question.id,
                                        parseInt(e.target.value) || 0,
                                      )
                                    }
                                    className="w-20 rounded-lg border border-yellow-300 px-3 py-2 text-center font-semibold"
                                  />
                                  <span className="text-yellow-700">
                                    /{" "}
                                    {suggestion?.maxScore || examQuestion.score}
                                  </span>
                                  <div className="text-xs text-yellow-600">
                                    {Math.round(
                                      ((manualScores[question.id] || 0) /
                                        (suggestion?.maxScore ||
                                          examQuestion.score)) *
                                        100,
                                    )}
                                    %
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      },
                    )}

                    <div className="border-t border-border pt-4">
                      <div className="space-y-3">
                        {/* AI预评分 */}
                        {selectedSubmission.gradingDetails && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Bot className="h-5 w-5 text-blue-600" />
                                <span className="font-semibold text-blue-800">
                                  AI预评分
                                </span>
                              </div>
                              <div className="text-lg font-bold text-blue-700">
                                {selectedSubmission.gradingDetails.totalScore} /{" "}
                                {
                                  selectedSubmission.gradingDetails
                                    .maxTotalScore
                                }
                              </div>
                            </div>
                            {!selectedSubmission.gradingDetails
                              .isFullyAutoGraded && (
                              <p className="text-xs text-blue-600 mt-1">
                                * 包含主观题，建议教师复审确认
                              </p>
                            )}
                          </div>
                        )}

                        {/* 教师最终评分 */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="text-lg font-semibold text-yellow-800">
                              教师最终评分:{" "}
                              {Object.values(manualScores).reduce(
                                (sum, score) => sum + score,
                                0,
                              )}{" "}
                              / {exam?.totalScore}
                            </div>
                            <div className="flex items-center gap-2">
                              {selectedSubmission.isReviewed && (
                                <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded">
                                  已复核
                                </span>
                              )}
                              <Button
                                onClick={handleSaveGrading}
                                className="flex items-center gap-2"
                              >
                                <Save className="h-4 w-4" />
                                {selectedSubmission.isReviewed
                                  ? "重新复核"
                                  : selectedSubmission.score !== null
                                    ? "复核评分"
                                    : "确认评分"}
                              </Button>
                            </div>
                          </div>
                          {selectedSubmission.isAutoGraded &&
                            !selectedSubmission.isReviewed &&
                            Array.isArray(selectedSubmission.answers) &&
                            selectedSubmission.answers.some((answer) =>
                              ["ESSAY", "FILL_BLANK"].includes(
                                exam?.examQuestions?.find(
                                  (eq: any) =>
                                    eq.question.id === answer.questionId,
                                )?.question.type,
                              ),
                            ) && (
                              <div className="mt-2 text-sm text-orange-600 bg-orange-50 p-2 rounded">
                                ⚠️ 此提交包含AI评分，需要教师复核确认
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-500 mb-4">
                      <Bot className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p>暂无评分数据</p>
                      <p className="text-sm">
                        请等待系统加载评分信息，或检查提交是否包含有效答案
                      </p>
                    </div>
                    {!gradingLoading && (
                      <Button
                        onClick={() =>
                          selectedSubmission &&
                          loadAISuggestions(selectedSubmission)
                        }
                        className="flex items-center gap-2 mx-auto"
                      >
                        <Bot className="h-4 w-4" />
                        重新加载评分
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-white p-6 text-center">
                <p className="text-ink-600">请选择一个学生提交进行评分</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 学生答题详情模态框 */}
      <Modal
        isOpen={showAnswerModal}
        onClose={() => setShowAnswerModal(false)}
        title={`AI分析 - ${selectedSubmission?.student.displayName || selectedSubmission?.student.username || ""}`}
        maxWidthClassName="max-w-5xl"
      >
        {!selectedSubmission ? (
          <div className="text-sm text-ink-700">请先选择一个学生提交。</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-ink-700">
                {analysisLoading && "正在读取已生成报告..."}
                {!analysisLoading && analysisStreaming && (
                  <>
                    <span className="font-semibold text-ink-900">生成中</span>
                    {analysisProgressMessage
                      ? `：${analysisProgressMessage}`
                      : ""}
                  </>
                )}
                {!analysisLoading &&
                  !analysisStreaming &&
                  analysisProgressMessage && (
                    <span>{analysisProgressMessage}</span>
                  )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startAnalysisStream({ force: true })}
                  disabled={analysisLoading || analysisStreaming}
                >
                  重新生成
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (analysisText) {
                      const textToCopy = analysisText || "";
                      if (!navigator.clipboard) {
                        toast.error(
                          "复制失败",
                          "浏览器不支持自动复制，请手动选择复制",
                        );
                        return;
                      }
                      navigator.clipboard.writeText(textToCopy);
                      toast.success("已复制到剪贴板");
                    }
                  }}
                  disabled={!analysisText}
                >
                  复制
                </Button>
              </div>
            </div>

            {(analysisLoading || analysisStreaming) && (
              <div>
                <div className="h-2 w-full rounded-full bg-ink-100 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{
                      width: `${Math.min(100, Math.max(0, analysisProgress))}%`,
                    }}
                  />
                </div>
                <div className="mt-1 text-xs text-ink-600">
                  {analysisProgress}%
                </div>
              </div>
            )}

            {analysisError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {analysisError}
              </div>
            )}

            <div className="rounded-lg border border-border bg-white p-3 max-h-[65vh] overflow-auto">
              {analysisRecord?.status && (
                <div className="mb-2 text-xs text-ink-600">
                  状态：{analysisRecord.status}
                </div>
              )}
              {analysisText ? (
                <div className="prose prose-sm max-w-none">
                  <Suspense
                    fallback={
                      <div className="text-sm text-ink-600">加载报告...</div>
                    }
                  >
                    <MDEditorMarkdown {...({ source: analysisText } as any)} />
                  </Suspense>
                </div>
              ) : (
                <div className="text-sm text-ink-700">
                  {analysisLoading
                    ? "加载中..."
                    : analysisStreaming
                      ? "正在生成报告内容..."
                      : "暂无报告，点击“重新生成”开始。"}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showApproveSummaryModal}
        onClose={() => setShowApproveSummaryModal(false)}
        title="批量复核结果"
      >
        {approveSummary ? (
          <div className="space-y-4">
            <div className="text-sm text-ink-700">
              已复核生效:{" "}
              <span className="font-semibold">
                {approveSummary.approvedCount}
              </span>
              ，跳过:{" "}
              <span className="font-semibold">
                {approveSummary.skippedCount}
              </span>
              ，未找到:{" "}
              <span className="font-semibold">
                {approveSummary.notFoundCount}
              </span>
            </div>
            <div className="space-y-2 text-xs text-ink-600">
              {approveSummary.approved.length > 0 &&
                (() => {
                  const list = approveListExpanded
                    ? approveSummary.approved
                    : approveSummary.approved.slice(
                        0,
                        APPROVE_LIST_PREVIEW_COUNT,
                      );
                  const hiddenCount =
                    approveSummary.approved.length - list.length;

                  return (
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-ink-700">
                          已复核生效
                        </div>
                        {approveSummary.approved.length >
                          APPROVE_LIST_PREVIEW_COUNT && (
                          <button
                            type="button"
                            className="text-xs text-ink-600 hover:text-ink-900"
                            onClick={() => setApproveListExpanded((v) => !v)}
                          >
                            {approveListExpanded
                              ? "收起"
                              : `显示全部（+${hiddenCount}）`}
                          </button>
                        )}
                      </div>
                      <div className="mt-1 space-y-1">
                        {list.map((item) => {
                          const name =
                            item.student?.displayName ||
                            item.student?.username ||
                            item.submissionId;

                          return (
                            <div key={item.submissionId} className="break-all">
                              {name}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

              {approveSummary.skipped.length > 0 &&
                (() => {
                  const list = skippedListExpanded
                    ? approveSummary.skipped
                    : approveSummary.skipped.slice(
                        0,
                        APPROVE_LIST_PREVIEW_COUNT,
                      );
                  const hiddenCount =
                    approveSummary.skipped.length - list.length;

                  return (
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-ink-700">跳过</div>
                        {approveSummary.skipped.length >
                          APPROVE_LIST_PREVIEW_COUNT && (
                          <button
                            type="button"
                            className="text-xs text-ink-600 hover:text-ink-900"
                            onClick={() => setSkippedListExpanded((v) => !v)}
                          >
                            {skippedListExpanded
                              ? "收起"
                              : `显示全部（+${hiddenCount}）`}
                          </button>
                        )}
                      </div>
                      <div className="mt-1 space-y-1">
                        {list.map((item) => {
                          const name =
                            item.student?.displayName ||
                            item.student?.username ||
                            item.submissionId;
                          const reasonText =
                            item.reason === "ALREADY_REVIEWED"
                              ? "已复核"
                              : item.reason === "NO_SCORE"
                                ? "无可用得分"
                                : item.reason;

                          return (
                            <div key={item.submissionId} className="break-all">
                              {name}（{reasonText}）
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

              {approveSummary.notFoundSubmissionIds.length > 0 && (
                <div>
                  <div className="font-medium text-ink-700">未找到</div>
                  <div className="mt-1 break-all">
                    {approveSummary.notFoundSubmissionIds.join(", ")}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </ExamLayout>
  );
}
