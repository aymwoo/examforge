import { useEffect, useState } from "react";
import { Plus, Copy, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { listExams, deleteExam, copyExam } from "@/services/exams";
import type { Exam } from "@/services/exams";
import { getCurrentUser } from "@/utils/auth";

export default function ExamsPage() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  const loadExams = async (pageNum: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await listExams({ page: pageNum, limit: 20 });
      setExams(response.data);
      setMeta(response.meta);
      setPage(pageNum);
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
    loadExams(1);
  }, []);

  const handleCreateExam = () => {
    navigate("/exams/new");
  };

  const handleDeleteExam = async () => {
    if (!selectedExam) return;
    try {
      await deleteExam(selectedExam.id);
      setShowDeleteModal(false);
      setSelectedExam(null);
      loadExams(page);
    } catch (err: any) {
      alert(err.response?.data?.message || "删除失败");
    }
  };

  const handleCopyExam = async (exam: Exam) => {
    try {
      await copyExam(exam.id);
      alert("考试复制成功！");
      loadExams(page);
    } catch (err: any) {
      alert(err.response?.data?.message || "复制失败");
    }
  };

  const canDeleteExam = (exam: Exam) => {
    // API 返回可能没有 createdBy，优先使用 creator.id
    return (
      currentUser?.role === "ADMIN" || exam.creator?.id === currentUser?.id
    );
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= meta.totalPages) {
      loadExams(newPage);
    }
  };

  return (
    <div className="bg-slatebg text-ink-900 antialiased min-h-screen pt-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
              考试管理
            </h1>
            <p className="mt-1 text-sm text-ink-700">
              共 {meta.total} 个考试，第 {page} / {meta.totalPages} 页
            </p>
          </div>
          <Button onClick={handleCreateExam}>
            <Plus className="h-4 w-4 mr-2" />
            新增考试
          </Button>
        </div>

        {loading && (
          <div className="rounded-2xl border border-border bg-white p-12 text-center">
            <p className="text-ink-700">加载中...</p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-border bg-white p-6 text-center">
            <p className="text-ink-900 mb-4">{error}</p>
            <Button onClick={() => loadExams(1)}>重试</Button>
          </div>
        )}

        {!loading && !error && exams.length === 0 && (
          <div className="rounded-2xl border border-border bg-white p-12 text-center">
            <p className="text-ink-700">暂无考试，点击"新增考试"开始创建</p>
          </div>
        )}

        {!loading && !error && exams.length > 0 && (
          <>
            <div className="grid gap-4">
              {exams.map((exam) => (
                <div
                  key={exam.id}
                  onClick={() => navigate(`/exams/${exam.id}`)}
                  className="cursor-pointer rounded-2xl border border-border bg-white p-5 shadow-sm transition-colors hover:border-accent-600"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-base font-medium text-ink-900 mb-2">
                        {exam.title}
                      </h3>
                      {exam.description && (
                        <p className="text-sm text-ink-700 line-clamp-2">
                          {exam.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyExam(exam);
                        }}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 flex items-center gap-1"
                        title="复制考试"
                      >
                        <Copy className="h-3 w-3" />
                        复制
                      </button>
                      {canDeleteExam(exam) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedExam(exam);
                            setShowDeleteModal(true);
                          }}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 flex items-center gap-1"
                          title="删除考试"
                        >
                          <Trash2 className="h-3 w-3" />
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-700">
                    <span className="flex items-center gap-1">
                      <span className="font-semibold text-ink-900">时长:</span>
                      <span>{exam.duration} 分钟</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="font-semibold text-ink-900">总分:</span>
                      <span>{exam.totalScore}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="font-semibold text-ink-900">
                        题目数:
                      </span>
                      <span>{exam.examQuestions?.length ?? 0}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="font-semibold text-ink-900">
                        学生数:
                      </span>
                      <span>{exam.totalStudents ?? 0}</span>
                    </span>

                    <span className="flex items-center gap-1">
                      <span className="font-semibold text-ink-900">状态:</span>
                      <span
                        className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${
                          exam.status === "PUBLISHED"
                            ? "bg-green-100 text-green-800"
                            : exam.status === "ARCHIVED"
                              ? "bg-gray-100 text-gray-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {exam.status === "PUBLISHED"
                          ? "已发布"
                          : exam.status === "ARCHIVED"
                            ? "已归档"
                            : "草稿"}
                      </span>
                    </span>
                    <span className="flex items-center gap-1 text-ink-700">
                      <span>创建者:</span>
                      <span>
                        {exam.creator?.name || exam.creator?.username || "未知"}
                      </span>
                    </span>
                    <span className="flex items-center gap-1 text-ink-700">
                      <span>创建于:</span>
                      <span>
                        {new Date(exam.createdAt).toLocaleDateString("zh-CN")}
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {meta.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-4">
                <Button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  variant="outline"
                >
                  上一页
                </Button>
                <span className="text-sm text-ink-700">
                  第 {page} / {meta.totalPages} 页
                </span>
                <Button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === meta.totalPages}
                  variant="outline"
                >
                  下一页
                </Button>
              </div>
            )}
          </>
        )}

        {/* 删除确认模态框 */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedExam(null);
          }}
          title="删除考试"
          onConfirm={handleDeleteExam}
          confirmText="删除"
          confirmVariant="danger"
        >
          <p>确定要删除考试 "{selectedExam?.title}" 吗？</p>
          <p className="text-red-600 text-sm mt-2">
            此操作将删除考试及其所有相关数据，且不可撤销。
          </p>
        </Modal>
      </div>
    </div>
  );
}
