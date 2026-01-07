import { useEffect, useState, useRef } from "react";
import { Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button";
import { listQuestions, type Question } from "@/services/questions";

const typeLabels: Record<string, string> = {
  SINGLE_CHOICE: "单选题",
  MULTIPLE_CHOICE: "多选题",
  TRUE_FALSE: "判断题",
  FILL_BLANK: "填空题",
  ESSAY: "简答题",
};

export default function QuestionsPage() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  const [filters, setFilters] = useState({
    type: "",
    difficulty: "",
    tags: "",
    search: "",
  });

  const loadQuestions = async (pageNum: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params: { page?: number; limit?: number; type?: string; difficulty?: number; tags?: string } = {
        page: pageNum,
        limit: 20,
      };
      if (filters.type) params.type = filters.type;
      if (filters.difficulty) params.difficulty = parseInt(filters.difficulty);
      if (filters.tags) params.tags = filters.tags;

      const response = await listQuestions(params);
      let filteredData = response.data;
      
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredData = response.data.filter((q) =>
          q.content.toLowerCase().includes(searchTerm),
        );
      }

      setQuestions(filteredData);
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

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      loadQuestions(1);
    }, 300);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [filters.type, filters.difficulty, filters.tags, filters.search]);

  const handleCreateQuestion = () => {
    navigate("/questions/new");
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= meta.totalPages) {
      loadQuestions(newPage);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleResetFilters = () => {
    setFilters({ type: "", difficulty: "", tags: "", search: "" });
  };

  return (
    <div className="bg-slatebg text-ink-900 antialiased min-h-screen pt-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
              题库管理
            </h1>
            <p className="mt-1 text-sm text-ink-700">
              共 {meta.total} 道题目，第 {page} / {meta.totalPages} 页
            </p>
          </div>
          <Button onClick={handleCreateQuestion}>
            <Plus className="h-4 w-4 mr-2" />
            新增题目
          </Button>
        </div>

        <div className="mb-6 rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink-900">
                搜索题干
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-700" />
                <input
                  type="text"
                  className="w-full rounded-xl border border-border bg-slate-50 pl-9 pr-3 py-2 text-sm text-ink-900"
                  placeholder="输入关键词搜索..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-ink-900">
                题型
              </label>
              <select
                className="w-full rounded-xl border border-border bg-slate-50 px-3 py-2 text-sm text-ink-900"
                value={filters.type}
                onChange={(e) => handleFilterChange("type", e.target.value)}
              >
                <option value="">全部</option>
                <option value="SINGLE_CHOICE">单选题</option>
                <option value="MULTIPLE_CHOICE">多选题</option>
                <option value="TRUE_FALSE">判断题</option>
                <option value="FILL_BLANK">填空题</option>
                <option value="ESSAY">简答题</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-ink-900">
                难度
              </label>
              <select
                className="w-full rounded-xl border border-border bg-slate-50 px-3 py-2 text-sm text-ink-900"
                value={filters.difficulty}
                onChange={(e) => handleFilterChange("difficulty", e.target.value)}
              >
                <option value="">全部</option>
                {[1, 2, 3, 4, 5].map((d) => (
                  <option key={d} value={d.toString()}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-ink-900">
                标签
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-border bg-slate-50 px-3 py-2 text-sm text-ink-900"
                placeholder="输入标签..."
                value={filters.tags}
                onChange={(e) => handleFilterChange("tags", e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={handleResetFilters}>
              重置筛选
            </Button>
          </div>
        </div>

        {loading && (
          <div className="rounded-2xl border border-border bg-white p-12 text-center">
            <p className="text-ink-700">加载中...</p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-border bg-white p-6 text-center">
            <p className="text-ink-900 mb-4">{error}</p>
            <Button onClick={() => loadQuestions(1)}>重试</Button>
          </div>
        )}

        {!loading && !error && questions.length === 0 && (
          <div className="rounded-2xl border border-border bg-white p-12 text-center">
            <p className="text-ink-700">
              {filters.search || filters.type || filters.difficulty || filters.tags
                ? "没有匹配的题目"
                : "暂无题目，点击\"新增题目\"开始创建"}
            </p>
          </div>
        )}

        {!loading && !error && questions.length > 0 && (
          <>
            <div className="grid gap-4">
              {questions.map((q) => (
                <div
                  key={q.id}
                  onClick={() => navigate(`/questions/${q.id}`)}
                  className="cursor-pointer rounded-2xl border border-border bg-white p-5 shadow-sm transition-colors hover:border-accent-600"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <h3 className="flex-1 text-base font-medium text-ink-900">
                      {q.content}
                    </h3>
                    <span className="shrink-0 rounded-lg bg-slate-50 px-2 py-1 text-xs font-semibold text-ink-700">
                      {typeLabels[q.type] || q.type}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink-700">
                    <span className="flex items-center gap-1">
                      <span className="font-semibold text-ink-900">难度:</span>
                      <span>{q.difficulty}</span>
                    </span>
                    {q.tags.length > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="font-semibold text-ink-900">标签:</span>
                        <span>{q.tags.join(', ')}</span>
                      </span>
                    )}
                    {q.knowledgePoint && (
                      <span className="flex items-center gap-1">
                        <span className="font-semibold text-ink-900">知识点:</span>
                        <span>{q.knowledgePoint}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-ink-700">
                      <span>创建于:</span>
                      <span>{new Date(q.createdAt).toLocaleDateString('zh-CN')}</span>
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
