import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Download } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import api from "@/services/api";
import { downloadJson, downloadExcel } from "@/utils/exportUtils";

interface ImportRecord {
  id: string;
  jobId: string;
  fileName: string;
  fileSize: number;
  mode: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  questionCount: number;
  canCreateExam: boolean;
  errorMessage?: string;
}

export default function ImportHistoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { success: showSuccess, error: showError } = useToast();
  const [records, setRecords] = useState<ImportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [createExamDialog, setCreateExamDialog] = useState<string | null>(null);
  const [examTitle, setExamTitle] = useState("");
  const [examDuration, setExamDuration] = useState(60);
  const [creating, setCreating] = useState(false);
  const [createProgress, setCreateProgress] = useState(0);

  // 导出状态
  const [exportingJobId, setExportingJobId] = useState<string | null>(null);

  // 详情模态框状态
  const [detailDialog, setDetailDialog] = useState<string | null>(null);
  const [detailQuestions, setDetailQuestions] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailPage, setDetailPage] = useState(1);
  const [detailPageSize] = useState(10); // 每页显示10个题目
  const [detailTotal, setDetailTotal] = useState(0);

  const targetJobId = new URLSearchParams(location.search).get("jobId");
  const [autoOpened, setAutoOpened] = useState(false);

  useEffect(() => {
    fetchImportHistory();
  }, []);

  useEffect(() => {
    if (!loading && targetJobId && records.length > 0 && !autoOpened) {
      // Just set the dialog open, let the detailDialog effect trigger the fetch
      setDetailDialog(targetJobId);
      setAutoOpened(true);
    }
  }, [autoOpened, loading, records.length, targetJobId]);

  // When dialog or page changes, fetch data
  useEffect(() => {
    if (detailDialog) {
      fetchImportDetails(detailDialog, detailPage);
    }
  }, [detailDialog, detailPage]);

  const fetchImportHistory = async () => {
    try {
      const response = await api.get("/api/import/history");
      setRecords(response.data);
    } catch (error) {
      showError("获取导入历史失败");
    } finally {
      setLoading(false);
    }
  };

  const createExamFromRecord = async (jobId: string) => {
    if (!examTitle.trim()) {
      showError("请输入考试标题");
      return;
    }

    setCreating(true);
    setCreateProgress(20);
    try {
      const response = await api.post(
        `/api/import/history/${jobId}/create-exam`,
        {
          examTitle: examTitle.trim(),
          duration: examDuration,
        },
      );

      setCreateProgress(70);
      setCreateProgress(100);
      showSuccess(`考试创建成功！包含 ${response.data.questionCount} 道题目`);
      setCreateExamDialog(null);
      setExamTitle("");
      setExamDuration(60);
      navigate(`/exams/${response.data.examId}`);
    } catch (error) {
      showError("创建考试失败");
    } finally {
      setCreating(false);
      setCreateProgress(0);
    }
  };

  const viewImportDetails = (jobId: string) => {
    setDetailDialog(jobId);
    setDetailPage(1); // Reset to first page when opening new dialog
    // The useEffect will trigger the fetch
  };

  // 获取批次的所有题目用于导出
  const fetchAllBatchQuestions = async (jobId: string) => {
    const allQuestions: any[] = [];
    let currentPage = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await api.get(`/api/import/history/${jobId}/questions`, {
        params: {
          page: currentPage,
          limit: 100, // 每次获取100条
        },
      });
      allQuestions.push(...(response.data.data || []));
      const total = response.data.total || 0;
      hasMore = allQuestions.length < total;
      currentPage += 1;
    }

    return allQuestions;
  };

  // 导出批次题目为 JSON
  const handleExportBatchJson = async (record: ImportRecord) => {
    if (record.questionCount === 0) {
      showError("该批次没有题目可导出");
      return;
    }

    setExportingJobId(record.jobId);
    try {
      const questions = await fetchAllBatchQuestions(record.jobId);
      const exportData = questions.map((q) => ({
        content: q.content,
        type: q.type,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation,
        difficulty: q.difficulty,
        tags: q.tags,
        knowledgePoint: q.knowledgePoint,
        matching: q.matching,
      }));
      // 生成简洁的文件名
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
      const filename = `questions_export_${dateStr}_${timeStr}`;
      downloadJson(exportData, filename);
      showSuccess(`成功导出 ${questions.length} 道题目`);
      console.log(`JSON文件已导出: ${filename}.json`);
    } catch (error) {
      console.error("导出失败:", error);
      showError("导出失败");
    } finally {
      setExportingJobId(null);
    }
  };

  // 导出批次题目为 Excel
  const handleExportBatchExcel = async (record: ImportRecord) => {
    if (record.questionCount === 0) {
      showError("该批次没有题目可导出");
      return;
    }

    setExportingJobId(record.jobId);
    try {
      const questions = await fetchAllBatchQuestions(record.jobId);
      const typeLabels: Record<string, string> = {
        SINGLE_CHOICE: "单选题",
        MULTIPLE_CHOICE: "多选题",
        TRUE_FALSE: "判断题",
        FILL_BLANK: "填空题",
        MATCHING: "连线题",
        ESSAY: "简答题",
      };
      const rows = questions.map((q) => ({
        题干: q.content,
        题型: typeLabels[q.type] || q.type,
        选项: Array.isArray(q.options)
          ? q.options.map((opt: any) => `${opt.label}.${opt.content}`).join(" ")
          : q.options || "",
        答案: Array.isArray(q.answer) ? q.answer.join(", ") : q.answer || "",
        解析: q.explanation || "",
        标签: Array.isArray(q.tags) ? q.tags.join(", ") : q.tags || "",
        难度: q.difficulty,
        知识点: q.knowledgePoint || "",
      }));
      // 生成简洁的文件名
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
      const filename = `questions_export_${dateStr}_${timeStr}`;
      downloadExcel(rows, filename, "题目");
      showSuccess(`成功导出 ${questions.length} 道题目`);
      console.log(`Excel文件已导出: ${filename}.xlsx`);
    } catch (error) {
      console.error("导出失败:", error);
      showError("导出失败");
    } finally {
      setExportingJobId(null);
    }
  };

  const fetchImportDetails = async (jobId: string, page: number) => {
    setDetailLoading(true);

    try {
      const response = await api.get(`/api/import/history/${jobId}/questions`, {
        params: {
          page,
          limit: detailPageSize,
        },
      });
      setDetailQuestions(response.data.data || []);
      setDetailTotal(response.data.total || 0);
    } catch (error) {
      console.error("获取题目详情失败:", error);
      setDetailQuestions([]);
      setDetailTotal(0);
      showError("获取题目详情失败");
    } finally {
      setDetailLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; className: string }> = {
      completed: { text: "已完成", className: "bg-green-100 text-green-800" },
      processing: {
        text: "处理中",
        className: "bg-yellow-100 text-yellow-800",
      },
      failed: { text: "失败", className: "bg-red-100 text-red-800" },
    };

    const config = statusMap[status] || {
      text: status,
      className: "bg-gray-100 text-gray-800",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}
      >
        {config.text}
      </span>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN");
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">加载中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">导入历史</h1>
        <p className="text-gray-600">
          查看所有导入记录，并可以基于导入记录创建考试
        </p>
      </div>

      <div className="space-y-4">
        {records.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
            暂无导入记录
          </div>
        ) : (
          records.map((record) => (
            <div key={record.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{record.fileName}</h3>
                {getStatusBadge(record.status)}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-500">文件大小</div>
                  <div>{formatFileSize(record.fileSize)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">导入模式</div>
                  <div>{record.mode}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">题目数量</div>
                  <div>{record.questionCount} 道</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">导入时间</div>
                  <div>{formatDate(record.createdAt)}</div>
                </div>
              </div>

              {record.errorMessage && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                  <div className="text-sm text-red-600 font-medium">
                    错误信息
                  </div>
                  <div className="text-red-700">{record.errorMessage}</div>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                {record.canCreateExam && (
                  <button
                    onClick={() => setCreateExamDialog(record.jobId)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    创建考试
                  </button>
                )}

                <button
                  onClick={() => viewImportDetails(record.jobId)}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  查看详情
                </button>

                {/* 导出按钮 */}
                {record.questionCount > 0 && (
                  <>
                    <button
                      onClick={() => handleExportBatchJson(record)}
                      disabled={exportingJobId === record.jobId}
                      className="px-4 py-2 border border-green-300 text-green-600 rounded hover:bg-green-50 flex items-center gap-1 disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" />
                      {exportingJobId === record.jobId
                        ? "导出中..."
                        : "导出 JSON"}
                    </button>
                    <button
                      onClick={() => handleExportBatchExcel(record)}
                      disabled={exportingJobId === record.jobId}
                      className="px-4 py-2 border border-green-300 text-green-600 rounded hover:bg-green-50 flex items-center gap-1 disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" />
                      {exportingJobId === record.jobId
                        ? "导出中..."
                        : "导出 Excel"}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 创建考试对话框 */}
      {createExamDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">基于导入记录创建考试</h2>

            {creating && (
              <div className="mb-4">
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${createProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">正在创建考试...</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">文件名</label>
                <div className="text-sm text-gray-600">
                  {records.find((r) => r.jobId === createExamDialog)?.fileName}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  题目数量
                </label>
                <div className="text-sm text-gray-600">
                  {
                    records.find((r) => r.jobId === createExamDialog)
                      ?.questionCount
                  }{" "}
                  道题目
                </div>
              </div>

              <div>
                <label
                  htmlFor="examTitle"
                  className="block text-sm font-medium mb-1"
                >
                  考试标题 *
                </label>
                <input
                  id="examTitle"
                  type="text"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder="请输入考试标题"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="examDuration"
                  className="block text-sm font-medium mb-1"
                >
                  考试时长（分钟）
                </label>
                <input
                  id="examDuration"
                  type="number"
                  value={examDuration}
                  onChange={(e) => setExamDuration(Number(e.target.value))}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setCreateExamDialog(null)}
                  disabled={creating}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={() => createExamFromRecord(createExamDialog)}
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? "创建中..." : "创建考试"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 详情模态框 */}
      {detailDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">导入详情</h2>
                <button
                  onClick={() => setDetailDialog(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {detailLoading ? (
                <div className="flex justify-center items-center h-64">
                  <p>加载中...</p>
                </div>
              ) : detailQuestions.length === 0 ? (
                <div className="flex justify-center items-center h-64">
                  <p className="text-gray-500">暂无题目数据</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 计算当前页的题目 */}
                  {detailQuestions.map((question) => (
                    <div
                      key={question.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            <span className="font-medium text-gray-900">
                              {question.content}
                            </span>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 ml-2">
                          {question.type === "SINGLE_CHOICE"
                            ? "单选题"
                            : question.type === "MULTIPLE_CHOICE"
                              ? "多选题"
                              : question.type === "TRUE_FALSE"
                                ? "判断题"
                                : question.type === "FILL_BLANK"
                                  ? "填空题"
                                  : question.type === "MATCHING"
                                    ? "连线题"
                                    : question.type === "ESSAY"
                                      ? "简答题"
                                      : question.type}
                        </span>
                      </div>

                      <div className="ml-7 flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-700">
                        <span className="flex items-center gap-1">
                          <span className="font-semibold text-gray-900">
                            难度:
                          </span>
                          <span>{question.difficulty}</span>
                        </span>
                        {question.tags &&
                          (Array.isArray(question.tags)
                            ? question.tags.length > 0
                            : String(question.tags).trim().length > 0) && (
                            <span className="flex items-center gap-1">
                              <span className="font-semibold text-gray-900">
                                标签:
                              </span>
                              <span>
                                {Array.isArray(question.tags)
                                  ? question.tags.join(", ")
                                  : String(question.tags)}
                              </span>
                            </span>
                          )}
                        {question.knowledgePoint && (
                          <span className="flex items-center gap-1">
                            <span className="font-semibold text-gray-900">
                              知识点:
                            </span>
                            <span>{question.knowledgePoint}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <span className="font-semibold text-gray-900">
                            可见性:
                          </span>
                          <span
                            className={
                              question.isPublic
                                ? "text-green-600"
                                : "text-orange-600"
                            }
                          >
                            {question.isPublic ? "公开" : "私有"}
                          </span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 分页控件 */}
            {detailTotal > detailPageSize && (
              <div className="border-t border-gray-200 p-6 bg-gray-50">
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() =>
                      setDetailPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={detailPage === 1}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>

                  <span className="text-sm text-gray-700">
                    第 {detailPage} / {Math.ceil(detailTotal / detailPageSize)}{" "}
                    页
                  </span>

                  <button
                    onClick={() =>
                      setDetailPage((prev) =>
                        Math.min(
                          Math.ceil(detailTotal / detailPageSize),
                          prev + 1,
                        ),
                      )
                    }
                    disabled={
                      detailPage === Math.ceil(detailTotal / detailPageSize)
                    }
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一页
                  </button>

                  {/* 页码导航 */}
                  <div className="flex items-center gap-1 ml-4">
                    {(() => {
                      const pages = [];
                      const totalPages = Math.ceil(
                        detailTotal / detailPageSize,
                      );
                      const currentPage = detailPage;

                      // 如果总页数小于等于7，显示所有页码
                      if (totalPages <= 7) {
                        for (let i = 1; i <= totalPages; i++) {
                          pages.push(
                            <button
                              key={i}
                              onClick={() => setDetailPage(i)}
                              className={`w-8 h-8 rounded-full text-sm ${
                                currentPage === i
                                  ? "bg-blue-600 text-white"
                                  : "border border-gray-300 hover:bg-gray-100"
                              }`}
                            >
                              {i}
                            </button>,
                          );
                        }
                      } else {
                        // 总页数大于7，显示前3页，后3页，当前页周围页码，以及省略号
                        const maxVisiblePages = 5; // 最多显示5个页码按钮（包括省略号）

                        // 始终显示第一页
                        pages.push(
                          <button
                            key={1}
                            onClick={() => setDetailPage(1)}
                            className={`w-8 h-8 rounded-full text-sm ${
                              currentPage === 1
                                ? "bg-blue-600 text-white"
                                : "border border-gray-300 hover:bg-gray-100"
                            }`}
                          >
                            1
                          </button>,
                        );

                        // 计算需要显示的页码范围
                        let startPage = Math.max(2, currentPage - 1);
                        let endPage = Math.min(totalPages - 1, currentPage + 1);

                        // 如果当前页靠近开头，扩展结束页
                        if (currentPage <= 4) {
                          endPage = Math.min(
                            totalPages - 1,
                            maxVisiblePages - 1,
                          );
                        }

                        // 如果当前页靠近结尾，扩展开始页
                        if (currentPage >= totalPages - 3) {
                          startPage = Math.max(
                            2,
                            totalPages - maxVisiblePages + 2,
                          );
                        }

                        // 显示省略号（如果需要）
                        if (startPage > 2) {
                          pages.push(
                            <span
                              key="start-ellipsis"
                              className="px-2 text-gray-700"
                            >
                              ...
                            </span>,
                          );
                        }

                        // 显示中间页码
                        for (let i = startPage; i <= endPage; i++) {
                          pages.push(
                            <button
                              key={i}
                              onClick={() => setDetailPage(i)}
                              className={`w-8 h-8 rounded-full text-sm ${
                                currentPage === i
                                  ? "bg-blue-600 text-white"
                                  : "border border-gray-300 hover:bg-gray-100"
                              }`}
                            >
                              {i}
                            </button>,
                          );
                        }

                        // 显示省略号（如果需要）
                        if (endPage < totalPages - 1) {
                          pages.push(
                            <span
                              key="end-ellipsis"
                              className="px-2 text-gray-700"
                            >
                              ...
                            </span>,
                          );
                        }

                        // 始终显示最后一页
                        pages.push(
                          <button
                            key={totalPages}
                            onClick={() => setDetailPage(totalPages)}
                            className={`w-8 h-8 rounded-full text-sm ${
                              currentPage === totalPages
                                ? "bg-blue-600 text-white"
                                : "border border-gray-300 hover:bg-gray-100"
                            }`}
                          >
                            {totalPages}
                          </button>,
                        );
                      }

                      return pages;
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
