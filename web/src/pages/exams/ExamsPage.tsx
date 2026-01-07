import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button";
import { listExams, deleteExam, type Exam } from "@/services/exams";

export default function ExamsPage() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= meta.totalPages) {
      loadExams(newPage);
    }
  };

  const handleDeleteExam = async (id: string) => {
    if (!confirm("确定要删除这个考试吗？此操作不可恢复。")) return;

    try {
      await deleteExam(id);
      loadExams(page);
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(axiosError.response?.data?.message || axiosError.message || "删除失败");
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
                          handleDeleteExam(exam.id);
                        }}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
                      >
                        删除
                      </button>
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
                      <span className="font-semibold text-ink-900">状态:</span>
                      <span
                        className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${
                          exam.status === "PUBLISHED"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {exam.status === "PUBLISHED" ? "已发布" : "草稿"}
                      </span>
                    </span>
                    <span className="flex items-center gap-1 text-ink-700">
                      <span>创建于:</span>
                      <span>{new Date(exam.createdAt).toLocaleDateString("zh-CN")}</span>
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
      </div>
    </div>
  );
}
