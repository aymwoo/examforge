import { useState, useEffect, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Clock,
  FileText,
  Save,
  Send,
  AlertCircle,
  CheckCircle,
  X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import api from "@/services/api";
import { resolveAssetUrl } from "@/utils/url";
import { streamSse } from "@/utils/sse";
const MDEditor = lazy(() => import("@uiw/react-md-editor"));
import "@uiw/react-md-editor/markdown-editor.css";
import { FillBlankQuestion } from "@/components/exam/FillBlankQuestion";
import { MatchingQuestion } from "@/components/exam/MatchingQuestion";

interface Question {
  id: string;
  content: string;
  type: string;
  options?: string[];
  matching?: {
    leftItems: string[];
    rightItems: string[];
    matches: Record<string, string>;
  };
  images?: string[];
  score: number;
  order: number;
}

interface ExamInfo {
  id: string;
  title: string;
  description?: string;
  duration: number;
  totalScore: number;
  questions: Question[];
}

interface ExamStudent {
  id: string;
  username: string;
  displayName?: string;
}

export default function ExamTakePage() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<ExamInfo | null>(null);
  const [student, setStudent] = useState<ExamStudent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [showGradingResults, setShowGradingResults] = useState(false);
  const [gradingResults, setGradingResults] = useState<any>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    message: "",
  });
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [showDetailedResults, setShowDetailedResults] = useState(false);
  const [detailedResultsLoading, setDetailedResultsLoading] = useState(false);
  const [feedbackVisibility, setFeedbackVisibility] = useState<
    "FINAL_SCORE" | "ANSWERS" | "FULL_DETAILS"
  >("FINAL_SCORE");
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const normalizeMatchingPayload = (question: any) => {
    if (!question) return undefined;
    if (question.matching) return question.matching;
    if (question.type !== "MATCHING" || !question.answer) return undefined;
    try {
      const parsed = JSON.parse(question.answer);
      if (Array.isArray(parsed)) {
        const leftItems = parsed
          .map((pair: any) => String(pair.left || ""))
          .filter((item: string) => item.length > 0);
        const rightItems = parsed
          .map((pair: any) => String(pair.right || ""))
          .filter((item: string) => item.length > 0);
        const matches = Object.fromEntries(
          parsed
            .filter((pair: any) => pair.left && pair.right)
            .map((pair: any) => [String(pair.left), String(pair.right)]),
        );
        return {
          leftItems,
          rightItems,
          matches,
        };
      }
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch {
      return undefined;
    }
    return undefined;
  };

  const parseMatchingPairs = (value: any) => {
    if (!value) return [] as Array<{ left: string; right: string }>;
    if (Array.isArray(value)) {
      return value
        .map((pair) => ({
          left: String(pair.left || ""),
          right: String(pair.right || ""),
        }))
        .filter((pair) => pair.left && pair.right);
    }
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed
            .map((pair) => ({
              left: String(pair.left || ""),
              right: String(pair.right || ""),
            }))
            .filter((pair) => pair.left && pair.right);
        }
        if (parsed && typeof parsed === "object") {
          const matches = (parsed as any).matches || {};
          return Object.entries(matches).map(([left, right]) => ({
            left: String(left),
            right: String(right),
          }));
        }
      } catch {
        return [];
      }
    }
    return [];
  };

  const formatMatchingPairs = (value: any) => {
    const pairs = parseMatchingPairs(value);
    if (pairs.length === 0) return "";
    return pairs.map((pair) => `${pair.left}→${pair.right}`).join(", ");
  };

  useEffect(() => {
    // 检查是否已登录
    const studentData = localStorage.getItem("examStudent");

    if (studentData) {
      try {
        setStudent(JSON.parse(studentData));
      } catch {
        localStorage.removeItem("examStudent");
      }
    }

    void loadExamInfo();
  }, [examId, navigate]);

  const loadExamInfo = async () => {
    if (!examId) return;

    setLoading(true);
    try {
      const [examResponse] = await Promise.all([
        api.get(`/api/exams/${examId}/take`, {
          withCredentials: true,
        }),
        checkSubmissionStatus(),
      ]);

      // 确保images数据不被修改
      const examData = {
        ...examResponse.data,
        questions: examResponse.data.questions?.map((q: any) => ({
          ...q,
          images: q.images || [],
          matching: normalizeMatchingPayload(q),
        })),
      };

      setExam(examData);
      setFeedbackVisibility(examData?.feedbackVisibility || "FINAL_SCORE");
      setTimeLeft(examResponse.data.duration * 60); // 转换为秒

      // 检查是否已提交由独立 effect 处理
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem("examToken");
        localStorage.removeItem("examStudent");
        navigate(`/exam/${examId}/login`);
      } else {
        setError(err.response?.data?.message || "加载考试信息失败");
      }
    } finally {
      setLoading(false);
    }
  };

  const checkSubmissionStatus = async () => {
    try {
      // 检查提交状态
      const studentData = JSON.parse(
        localStorage.getItem("examStudent") || "{}",
      );
      if (!studentData?.id) return;
      const statusResponse = await api.get(
        `/api/exams/${examId}/submission-status/${studentData.id}`,
        {
          withCredentials: true,
        },
      );

      if (statusResponse.data.hasSubmitted) {
        setIsSubmitted(true);
        const submission = statusResponse.data.submission;
        setSubmissionResult(submission);

        if (submission?.gradingDetails) {
          try {
            const parsedDetails =
              typeof submission.gradingDetails === "string"
                ? JSON.parse(submission.gradingDetails)
                : submission.gradingDetails;
            setGradingResults(parsedDetails);
          } catch {
            // ignore
          }
        }
      }
    } catch (error) {
      console.error("检查提交状态失败:", error);
    }
  };

  // 倒计时
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmitExam(); // 时间到自动提交
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // 自动保存
  useEffect(() => {
    if (!exam || Object.keys(answers).length === 0 || isSubmitted) return;

    const autoSaveTimer = setInterval(() => {
      handleAutoSave();
    }, 30000); // 每30秒自动保存

    return () => clearInterval(autoSaveTimer);
  }, [answers, exam, isSubmitted]);

  const handleAutoSave = async () => {
    if (!student || !examId || isSubmitted) return;

    setAutoSaving(true);
    try {
      await api.post(
        `/api/exams/${examId}/save-answers`,
        {
          answers,
        },
        {
          withCredentials: true,
        },
      );
    } catch (err) {
      console.error("自动保存失败:", err);
    } finally {
      setAutoSaving(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers((prev) => {
      const newAnswers = {
        ...prev,
        [questionId]: answer,
      };
      return newAnswers;
    });
  };





  const handleSubmitExam = async () => {
    if (!student || !examId) return;

    setIsSubmitting(true);
    setShowProgressModal(true);
    setProgress({ current: 0, total: 0, message: "正在提交..." });

    try {
      // 提交考试
      await api.post(
        `/api/exams/${examId}/submit`,
        {
          answers,
        },
        {
          withCredentials: true,
        },
      );

      // 监听进度
      const sseController = await streamSse({
        url: `/api/exams/${examId}/submit-progress/${student.id}`,
        onMessage: (payload) => {
          const data = JSON.parse(payload);

          if (data.type === "progress") {
            setProgress({
              current: data.current,
              total: data.total,
              message: data.message,
            });
          } else if (data.type === "complete") {
            setSubmissionResult(data.submission);
            setIsSubmitted(true);

            if (data.submission?.gradingDetails) {
              try {
                const parsedDetails =
                  typeof data.submission.gradingDetails === "string"
                    ? JSON.parse(data.submission.gradingDetails)
                    : data.submission.gradingDetails;
                setGradingResults(parsedDetails);
              } catch {
                // ignore
              }
            }

            setShowProgressModal(false);
            sseController.abort();
          } else if (data.type === "error") {
            setError(data.message);
            setShowProgressModal(false);
            sseController.abort();
          }
        },
        onError: () => {
          setError("连接中断，请刷新页面查看结果");
          setShowProgressModal(false);
        },
      });
    } catch (err: any) {
      setError(err.response?.data?.message || "提交失败");
      setShowProgressModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    if (confirm("确定要退出考试吗？未保存的答案将丢失。")) {
      localStorage.removeItem("examStudent");
      localStorage.removeItem("examToken");
      void api.post("/api/auth/exam-logout").catch(() => null);
      navigate(`/exam/${examId}/login`);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="bg-slatebg text-ink-900 antialiased min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-ink-700">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slatebg text-ink-900 antialiased min-h-screen flex items-center justify-center">
        <div className="rounded-2xl border border-border bg-white p-6 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-ink-900 mb-4">{error}</p>
          <Button onClick={() => navigate(`/exam/${examId}/login`)}>
            重新登录
          </Button>
        </div>
      </div>
    );
  }

  if (!exam) return null;

  // 已提交状态的醒目提示
  if (isSubmitted) {
    return (
      <div className="bg-slatebg text-ink-900 antialiased min-h-screen">
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center max-w-md">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-800 mb-4">
              考试已提交
            </h2>
            <p className="text-green-700 mb-4">
              您已成功提交考试，无需重复操作。
            </p>
            {submissionResult && (
              <div className="bg-white rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600">
                  提交时间:{" "}
                  {new Date(submissionResult.submittedAt).toLocaleString()}
                </p>
                <p className="text-lg font-semibold text-green-600">
                  得分: {submissionResult.score}分
                </p>
                {exam?.questions?.some(
                  (q) => q.type === "ESSAY" || q.type === "FILL_BLANK",
                ) && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-yellow-800">
                        试卷中包含主观题，分数需要教师复核之后才会生效
                      </p>
                    </div>
                  </div>
                )}
                {feedbackVisibility === "FINAL_SCORE" && (
                  <p className="mt-3 text-sm text-gray-600">
                    评分明细由教师设置为仅显示总分
                  </p>
                )}
              </div>
            )}
            <div className="flex gap-3">
              {submissionResult && feedbackVisibility !== "FINAL_SCORE" && (
                <Button
                  disabled={detailedResultsLoading}
                  onClick={async () => {
                    if (detailedResultsLoading) return;
                    setDetailedResultsLoading(true);
                    try {
                      // 设置评分详情数据（优先使用已有数据）
                      if (submissionResult.gradingDetails) {
                        try {
                          const parsedDetails =
                            typeof submissionResult.gradingDetails === "string"
                              ? JSON.parse(submissionResult.gradingDetails)
                              : submissionResult.gradingDetails;
                          setGradingResults(parsedDetails);
                        } catch {
                          // ignore
                        }
                      }

                      // 每次打开都主动拉取最新评分详情，避免缓存/状态过期
                      if (submissionResult?.id) {
                        try {
                          const statusResponse = await api.get(
                            `/api/exams/${examId}/submission-status/${student?.id}`,
                            {
                              withCredentials: true,
                            },
                          );

                          const submission = statusResponse.data?.submission;
                          if (submission) {
                            setSubmissionResult(submission);
                          }
                          if (submission?.gradingDetails) {
                            setGradingResults(submission.gradingDetails);
                          }
                        } catch (err) {
                          console.error("fetch gradingDetails failed", err);
                        }
                      }

                      setShowDetailedResults(true);
                    } finally {
                      setDetailedResultsLoading(false);
                    }
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  {detailedResultsLoading ? "加载评分中..." : "评分详情"}
                </Button>
              )}
              <Button
                onClick={() => navigate("/")}
                className="bg-green-600 hover:bg-green-700 flex-1"
              >
                返回首页
              </Button>
            </div>
          </div>
        </div>

        {/* 评分详情Modal */}
        {showDetailedResults && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">评分详情</h2>
                  <button
                    onClick={() => setShowDetailedResults(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                {submissionResult && (
                  <div className="mt-4 flex gap-6 text-sm text-gray-600">
                    <div>
                      总分:{" "}
                      <span className="font-bold text-lg text-green-600">
                        {submissionResult.score}分
                      </span>
                    </div>
                    <div>
                      提交时间:{" "}
                      {new Date(submissionResult.submittedAt).toLocaleString()}
                    </div>
                    <div>
                      题目数量: {exam?.questions?.length || 0} | 答案数量:{" "}
                      {Array.isArray(submissionResult.answers)
                        ? submissionResult.answers.length
                        : Object.keys(submissionResult.answers || {}).length}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
                {exam?.questions && Array.isArray(exam.questions) ? (
                  <div className="space-y-6">
                    {exam.questions.map((question, index) => {
                      const answer =
                        (Array.isArray(submissionResult?.answers)
                          ? submissionResult.answers.find(
                              (a: any) => a.questionId === question.id,
                            )?.answer
                          : submissionResult?.answers?.[question.id]) ??
                        undefined;

                      const hasAnswer =
                        answer !== undefined &&
                        answer !== null &&
                        (typeof answer !== "string" || answer.trim() !== "") &&
                        (!Array.isArray(answer) || answer.length > 0);

                      const detail = gradingResults?.details?.[question.id];
                      const correctAnswer = detail?.correctAnswer;
                      const showAnswers =
                        feedbackVisibility === "ANSWERS" ||
                        feedbackVisibility === "FULL_DETAILS";
                      const showFullDetails =
                        feedbackVisibility === "FULL_DETAILS";
                      const isWrong =
                        correctAnswer !== undefined &&
                        hasAnswer &&
                        JSON.stringify(answer) !==
                          JSON.stringify(correctAnswer);
                      return (
                        <div
                          key={question.id}
                          className="border border-gray-200 rounded-xl p-4"
                        >
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">
                              题目 {index + 1}
                            </h3>
                            <div className="text-right">
                              <div className="text-xs text-gray-500">得分</div>
                              <div className="font-bold text-lg">
                                <span
                                  className={
                                    isWrong ? "text-red-700" : "text-gray-600"
                                  }
                                >
                                  {gradingResults?.details?.[question.id]
                                    ?.score ?? 0}
                                </span>
                                <span className="text-gray-400">
                                  /{question.score ?? 0}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <div className="text-sm font-medium text-gray-700 mb-2">
                                题目内容:
                              </div>
                              <div className="text-gray-900">
                                {question.content}
                              </div>
                            </div>

                            {showAnswers && (
                              <div>
                                <div className="text-sm font-medium text-gray-700 mb-2">
                                  您的答案:
                                </div>
                                <div
                                  className={`border rounded-lg p-3 ${
                                    !hasAnswer
                                      ? "bg-gray-50 border-gray-200"
                                      : isWrong
                                        ? "bg-red-50 border-red-200 text-red-700"
                                        : "bg-blue-50 border-blue-200"
                                  }`}
                                >
                                  {(() => {
                                    if (!hasAnswer) return "未作答";
                                    if (question.type === "MATCHING") {
                                      return formatMatchingPairs(answer);
                                    }
                                    if (Array.isArray(answer))
                                      return answer.join(", ");
                                    if (typeof answer === "object")
                                      return JSON.stringify(answer);
                                    return String(answer);
                                  })()}
                                </div>
                              </div>
                            )}

                            {/* 从gradingResults中获取正确答案 */}
                            {showAnswers && detail?.correctAnswer && (
                              <div>
                                <div className="text-sm font-medium text-gray-700 mb-2">
                                  正确答案:
                                </div>
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                  {(() => {
                                    const correctAnswer = detail?.correctAnswer;
                                    if (!correctAnswer) return "";
                                    if (question.type === "MATCHING") {
                                      return formatMatchingPairs(correctAnswer);
                                    }
                                    if (Array.isArray(correctAnswer))
                                      return correctAnswer.join(", ");
                                    if (typeof correctAnswer === "object")
                                      return JSON.stringify(correctAnswer);
                                    return String(correctAnswer);
                                  })()}
                                </div>
                              </div>
                            )}

                            {showFullDetails && detail?.feedback && (
                              <div>
                                <div className="text-sm font-medium text-gray-700 mb-2">
                                  评分说明:
                                </div>
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                                  {detail.feedback}
                                </div>
                              </div>
                            )}

                            {(question as any).explanation &&
                              showFullDetails && (
                                <div>
                                  <div className="text-sm font-medium text-gray-700 mb-2">
                                    题目解析:
                                  </div>
                                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
                                    {(question as any).explanation}
                                  </div>
                                </div>
                              )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    暂无题目数据
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const currentQuestion = exam?.questions?.[currentQuestionIndex];

  return (
    <div className="bg-slatebg text-ink-900 antialiased min-h-screen">
      {/* 顶部导航 */}
      <div className="border-b border-border bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <FileText className="h-6 w-6 text-accent-600" />
              <div>
                <h1 className="text-lg font-semibold text-ink-900">
                  {exam.title}
                </h1>
                <p className="text-sm text-ink-600">
                  {student?.displayName || student?.username}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div
                className={`flex items-center gap-2 text-sm font-semibold ${
                  timeLeft < 300 ? "text-red-600" : "text-ink-600"
                }`}
              >
                <Clock className="h-4 w-4" />
                <span>{formatTime(timeLeft)}</span>
              </div>
              {autoSaving && (
                <div className="flex items-center gap-2 text-xs text-blue-600">
                  <Save className="h-3 w-3" />
                  <span>保存中...</span>
                </div>
              )}
              <Button variant="outline" onClick={handleLogout}>
                退出考试
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 已提交提示 */}
      {isSubmitted && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>注意：</strong>
                  您已经提交过此次考试，无法再次作答。如需查看结果，请联系老师。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 题目导航 */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-border bg-white p-4 sticky top-24">
              <h3 className="font-semibold text-ink-900 mb-4">题目导航</h3>
              <div className="grid grid-cols-5 gap-2">
                {exam.questions?.map((question, index) => (
                  <button
                    key={question.id}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`w-8 h-8 rounded text-xs font-semibold transition-colors ${
                      index === currentQuestionIndex
                        ? "bg-blue-500 text-white"
                        : answers[question.id] !== undefined
                          ? "bg-green-100 text-green-700 border border-green-300"
                          : "bg-gray-100 text-gray-600 border border-gray-300"
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              <div className="mt-4 text-xs text-ink-600">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>当前题目</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                  <span>已答题</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
                  <span>未答题</span>
                </div>
              </div>

              {!isSubmitted && (
                <div className="mt-6">
                  <Button
                    onClick={() => setShowSubmitConfirm(true)}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <Send className="h-4 w-4" />
                    {isSubmitting ? "提交中..." : "提交考试"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* 题目内容 */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-border bg-white p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-ink-900">
                    第 {currentQuestionIndex + 1} 题
                  </h2>
                  <span className="text-sm text-ink-600">
                    {currentQuestion.score} 分
                  </span>
                </div>
                <div className="prose max-w-none">
                  {currentQuestion.type === "FILL_BLANK" ? (
                    <FillBlankQuestion
                      id={currentQuestion.id}
                      content={currentQuestion.content}
                      value={answers[currentQuestion.id]}
                      onChange={(val) =>
                        handleAnswerChange(currentQuestion.id, val)
                      }
                    />
                  ) : (
                    <p className="text-ink-900">{currentQuestion.content}</p>
                  )}
                </div>

                {/* 示例图展示 */}
                {currentQuestion.images &&
                  currentQuestion.images.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-ink-900 mb-2">
                        示例图：
                      </h4>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {currentQuestion.images.map((image, index) => (
                          <div key={`${image}-${index}`} className="relative">
                            <button
                              type="button"
                              className="w-full rounded-lg border border-border bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                              aria-label={`打开题目示例图 ${index + 1}`}
                              onClick={() => {
                                setSelectedImage(resolveAssetUrl(image));
                                setShowImagePreview(true);
                              }}
                            >
                              <img
                                src={resolveAssetUrl(image)}
                                alt={`题目示例图 ${index + 1}`}
                                className="w-full max-h-64 object-contain rounded-lg hover:shadow-md transition-shadow"
                              />
                            </button>
                            {(currentQuestion.images?.length || 0) > 1 && (
                              <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                                {index + 1}/{currentQuestion.images?.length}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>

              {/* 答题区域 */}
              <div className="mb-6">
                {currentQuestion.type === "SINGLE_CHOICE" && (
                  <div className="space-y-3">
                    {currentQuestion.options?.map((option, index) => {
                      // 处理选项格式：可能是字符串或对象
                      const optionText =
                        typeof option === "string"
                          ? option
                          : (option as any)?.content ||
                            (option as any)?.label ||
                            String(option);
                      return (
                        <label
                          key={index}
                          className="flex items-center gap-3 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name={`question-${currentQuestion.id}`}
                            value={optionText}
                            checked={answers[currentQuestion.id] === optionText}
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleAnswerChange(
                                  currentQuestion.id,
                                  optionText,
                                );
                              }
                            }}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-ink-900">
                            {String.fromCharCode(65 + index)}. {optionText}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {currentQuestion.type === "MULTIPLE_CHOICE" && (
                  <div className="space-y-3">
                    {currentQuestion.options?.map((option, index) => {
                      // 处理选项格式：可能是字符串或对象
                      const optionText =
                        typeof option === "string"
                          ? option
                          : (option as any)?.content ||
                            (option as any)?.label ||
                            String(option);
                      return (
                        <label
                          key={index}
                          className="flex items-center gap-3 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            value={optionText}
                            checked={(
                              answers[currentQuestion.id] || []
                            ).includes(optionText)}
                            onChange={(e) => {
                              const currentAnswers =
                                answers[currentQuestion.id] || [];
                              if (e.target.checked) {
                                handleAnswerChange(currentQuestion.id, [
                                  ...currentAnswers,
                                  optionText,
                                ]);
                              } else {
                                handleAnswerChange(
                                  currentQuestion.id,
                                  currentAnswers.filter(
                                    (a: string) => a !== optionText,
                                  ),
                                );
                              }
                            }}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-ink-900">
                            {String.fromCharCode(65 + index)}. {optionText}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {currentQuestion.type === "TRUE_FALSE" && (
                  <div className="space-y-3">
                    {[
                      { label: "正确", value: true },
                      { label: "错误", value: false },
                    ].map((option) => (
                      <label
                        key={String(option.value)}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name={`question-${currentQuestion.id}`}
                          checked={answers[currentQuestion.id] === option.value}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleAnswerChange(
                                currentQuestion.id,
                                option.value,
                              );
                            }
                          }}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-ink-900">{option.label}</span>
                      </label>
                    ))}
                  </div>
                )}


                {currentQuestion.type === "MATCHING" && (
                  <div className="mt-6">
                    <MatchingQuestion
                      content={currentQuestion.content}
                      matching={currentQuestion.matching}
                      value={answers[currentQuestion.id]}
                      onChange={(val) =>
                        handleAnswerChange(currentQuestion.id, val)
                      }
                    />
                  </div>
                )}

                {(currentQuestion.type === "SHORT_ANSWER" ||
                  currentQuestion.type === "ESSAY") && (
                  <div className="border border-border rounded-xl overflow-hidden">
                    <Suspense
                      fallback={
                        <div className="p-4 text-sm text-ink-600">
                          加载编辑器...
                        </div>
                      }
                    >
                      <MDEditor
                        value={answers[currentQuestion.id] || ""}
                        onChange={(value: string | undefined) =>
                          handleAnswerChange(currentQuestion.id, value || "")
                        }
                        preview="edit"
                        hideToolbar={false}
                        visibleDragbar={false}
                        height={
                          currentQuestion.type === "ESSAY"
                            ? 300
                            : 200
                        }
                        data-color-mode="light"
                      />
                    </Suspense>
                  </div>
                )}
              </div>

              {/* 导航按钮 */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() =>
                    setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))
                  }
                  disabled={currentQuestionIndex === 0}
                >
                  上一题
                </Button>

                <div className="flex gap-3">
                  <Button
                    onClick={handleAutoSave}
                    disabled={autoSaving}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {autoSaving ? "保存中..." : "保存答案"}
                  </Button>

                  {currentQuestionIndex <
                  (exam.questions?.length || 0) - 1 ? (
                    <Button
                      onClick={() =>
                        setCurrentQuestionIndex((prev) => prev + 1)
                      }
                    >
                      下一题
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setShowSubmitConfirm(true)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      提交试卷
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 评分结果模态框 */}
      {showGradingResults && gradingResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">考试评分结果</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/exam/${examId}/result`)}
                >
                  查看详细结果
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowGradingResults(false)}
                >
                  关闭
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">总分统计</h3>
                <p className="text-lg">
                  总得分：
                  <span className="font-bold text-blue-600">
                    {gradingResults.totalScore}
                  </span>{" "}
                  / {gradingResults.maxTotalScore}
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">题目评分详情</h3>
                {Object.entries(gradingResults.details || {}).map(
                  ([questionId, detail]: [string, any], index: number) => (
                    <div key={questionId} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">第 {index + 1} 题</span>
                        <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {detail.score} / {detail.maxScore} 分
                        </span>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div>
                          <strong>学生答案：</strong>
                          <div className="bg-gray-50 p-2 rounded mt-1">
                            {detail.studentAnswer}
                          </div>
                        </div>

                        {detail.aiGrading && (
                          <div className="bg-blue-50 p-2 rounded">
                            <strong>AI评价：</strong>
                            {detail.aiGrading.reasoning}
                            {detail.aiGrading.suggestions && (
                              <div className="mt-1 text-gray-600">
                                <strong>建议：</strong>
                                {detail.aiGrading.suggestions}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              确认提交
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              提交后将无法修改答案，是否确认提交？
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowSubmitConfirm(false)}
                disabled={isSubmitting}
              >
                取消
              </Button>
              <Button
                onClick={() => {
                  setShowSubmitConfirm(false);
                  handleSubmitExam();
                }}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                确认提交
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 提交进度Modal */}
      {showProgressModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-progress-title"
          tabIndex={-1}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setShowProgressModal(false);
            }
          }}
        >
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3
              id="submit-progress-title"
              className="text-lg font-semibold text-gray-900 mb-4"
            >
              提交中
            </h3>
            <div className="space-y-4">
              <div className="text-sm text-gray-600">{progress.message}</div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width:
                      progress.total > 0
                        ? `${(progress.current / progress.total) * 100}%`
                        : "0%",
                  }}
                ></div>
              </div>
              <div className="text-sm text-gray-500 text-center">
                {progress.current}/{progress.total}
              </div>
            </div>
          </div>
        </div>
      )}

      {showImagePreview && selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exam-image-preview-title"
          tabIndex={-1}
          onClick={() => setShowImagePreview(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setShowImagePreview(false);
            }
          }}
        >
          <div className="relative max-w-5xl max-h-[90vh]">
            <button
              type="button"
              aria-label="关闭图片预览"
              className="absolute -top-4 -right-4 bg-white rounded-full p-2 shadow"
              onClick={() => setShowImagePreview(false)}
            >
              <X className="h-4 w-4 text-gray-700" />
            </button>
            <h3 id="exam-image-preview-title" className="sr-only">
              题目图片预览
            </h3>
            <img
              src={selectedImage}
              alt="题目示例图预览"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
