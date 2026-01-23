import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Clock, Users, FileText, Award, ArrowLeft } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Button from "@/components/ui/Button";
import api from "@/services/api";
import { isAuthenticated } from "@/utils/auth";

interface StudentExam {
  id: string;
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  duration: number;
  totalScore: number;
  status: string;
  submission?: {
    id: string;
    score: number;
    submittedAt: string;
  };
}

interface StudentInfo {
  id: string;
  studentId: string;
  name: string;
  gender?: string;
  class?: {
    id: string;
    name: string;
    description?: string;
    studentCount: number;
  };
}

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [exams, setExams] = useState<StudentExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      setError("请先登录后再查看学生信息");
      setLoading(false);
      return;
    }

    if (id) {
      loadStudentData(id);
    }
  }, [id]);

  const loadStudentData = async (studentId: string) => {
    try {
      setLoading(true);
      setError("");

      console.log("Token:", localStorage.getItem("token")); // Debug log

      // 获取学生信息和考试记录
      const [studentResponse, examsResponse] = await Promise.all([
        api.get(`/api/students/detail/${studentId}`),
        api.get(`/api/students/detail/${studentId}/exams`),
      ]);

      setStudentInfo(studentResponse.data);
      setExams(examsResponse.data);
    } catch (err: any) {
      console.error("加载学生数据失败:", err);
      if (err.response?.status === 401) {
        setError("登录已过期，请重新登录");
      } else if (err.response?.status === 403) {
        setError("您没有权限查看该学生信息");
      } else {
        setError(err.response?.data?.message || "加载学生信息失败");
      }
    } finally {
      setLoading(false);
    }
  };

  const getExamStatus = (exam: StudentExam) => {
    if (exam.submission) {
      return { text: "已完成", color: "text-green-600 bg-green-50" };
    }

    if (exam.status !== "PUBLISHED") {
      return { text: "未发布", color: "text-gray-600 bg-gray-50" };
    }

    const now = new Date();
    if (exam.endTime && now > new Date(exam.endTime)) {
      return { text: "已结束", color: "text-red-600 bg-red-50" };
    }

    if (exam.startTime && now < new Date(exam.startTime)) {
      return { text: "未开始", color: "text-blue-600 bg-blue-50" };
    }

    return { text: "进行中", color: "text-orange-600 bg-orange-50" };
  };

  const handleViewSubmission = async (examId: string, submissionId: string) => {
    try {
      const response = await api.get(
        `/api/exams/${examId}/submissions/${submissionId}`,
      );
      setSelectedSubmission(response.data);
      setShowSubmissionModal(true);
    } catch (err: any) {
      console.error("获取提交详情失败:", err);
      setError("获取提交详情失败");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN");
  };

  const getScoreTrendData = () => {
    return exams
      .filter((exam) => exam.submission && exam.totalScore > 0)
      .map((exam) => ({
        title: exam.title,
        date:
          exam.submission?.submittedAt || exam.startTime || exam.endTime || "",
        ratio: exam.submission
          ? Math.round((exam.submission.score / exam.totalScore) * 100)
          : 0,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
      return formatMatchingAnswer(answer);
    }

    if (!question.options) return answer ? String(answer) : "";

    const options = Array.isArray(question.options)
      ? question.options
      : (() => {
          try {
            return JSON.parse(question.options);
          } catch {
            return [];
          }
        })();

    if (Array.isArray(answer)) {
      // 多选题：将答案文本数组转换为选项标识数组
      return answer
        .map((answerText) => {
          const index = options.findIndex((opt: any) => {
            const optionText =
              typeof opt === "string"
                ? opt
                : opt?.content || opt?.label || String(opt);
            return optionText === answerText;
          });
          return index >= 0 ? String.fromCharCode(65 + index) : answerText;
        })
        .join(", ");
    }

    // 单选题：将答案文本转换为选项标识
    const index = options.findIndex((opt: any) => {
      const optionText =
        typeof opt === "string"
          ? opt
          : opt?.content || opt?.label || String(opt);
      return optionText === answer;
    });
    return index >= 0 ? String.fromCharCode(65 + index) : String(answer);
  };

  const formatMatchingAnswer = (answer: any) => {
    const pairs = parseMatchingPairs(answer);
    if (pairs.length === 0) return answer ? String(answer) : "";
    return pairs.map((pair) => `${pair.left}→${pair.right}`).join(", ");
  };

  const parseMatchingPairs = (answer: any) => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-4">{error}</div>
          {error.includes("登录") || error.includes("过期") ? (
            <Button
              onClick={() =>
                window.dispatchEvent(new CustomEvent("show401Login"))
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              立即登录
            </Button>
          ) : (
            <Button onClick={() => navigate(-1)} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!studentInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 text-lg mb-4">学生信息不存在</div>
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 学生基本信息 */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex items-center mb-4">
            <Users className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">基本信息</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">姓名</p>
              <p className="font-medium text-gray-900">{studentInfo.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">学号</p>
              <p className="font-medium text-gray-900">
                {studentInfo.studentId}
              </p>
            </div>
            {studentInfo.gender && (
              <div>
                <p className="text-sm text-gray-500">性别</p>
                <p className="font-medium text-gray-900">
                  {studentInfo.gender}
                </p>
              </div>
            )}
            {studentInfo.class && (
              <div>
                <p className="text-sm text-gray-500">班级</p>
                <p className="font-medium text-gray-900">
                  {studentInfo.class.name}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 考试记录 */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  考试记录
                </h2>
                <p className="text-sm text-gray-500">学生参与的所有考试</p>
              </div>
              <div className="text-sm text-gray-500">
                共 {exams.length} 场考试
              </div>
            </div>
            {getScoreTrendData().length > 0 && (
              <div className="mt-6">
                <div className="text-sm text-gray-500 mb-2">得分趋势</div>
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getScoreTrendData()}>
                      <XAxis dataKey="title" hide />
                      <YAxis domain={[0, 100]} hide />
                      <Tooltip
                        formatter={(value) => `${value ?? 0}%`}
                        labelFormatter={(_, payload) =>
                          payload?.[0]?.payload?.title || ""
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="ratio"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 flex justify-between text-xs text-gray-500">
                  <span>早</span>
                  <span>近期</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-6">
            {exams.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  暂无考试记录
                </h3>
                <p className="text-gray-500">暂无相关考试</p>
              </div>
            ) : (
              <div className="space-y-4">
                {exams.map((exam) => {
                  const status = getExamStatus(exam);
                  return (
                    <div
                      key={exam.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <h3 className="text-lg font-medium text-gray-900 mr-3">
                            {exam.title}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}
                          >
                            {status.text}
                          </span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="h-4 w-4 mr-1" />
                          {exam.duration} 分钟
                        </div>
                      </div>

                      {exam.description && (
                        <p className="text-gray-600 mb-3">{exam.description}</p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">总分</p>
                          <p className="font-medium">{exam.totalScore} 分</p>
                        </div>
                        {exam.startTime && (
                          <div>
                            <p className="text-gray-500">开始时间</p>
                            <p className="font-medium">
                              {formatDate(exam.startTime)}
                            </p>
                          </div>
                        )}
                        {exam.endTime && (
                          <div>
                            <p className="text-gray-500">结束时间</p>
                            <p className="font-medium">
                              {formatDate(exam.endTime)}
                            </p>
                          </div>
                        )}
                        {exam.submission && (
                          <div>
                            <p className="text-gray-500">得分</p>
                            <div className="flex items-center">
                              <Award className="h-4 w-4 text-yellow-500 mr-1" />
                              <p className="font-medium text-green-600">
                                {exam.submission.score} / {exam.totalScore}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {exam.submission && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500">
                              提交时间:{" "}
                              {formatDate(exam.submission.submittedAt)}
                            </p>
                            <Button
                              onClick={() =>
                                handleViewSubmission(
                                  exam.id,
                                  exam.submission!.id,
                                )
                              }
                              variant="outline"
                              className="text-sm"
                            >
                              查看详情
                            </Button>
                          </div>
                        </div>
                      )}

                      {!exam.submission && status.text === "进行中" && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex justify-end">
                            <Button
                              onClick={() => navigate(`/exam/${exam.id}/take`)}
                              className="text-sm"
                            >
                              参加考试
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 提交详情模态框 */}
      {showSubmissionModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto w-full">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">提交详情</h2>
                <button
                  onClick={() => setShowSubmissionModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* 基本信息 */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">基本信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">总得分</p>
                    <p className="font-medium text-lg text-green-600">
                      {selectedSubmission.score} /{" "}
                      {selectedSubmission.exam?.totalScore || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">提交时间</p>
                    <p className="font-medium">
                      {formatDate(selectedSubmission.submittedAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">评分状态</p>
                    <p className="font-medium">
                      {selectedSubmission.isAutoGraded
                        ? "AI自动评分"
                        : "待人工评分"}
                    </p>
                  </div>
                </div>
              </div>

              {/* AI评分详情 */}
              {selectedSubmission.gradingDetails && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">AI评分报告</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-gray-500">AI评分总分</p>
                        <p className="font-medium text-blue-600">
                          {selectedSubmission.gradingDetails.totalScore} /{" "}
                          {selectedSubmission.gradingDetails.maxTotalScore}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">评分完整性</p>
                        <p className="font-medium">
                          {selectedSubmission.gradingDetails.isFullyAutoGraded
                            ? "完全自动评分"
                            : "部分需人工确认"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 题目详情 */}
              {selectedSubmission.gradingDetails?.details && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">题目评分详情</h3>
                  <div className="space-y-4">
                    {Object.entries(
                      selectedSubmission.gradingDetails.details,
                    ).map(([questionId, detail]: [string, any], index) => (
                      <div key={questionId} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">第 {index + 1} 题</h4>
                          <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {detail.score} / {detail.maxScore} 分
                          </span>
                        </div>

                        <div className="space-y-3 text-sm">
                          <div>
                            <p className="font-medium text-gray-700">
                              学生答案：
                            </p>
                            <div className="bg-gray-50 p-3 rounded mt-1">
                              {(() => {
                                const question =
                                  selectedSubmission.exam?.questions?.find(
                                    (q: any) => q.id === questionId,
                                  );
                                const formattedAnswer = question
                                  ? formatAnswerDisplay(
                                      detail.studentAnswer,
                                      question,
                                    )
                                  : detail.studentAnswer;
                                return formattedAnswer || "未作答";
                              })()}
                            </div>
                          </div>

                          {detail.type === "objective" && (
                            <div>
                              <p className="font-medium text-gray-700">
                                正确答案：
                              </p>
                              <div className="bg-green-50 p-3 rounded mt-1">
                                {(() => {
                                  const question =
                                    selectedSubmission.exam?.questions?.find(
                                      (q: any) => q.id === questionId,
                                    );
                                  return question
                                    ? formatAnswerDisplay(
                                        detail.correctAnswer,
                                        question,
                                      )
                                    : detail.correctAnswer;
                                })()}
                              </div>
                              <p
                                className={`mt-2 ${detail.isCorrect ? "text-green-600" : "text-red-600"}`}
                              >
                                {detail.feedback}
                              </p>
                            </div>
                          )}

                          {detail.type === "subjective" && detail.aiGrading && (
                            <div className="bg-blue-50 p-3 rounded">
                              <p className="font-medium text-blue-800">
                                AI评价：
                              </p>
                              <p className="text-blue-700 mt-1">
                                {detail.aiGrading.reasoning}
                              </p>
                              {detail.aiGrading.suggestions && (
                                <div className="mt-2">
                                  <p className="font-medium text-blue-800">
                                    改进建议：
                                  </p>
                                  <p className="text-blue-600">
                                    {detail.aiGrading.suggestions}
                                  </p>
                                </div>
                              )}
                              <div className="mt-2 text-xs text-blue-600">
                                置信度:{" "}
                                {Math.round(
                                  (detail.aiGrading.confidence || 0) * 100,
                                )}
                                %
                                {detail.needsReview && (
                                  <span className="ml-2 text-orange-600">
                                    需要人工复审
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {detail.referenceAnswer && (
                            <div>
                              <p className="font-medium text-gray-700">
                                参考答案：
                              </p>
                              <div className="bg-green-50 p-3 rounded mt-1">
                                {detail.referenceAnswer}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
