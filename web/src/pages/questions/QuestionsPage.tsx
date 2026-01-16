import { useEffect, useState, useRef } from "react";
import { Plus, Search, Trash2, Image } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "@/components/ui/Button";
import {
  listQuestions,
  deleteQuestions,
  batchUpdateTags,
  type Question,
} from "@/services/questions";
import { getCurrentUser } from "@/utils/auth";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import "katex/dist/katex.min.css"; // KaTeX CSS

const typeLabels: Record<string, string> = {
  SINGLE_CHOICE: "单选题",
  MULTIPLE_CHOICE: "多选题",
  TRUE_FALSE: "判断题",
  FILL_BLANK: "填空题",
  ESSAY: "简答题",
};

export default function QuestionsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Image modal state
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  // Batch update tags modal state
  const [showBatchUpdateTagsModal, setShowBatchUpdateTagsModal] =
    useState(false);
  const [batchUpdateTagsInput, setBatchUpdateTagsInput] = useState("");

  const [filters, setFilters] = useState({
    type: "",
    difficulty: "",
    tags: "",
    search: "",
  });

  // Get specific question IDs from URL params
  const specificIds =
    searchParams.get("ids")?.split(",").filter(Boolean) || null;

  const loadQuestions = async (pageNum: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params: {
        page?: number;
        limit?: number;
        type?: string;
        difficulty?: number;
        tags?: string;
        ids?: string;
      } = {
        page: pageNum,
        limit: pageSize,
      };

      // If specific IDs are provided, use them
      if (specificIds && specificIds.length > 0) {
        params.ids = specificIds.join(",");
      } else {
        // Otherwise use normal filters
        if (filters.type) params.type = filters.type;
        if (filters.difficulty)
          params.difficulty = parseInt(filters.difficulty);
        if (filters.tags) params.tags = filters.tags;
      }

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
      // Clear selection when loading new data
      setSelectedIds(new Set());
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

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.size === questions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(questions.map((q) => q.id)));
    }
  };

  const handleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;

    const confirmMsg = `确定要删除选中的 ${selectedIds.size} 道题目吗？此操作不可撤销。`;
    if (!window.confirm(confirmMsg)) return;

    setDeleting(true);
    try {
      await deleteQuestions(Array.from(selectedIds));
      // Reload current page
      await loadQuestions(page);
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(
        axiosError.response?.data?.message || axiosError.message || "删除失败",
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleClearQuestionBank = async () => {
    if (!confirm("确定要清空整个题库吗？此操作不可撤销！")) return;
    if (!confirm("再次确认：这将删除所有题目，确定继续吗？")) return;

    const token = localStorage.getItem("token");
    const currentUser = getCurrentUser();
    if (!token || !currentUser) {
      setError("请先登录");
      return;
    }

    if (currentUser.role !== "ADMIN") {
      setError("只有系统管理员可以清空题库");
      return;
    }

    try {
      // 获取当前用户信息以验证权限
      const userResponse = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!userResponse.ok) {
        setError("获取用户信息失败");
        return;
      }

      const userData = await userResponse.json();
      if (userData.role !== "ADMIN") {
        setError("只有系统管理员可以清空题库");
        return;
      }
    } catch (error) {
      setError("验证权限失败");
      return;
    }

    setClearing(true);
    try {
      // 调用新的清空题库API端点
      const response = await fetch("/api/questions/clear-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "清空题库失败");
      }

      // 重新加载题目列表（应该为空）
      loadQuestions(1);
      setSelectedIds(new Set());
      setError("题库已清空");
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || "清空题库失败");
    } finally {
      setClearing(false);
    }
  };

  const handleBatchUpdateTags = async () => {
    if (selectedIds.size === 0) return;

    // 解析标签，支持逗号或空格分隔
    const tags = batchUpdateTagsInput
      .split(/[,\s]+/)
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    if (tags.length === 0) {
      alert("请输入至少一个标签");
      return;
    }

    const confirmMsg = `确定要为选中的 ${selectedIds.size} 遾题目设置标签吗？这将替换原有标签。`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const result = await batchUpdateTags(Array.from(selectedIds), tags);
      alert(`成功为 ${result.updated} 遾题目更新了标签`);
      setShowBatchUpdateTagsModal(false);
      setBatchUpdateTagsInput("");
      // 重新加载当前页面
      await loadQuestions(page);
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(
        axiosError.response?.data?.message ||
          axiosError.message ||
          "批量更新标签失败",
      );
    }
  };

  const showImages = (images: string[], e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImages(images);
    setShowImageModal(true);
  };

  const isAllSelected =
    questions.length > 0 && selectedIds.size === questions.length;
  const isPartialSelected =
    selectedIds.size > 0 && selectedIds.size < questions.length;

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
              {selectedIds.size > 0 && (
                <span className="ml-2 text-accent-600">
                  (已选 {selectedIds.size} 道)
                </span>
              )}
            </p>
            {specificIds && specificIds.length > 0 && (
              <div className="mt-2 rounded-xl bg-accent-50 border border-accent-200 px-3 py-2">
                <p className="text-sm text-accent-800">
                  正在查看刚刚导入的 {specificIds.length} 道题目
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowBatchUpdateTagsModal(true)}
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                  批量设置标签 ({selectedIds.size})
                </Button>
                <Button
                  variant="outline"
                  onClick={handleBatchDelete}
                  disabled={deleting}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleting ? "删除中..." : `删除 (${selectedIds.size})`}
                </Button>
              </>
            )}
            <Button onClick={handleCreateQuestion}>
              <Plus className="h-4 w-4 mr-2" />
              新增题目
            </Button>
            <Button
              onClick={handleClearQuestionBank}
              disabled={clearing}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <span className="mr-2">🗑️</span>
              {clearing ? "清空中..." : "清空题库"}
            </Button>
          </div>
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
                onChange={(e) =>
                  handleFilterChange("difficulty", e.target.value)
                }
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
              {filters.search ||
              filters.type ||
              filters.difficulty ||
              filters.tags
                ? "没有匹配的题目"
                : '暂无题目，点击"新增题目"开始创建'}
            </p>
          </div>
        )}

        {!loading && !error && questions.length > 0 && (
          <>
            {/* Select all header */}
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-white px-5 py-3">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isPartialSelected;
                }}
                onChange={handleSelectAll}
                className="h-4 w-4 rounded border-border text-accent-600 focus:ring-accent-500"
              />
              <span className="text-sm text-ink-700">
                {isAllSelected
                  ? "取消全选"
                  : isPartialSelected
                    ? `已选 ${selectedIds.size} 道`
                    : "全选当前页"}
              </span>
            </div>

            <div className="grid gap-4">
              {questions.map((q) => (
                <div
                  key={q.id}
                  onClick={() => navigate(`/questions/${q.id}`)}
                  className={`cursor-pointer rounded-2xl border bg-white p-5 shadow-sm transition-colors ${
                    selectedIds.has(q.id)
                      ? "border-accent-600 bg-accent-50"
                      : "border-border hover:border-accent-600"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(q.id)}
                        onClick={(e) => handleSelectOne(q.id, e)}
                        onChange={() => {}}
                        className="mt-1 h-4 w-4 rounded border-border text-accent-600 focus:ring-accent-500"
                      />
                      <div className="flex-1 text-base font-medium text-ink-900">
                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[
                            [
                              rehypeKatex,
                              {
                                // 配置KaTeX选项
                                throwOnError: false,
                                trust: false,
                                strict: false,
                              },
                            ],
                            rehypeHighlight,
                          ]}
                          components={{
                            p: ({ node, ...props }) => (
                              <p className="my-2" {...props} />
                            ),
                            h1: ({ node, ...props }) => (
                              <h1
                                className="text-xl font-bold mt-4 mb-2"
                                {...props}
                              />
                            ),
                            h2: ({ node, ...props }) => (
                              <h2
                                className="text-lg font-bold mt-3 mb-2"
                                {...props}
                              />
                            ),
                            h3: ({ node, ...props }) => (
                              <h3
                                className="text-base font-bold mt-2 mb-1"
                                {...props}
                              />
                            ),
                            code: ({ node, className, ...props }) => {
                              const isBlock = Boolean(className);
                              if (!isBlock) {
                                return (
                                  <code
                                    className="bg-gray-100 px-1 py-0.5 rounded text-sm"
                                    {...props}
                                  />
                                );
                              }
                              return (
                                <code
                                  className="block bg-gray-100 p-3 rounded text-sm overflow-x-auto"
                                  {...props}
                                />
                              );
                            },
                            pre: ({ node, ...props }) => (
                              <pre
                                className="bg-gray-100 p-3 rounded my-2 overflow-x-auto"
                                {...props}
                              />
                            ),
                            strong: ({ node, ...props }) => (
                              <strong className="font-semibold" {...props} />
                            ),
                            em: ({ node, ...props }) => (
                              <em className="italic" {...props} />
                            ),
                            ul: ({ node, ...props }) => (
                              <ul
                                className="list-disc list-inside ml-4 my-2"
                                {...props}
                              />
                            ),
                            ol: ({ node, ...props }) => (
                              <ol
                                className="list-decimal list-inside ml-4 my-2"
                                {...props}
                              />
                            ),
                            li: ({ node, ...props }) => (
                              <li className="my-1" {...props} />
                            ),
                            blockquote: ({ node, ...props }) => (
                              <blockquote
                                className="border-l-4 border-gray-300 pl-4 italic text-gray-600"
                                {...props}
                              />
                            ),
                            div: ({ node, ...props }) => {
                              // 特殊处理数学公式容器
                              if (props.className?.includes("math")) {
                                return <div className="my-2" {...props} />;
                              }
                              return <div {...props} />;
                            },
                            span: ({ node, ...props }) => {
                              // 特殊处理数学公式元素
                              if (props.className?.includes("math")) {
                                return (
                                  <span className="align-middle" {...props} />
                                );
                              }
                              return <span {...props} />;
                            },
                          }}
                        >
                          {q.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-lg bg-slate-50 px-2 py-1 text-xs font-semibold text-ink-700">
                      {typeLabels[q.type] || q.type}
                    </span>
                  </div>
                  <div className="ml-7 flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink-700">
                    <span className="flex items-center gap-1">
                      <span className="font-semibold text-ink-900">难度:</span>
                      <span>{q.difficulty}</span>
                    </span>
                    {q.tags.length > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="font-semibold text-ink-900">
                          标签:
                        </span>
                        <span>{q.tags.join(", ")}</span>
                      </span>
                    )}
                    {q.knowledgePoint && (
                      <span className="flex items-center gap-1">
                        <span className="font-semibold text-ink-900">
                          知识点:
                        </span>
                        <span>{q.knowledgePoint}</span>
                      </span>
                    )}
                    {q.images && q.images.length > 0 && (
                      <span
                        className="flex items-center gap-1 cursor-pointer text-blue-600 hover:text-blue-700"
                        onClick={(e) => showImages(q.images!, e)}
                      >
                        <Image className="h-4 w-4" />
                        <span className="font-semibold">
                          示意图 ({q.images.length})
                        </span>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <span className="font-semibold text-ink-900">
                        可见性:
                      </span>
                      <span
                        className={
                          q.isPublic ? "text-green-600" : "text-orange-600"
                        }
                      >
                        {q.isPublic ? "公开" : "私有"}
                      </span>
                    </span>
                    {q.creator && (
                      <span className="flex items-center gap-1">
                        <span className="font-semibold text-ink-900">
                          创建者:
                        </span>
                        <span>{q.creator.name}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-ink-700">
                      <span>创建于:</span>
                      <span>
                        {new Date(q.createdAt).toLocaleDateString("zh-CN")}
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {meta.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-1 flex-wrap">
                {/* 页码导航 */}
                <div className="flex items-center gap-1">
                  {(() => {
                    const pages = [];
                    const totalPages = meta.totalPages;
                    const currentPage = page;

                    // 如果总页数小于等于10，显示所有页码
                    if (totalPages <= 10) {
                      for (let i = 1; i <= totalPages; i++) {
                        pages.push(
                          <Button
                            key={i}
                            onClick={() => handlePageChange(i)}
                            variant={currentPage === i ? "default" : "outline"}
                            className={
                              currentPage === i
                                ? "bg-accent-600 border-accent-600"
                                : ""
                            }
                          >
                            {i}
                          </Button>,
                        );
                      }
                    } else {
                      // 总页数大于10，显示前3页，后3页，当前页周围页码，以及省略号

                      // 始终显示第一页
                      pages.push(
                        <Button
                          key={1}
                          onClick={() => handlePageChange(1)}
                          variant={currentPage === 1 ? "default" : "outline"}
                          className={
                            currentPage === 1
                              ? "bg-accent-600 border-accent-600"
                              : ""
                          }
                        >
                          1
                        </Button>,
                      );

                      // 计算需要显示的页码范围
                      let startPage = Math.max(2, currentPage - 1);
                      let endPage = Math.min(totalPages - 1, currentPage + 1);

                      // 如果当前页靠近开头，扩展结束页
                      if (currentPage <= 4) {
                        endPage = Math.min(totalPages - 1, 7); // 显示前7页
                      }

                      // 如果当前页靠近结尾，扩展开始页
                      if (currentPage >= totalPages - 3) {
                        startPage = Math.max(2, totalPages - 6); // 显示后7页
                      }

                      // 显示省略号（如果需要）
                      if (startPage > 2) {
                        pages.push(
                          <span
                            key="start-ellipsis"
                            className="px-2 text-ink-700"
                          >
                            ...
                          </span>,
                        );
                      }

                      // 显示中间页码
                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <Button
                            key={i}
                            onClick={() => handlePageChange(i)}
                            variant={currentPage === i ? "default" : "outline"}
                            className={
                              currentPage === i
                                ? "bg-accent-600 border-accent-600"
                                : ""
                            }
                          >
                            {i}
                          </Button>,
                        );
                      }

                      // 显示省略号（如果需要）
                      if (endPage < totalPages - 1) {
                        pages.push(
                          <span
                            key="end-ellipsis"
                            className="px-2 text-ink-700"
                          >
                            ...
                          </span>,
                        );
                      }

                      // 始终显示最后一页
                      pages.push(
                        <Button
                          key={totalPages}
                          onClick={() => handlePageChange(totalPages)}
                          variant={
                            currentPage === totalPages ? "default" : "outline"
                          }
                          className={
                            currentPage === totalPages
                              ? "bg-accent-600 border-accent-600"
                              : ""
                          }
                        >
                          {totalPages}
                        </Button>,
                      );
                    }

                    return pages;
                  })()}
                </div>
                <div className="ml-4 text-sm text-ink-700">
                  第 {page} / {meta.totalPages} 页
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="max-w-4xl max-h-[90vh] bg-white rounded-2xl p-6 overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-ink-900">题目示意图</h3>
              <button
                onClick={() => setShowImageModal(false)}
                className="text-ink-700 hover:text-ink-900 text-xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="grid gap-4">
              {selectedImages.map((imagePath, index) => (
                <div key={index} className="text-center">
                  <img
                    src={
                      imagePath.startsWith("data:")
                        ? imagePath
                        : `http://localhost:3000/${imagePath}`
                    }
                    alt={`示意图 ${index + 1}`}
                    className="max-w-full h-auto rounded-xl border border-border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7lm77niYfml6Dms5XliqDovb08L3RleHQ+PC9zdmc+";
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 批量设置标签模态框 */}
      {showBatchUpdateTagsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-ink-900">
                批量设置标签
              </h3>
              <button
                onClick={() => {
                  setShowBatchUpdateTagsModal(false);
                  setBatchUpdateTagsInput("");
                }}
                className="text-ink-500 hover:text-ink-700"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-ink-900 mb-2">
                  选中的题目数量
                </label>
                <div className="rounded-xl border border-border bg-slate-50 p-3 text-sm">
                  {selectedIds.size} 遾题目
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink-900 mb-2">
                  输入新标签 (用逗号或空格分隔)
                </label>
                <input
                  type="text"
                  value={batchUpdateTagsInput}
                  onChange={(e) => setBatchUpdateTagsInput(e.target.value)}
                  placeholder="例如：数学,代数,方程"
                  className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900 placeholder-ink-500 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                />
              </div>

              <div className="rounded-xl border border-border bg-blue-50 p-3 text-sm">
                <p className="text-blue-800">
                  注意：这将替换所选题目的所有现有标签
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowBatchUpdateTagsModal(false);
                  setBatchUpdateTagsInput("");
                }}
                className="inline-flex items-center justify-center rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-ink-900 shadow-sm transition-colors hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={handleBatchUpdateTags}
                className="inline-flex items-center justify-center rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-700"
              >
                确认设置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
