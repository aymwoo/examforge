import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Check, Search } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import api from "@/services/api";
import { getExamById, type Exam } from "@/services/exams";
import { listQuestions, type Question } from "@/services/questions";

const typeLabels: Record<string, string> = {
  SINGLE_CHOICE: "单选题",
  MULTIPLE_CHOICE: "多选题",
  TRUE_FALSE: "判断题",
  FILL_BLANK: "填空题",
  MATCHING: "连线题",
  ESSAY: "简答题",
};

export default function AddQuestionsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(
    new Set(),
  );
  const [existingQuestionIds, setExistingQuestionIds] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    type: "success" as "success" | "error",
  });

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (id) {
      loadExam();
    }
  }, [id]);

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
  }, [filters.type, filters.difficulty, filters.tags, filters.search, exam]);

  const loadExam = async () => {
    if (!id) return;
    try {
      const examData = await getExamById(id);
      setExam(examData);
      // 保存已存在的题目ID
      const existingIds = new Set(
        examData.examQuestions?.map((eq: any) => eq.questionId) || [],
      );
      setExistingQuestionIds(existingIds);
    } catch (error) {
      console.error("加载考试失败:", error);
    }
  };

  const loadQuestions = async (pageNum: number = 1) => {
    if (!exam) return;

    setLoading(true);
    try {
      const params: any = {
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

      // 显示所有题目，不过滤已存在的
      setQuestions(filteredData);
      setMeta(response.meta);
      setPage(pageNum);
    } catch (error) {
      console.error("加载题目失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleResetFilters = () => {
    setFilters({ type: "", difficulty: "", tags: "", search: "" });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= meta.totalPages) {
      loadQuestions(newPage);
    }
  };

  const handleQuestionToggle = (questionId: string) => {
    // 如果题目已经在考试中，不允许选择
    if (existingQuestionIds.has(questionId)) {
      return;
    }

    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else {
      newSelected.add(questionId);
    }
    setSelectedQuestions(newSelected);
  };

  const handleSelectAll = () => {
    // 只选择未添加的题目
    const availableQuestions = questions.filter(
      (q) => !existingQuestionIds.has(q.id),
    );
    if (selectedQuestions.size === availableQuestions.length) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(availableQuestions.map((q) => q.id)));
    }
  };

  const handleAddQuestions = async () => {
    if (selectedQuestions.size === 0) {
      setModalConfig({
        title: "提示",
        message: "请选择要添加的题目",
        type: "error",
      });
      setShowModal(true);
      return;
    }

    setSaving(true);
    try {
      const promises = Array.from(selectedQuestions).map((questionId, index) =>
        api.post(`/api/exams/${id}/questions`, {
          questionId,
          order: (exam?.examQuestions?.length || 0) + index + 1,
          score: 10,
        }),
      );

      await Promise.all(promises);
      setModalConfig({
        title: "成功",
        message: "题目添加成功",
        type: "success",
      });
      setShowModal(true);
    } catch (error) {
      console.error("添加题目失败:", error);
      setModalConfig({
        title: "错误",
        message: "添加题目失败，请重试",
        type: "error",
      });
      setShowModal(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* 页面头部 */}
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => navigate(`/exams/${id}`)}
            className="flex items-center gap-2 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            返回考试详情
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">添加题目到考试</h1>
          <p className="text-gray-600 mt-2">
            为 "{exam?.title}" 选择要添加的题目
            <span className="ml-2">
              (当前已有
              <button
                onClick={() => navigate(`/exams/${id}`)}
                className="text-blue-600 font-medium hover:text-blue-800 underline mx-1"
              >
                {existingQuestionIds.size} 道题目
              </button>
              )
            </span>
          </p>
        </div>

        {/* 筛选器 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                题型
              </label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange("type", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">全部题型</option>
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                难度
              </label>
              <select
                value={filters.difficulty}
                onChange={(e) =>
                  handleFilterChange("difficulty", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">全部难度</option>
                <option value="1">1 - 简单</option>
                <option value="2">2 - 较易</option>
                <option value="3">3 - 中等</option>
                <option value="4">4 - 较难</option>
                <option value="5">5 - 困难</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                标签
              </label>
              <input
                type="text"
                value={filters.tags}
                onChange={(e) => handleFilterChange("tags", e.target.value)}
                placeholder="输入标签"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                搜索
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  placeholder="搜索题目内容"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleResetFilters}
            className="text-gray-600"
          >
            重置筛选
          </Button>
        </div>

        {/* 操作栏 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={
                    questions.filter((q) => !existingQuestionIds.has(q.id))
                      .length > 0 &&
                    selectedQuestions.size ===
                      questions.filter((q) => !existingQuestionIds.has(q.id))
                        .length
                  }
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">全选可用题目</span>
              </label>
              <p className="text-gray-700">
                已选择{" "}
                <span className="font-semibold text-blue-600">
                  {selectedQuestions.size}
                </span>{" "}
                道题目
              </p>
            </div>
            <Button
              onClick={handleAddQuestions}
              disabled={selectedQuestions.size === 0 || saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4" />
              {saving ? "添加中..." : "添加选中题目"}
            </Button>
          </div>
        </div>

        {/* 题目列表 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">可选题目</h2>

          {questions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">没有找到符合条件的题目</p>
              <Button onClick={() => navigate("/questions")}>
                前往题库管理
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {questions.map((question) => {
                  const isExisting = existingQuestionIds.has(question.id);
                  const isSelected = selectedQuestions.has(question.id);

                  return (
                    <div
                      key={question.id}
                      className={`border rounded-xl p-6 transition-all ${
                        isExisting
                          ? "border-gray-300 bg-gray-50 opacity-60"
                          : isSelected
                            ? "border-blue-500 bg-blue-50 cursor-pointer"
                            : "border-gray-200 hover:border-gray-300 cursor-pointer"
                      }`}
                      onClick={() => handleQuestionToggle(question.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                isExisting
                                  ? "border-gray-400 bg-gray-400"
                                  : isSelected
                                    ? "border-blue-500 bg-blue-500"
                                    : "border-gray-300"
                              }`}
                            >
                              {(isExisting || isSelected) && (
                                <Check className="h-4 w-4 text-white" />
                              )}
                            </div>
                            {isExisting && (
                              <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs font-medium">
                                已添加
                              </span>
                            )}
                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                              {typeLabels[question.type] || question.type}
                            </span>
                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                              难度: {question.difficulty}
                            </span>
                            {question.knowledgePoint && (
                              <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                                {question.knowledgePoint}
                              </span>
                            )}
                            {question.tags && question.tags.length > 0 && (
                              <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">
                                {question.tags.join(", ")}
                              </span>
                            )}
                          </div>
                          <div
                            className={`mb-2 ${isExisting ? "text-gray-500" : "text-gray-800"}`}
                          >
                            {question.content}
                          </div>
                          {question.options &&
                            Array.isArray(question.options) &&
                            question.options.length > 0 && (
                              <div
                                className={`text-sm space-y-1 ml-8 ${isExisting ? "text-gray-400" : "text-gray-600"}`}
                              >
                                {question.options.map(
                                  (option: any, optIndex: number) => (
                                    <div key={optIndex}>
                                      {option.label}: {option.content}
                                    </div>
                                  ),
                                )}
                              </div>
                            )}
                          {question.answer && (
                            <div
                              className={`text-sm ml-8 mt-2 ${isExisting ? "text-gray-400" : "text-green-600"}`}
                            >
                              答案:{" "}
                              {Array.isArray(question.answer)
                                ? question.answer
                                    .map((pair) => `${pair.left}→${pair.right}`)
                                    .join(", ")
                                : question.answer}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 分页 */}
              {meta.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    共 {meta.total} 道题目，第 {meta.page} / {meta.totalPages}{" "}
                    页
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1}
                    >
                      上一页
                    </Button>
                    <span className="px-3 py-1 text-sm">
                      {page} / {meta.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= meta.totalPages}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* 提示模态框 */}
        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            if (modalConfig.type === "success") {
              navigate(`/exams/${id}`);
            }
          }}
          title={modalConfig.title}
          confirmText="确定"
          onConfirm={() => {
            setShowModal(false);
            if (modalConfig.type === "success") {
              navigate(`/exams/${id}`);
            }
          }}
        >
          <p>{modalConfig.message}</p>
        </Modal>
      </div>
    </div>
  );
}
