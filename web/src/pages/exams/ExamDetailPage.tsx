import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit2, Trash2, Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import { getExamById, deleteExam, type Exam } from "@/services/exams";
import { listQuestions, type Question } from "@/services/questions";

export default function ExamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const loadExam = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getExamById(id);
      setExam(data);
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(
        axiosError.response?.data?.message || axiosError.message || "加载失败",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExam();
  }, [id]);

  const loadQuestionBank = async () => {
    setQuestionsLoading(true);
    try {
      const response = await listQuestions({ page: 1, limit: 100 });
      setQuestions(response.data);
    } catch (err: unknown) {
      console.error("加载题库失败:", err);
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleToggleQuestionBank = () => {
    if (!showQuestionBank) {
      loadQuestionBank();
    }
    setShowQuestionBank((prev) => !prev);
  };

  const handleDeleteExam = async () => {
    if (!confirm("确定要删除这个考试吗？此操作不可恢复。")) return;

    try {
      await deleteExam(id!);
      navigate("/exams");
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(
        axiosError.response?.data?.message || axiosError.message || "删除失败",
      );
    }
  };

  const handleAddQuestion = (questionId: string) => {
    if (selectedQuestions.includes(questionId)) {
      setSelectedQuestions((prev) => prev.filter((id) => id !== questionId));
    } else {
      setSelectedQuestions((prev) => [...prev, questionId]);
    }
  };

  const filteredQuestions = searchTerm
    ? questions.filter((q) =>
        q.content.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : questions;

  const questionInExamIds = exam?.questions?.map((eq) => eq.questionId) || [];

  if (loading) {
    return (
      <div className="bg-slatebg text-ink-900 antialiased min-h-screen pt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-white p-12 text-center">
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
            <p className="text-ink-900 mb-4">{error}</p>
            <Button onClick={() => navigate("/exams")}>返回</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="bg-slatebg text-ink-900 antialiased min-h-screen pt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-white p-12 text-center">
            <p className="text-ink-700">考试不存在</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slatebg text-ink-900 antialiased min-h-screen pt-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/exams")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
              考试详情
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/exams/${id}/edit`)}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              编辑
            </Button>
            <button
              onClick={handleDeleteExam}
              className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              删除
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-border bg-white p-4 text-center">
            <p className="text-ink-900">{error}</p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-border bg-white p-6 shadow-soft">
            <h2 className="mb-4 text-lg font-semibold text-ink-900">
              考试信息
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-ink-700">
                  考试标题
                </label>
                <p className="text-base text-ink-900">{exam.title}</p>
              </div>

              {exam.description && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink-700">
                    考试描述
                  </label>
                  <p className="text-base text-ink-900">{exam.description}</p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink-700">
                    考试时长
                  </label>
                  <p className="text-base text-ink-900">{exam.duration} 分钟</p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink-700">
                    总分
                  </label>
                  <p className="text-base text-ink-900">{exam.totalScore}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink-700">
                    状态
                  </label>
                  <span
                    className={`rounded-lg px-3 py-1 text-sm font-semibold ${
                      exam.status === "PUBLISHED"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {exam.status === "PUBLISHED" ? "已发布" : "草稿"}
                  </span>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink-700">
                    创建时间
                  </label>
                  <p className="text-base text-ink-900">
                    {new Date(exam.createdAt).toLocaleString("zh-CN")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-white p-6 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink-900">
                考试题目 ({exam.questions?.length || 0} 题)
              </h2>
              <Button
                onClick={handleToggleQuestionBank}
                className="inline-flex items-center gap-2"
                variant="outline"
              >
                <Plus className="h-4 w-4" />
                {showQuestionBank ? "收起题库" : "从题库添加"}
              </Button>
            </div>

            {exam.questions && exam.questions.length > 0 ? (
              <div className="space-y-3">
                {exam.questions
                  .sort((a, b) => a.order - b.order)
                  .map((examQuestion) => (
                    <div
                      key={examQuestion.id}
                      className="rounded-2xl border border-border bg-slate-50 p-4"
                    >
                      <div className="mb-3 flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-base font-medium text-ink-900">
                            {examQuestion.question.content}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm("确定要从考试中移除这道题目吗？")) {
                              // TODO: 实现移除功能
                              alert("移除功能开发中");
                              // await removeQuestionFromExam(exam.id, examQuestion.questionId);
                              // loadExam();
                              // setSelectedQuestions((prev) => prev.filter((id) => id !== examQuestion.questionId));
                            }
                          }}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
                        >
                          移除
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink-700">
                        <span className="flex items-center gap-1">
                          <span className="font-semibold text-ink-900">
                            分值:
                          </span>
                          <span>{examQuestion.score}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="font-semibold text-ink-900">
                            难度:
                          </span>
                          <span>{examQuestion.question.difficulty}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="font-semibold text-ink-900">
                            题型:
                          </span>
                          <span>{examQuestion.question.type}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="font-semibold text-ink-900">
                            顺序:
                          </span>
                          <span>{examQuestion.order}</span>
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-slate-50 p-8 text-center">
                <p className="text-ink-700">
                  暂无题目，点击右上角"从题库添加"开始添加题目
                </p>
              </div>
            )}

            {showQuestionBank && (
              <div className="mt-4 border-t border-border pt-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-ink-900">
                    题库列表
                  </h3>
                  <input
                    type="text"
                    className="w-64 rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900"
                    placeholder="搜索题目..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {questionsLoading ? (
                  <div className="rounded-2xl border border-border bg-white p-6 text-center">
                    <p className="text-ink-700">加载题库中...</p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {filteredQuestions.map((question) => {
                      const isInExam = questionInExamIds.includes(question.id);
                      const isSelected = selectedQuestions.includes(
                        question.id,
                      );

                      return (
                        <div
                          key={question.id}
                          onClick={() => handleAddQuestion(question.id)}
                          className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                            isInExam
                              ? "border-green-300 bg-green-50 opacity-50 cursor-not-allowed"
                              : isSelected
                                ? "border-accent-600 bg-accent-50"
                                : "border-border bg-white hover:border-accent-600"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-ink-900 line-clamp-2">
                                {question.content}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-700">
                                <span className="text-ink-700">
                                  {question.type}
                                </span>
                                {question.tags.length > 0 && (
                                  <span className="text-ink-700">
                                    标签: {question.tags.join(", ")}
                                  </span>
                                )}
                                <span className="text-ink-700">
                                  难度: {question.difficulty}
                                </span>
                              </div>
                            </div>
                            <span className="text-xs">
                              {isInExam && "已添加"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
