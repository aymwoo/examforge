import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Save,
  X,
  FileText,
  Image,
  Calendar,
} from "lucide-react";
import Button from "@/components/ui/Button";
import QuestionImageManager from "@/components/QuestionImageManager";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { resolveAssetUrl } from "@/utils/url";
import {
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  getQuestionImportRecord,
  getImportRecordImages,
  type Question,
} from "@/services/questions";

const typeLabels: Record<string, string> = {
  SINGLE_CHOICE: "单选题",
  MULTIPLE_CHOICE: "多选题",
  TRUE_FALSE: "判断题",
  FILL_BLANK: "填空题",
  MATCHING: "连线题",
  ESSAY: "简答题",
};

export default function QuestionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Question>>({});
  const [importRecords, setImportRecords] = useState<any[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedImportImages, setSelectedImportImages] = useState<any[]>([]);

  const normalizeMatchingData = (data: Partial<Question>) => {
    if (data.matching) {
      return data.matching;
    }
    if (data.type !== "MATCHING") {
      return undefined;
    }
    const rawAnswer = data.answer;
    if (!rawAnswer || typeof rawAnswer !== "string" || !rawAnswer.trim()) {
      return {
        leftItems: [],
        rightItems: [],
        matches: {},
      };
    }
    try {
      const parsed = JSON.parse(rawAnswer);
      if (!Array.isArray(parsed)) {
        return {
          leftItems: [],
          rightItems: [],
          matches: {},
        };
      }
      const leftItems = parsed
        .map((item: any) => String(item.left || "").trim())
        .filter((item: string) => item.length > 0);
      const rightItems = parsed
        .map((item: any) => String(item.right || "").trim())
        .filter((item: string) => item.length > 0);
      const matches: Record<string, string> = {};
      parsed.forEach((pair: any) => {
        if (pair.left && pair.right) {
          matches[String(pair.left)] = String(pair.right);
        }
      });
      return {
        leftItems,
        rightItems: Array.from(new Set(rightItems)),
        matches,
      };
    } catch {
      return {
        leftItems: [],
        rightItems: [],
        matches: {},
      };
    }
  };

  const loadQuestion = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getQuestionById(id);
      const normalizedMatching = normalizeMatchingData(data);
      const normalizedQuestion = {
        ...data,
        matching: normalizedMatching,
      };
      setQuestion(normalizedQuestion);
      setEditForm({
        content: data.content,
        type: data.type,
        answer: data.answer,
        explanation: data.explanation,
        tags: data.tags,
        difficulty: data.difficulty,
        knowledgePoint: data.knowledgePoint,
        options: data.options,
        matching: normalizedMatching,
      });

      // Load import records for this question
      try {
        const records = await getQuestionImportRecord(id);
        setImportRecords(records);
      } catch (err) {
        console.warn("Failed to load import records:", err);
      }
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
    loadQuestion();
  }, [id]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (question) {
      const normalizedMatching = normalizeMatchingData(question);
      setEditForm({
        content: question.content,
        type: question.type,
        answer: question.answer,
        explanation: question.explanation,
        tags: question.tags,
        difficulty: question.difficulty,
        knowledgePoint: question.knowledgePoint,
        options: question.options,
        matching: normalizedMatching,
      });
    }
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      if (editForm.type === "MATCHING") {
        const leftItems = editForm.matching?.leftItems || [];
        const rightItems = editForm.matching?.rightItems || [];
        const matches = editForm.matching?.matches || {};
        const hasEmptyLeft = leftItems.some((item) => !item.trim());
        const hasEmptyRight = rightItems.some((item) => !item.trim());
        if (leftItems.length === 0 || rightItems.length === 0) {
          setError("连线题必须包含左右两列内容");
          setSaving(false);
          return;
        }
        if (hasEmptyLeft || hasEmptyRight) {
          setError("连线题左右两列不能有空项");
          setSaving(false);
          return;
        }
        if (Object.keys(matches).length !== leftItems.length) {
          setError("连线题需要为每个左侧项设置匹配");
          setSaving(false);
          return;
        }
      } else if (
        !editForm.answer ||
        (typeof editForm.answer === "string" && !editForm.answer.trim())
      ) {
        setError("答案不能为空");
        setSaving(false);
        return;
      }
      const updated = await updateQuestion(id, editForm);
      setQuestion(updated);
      setIsEditing(false);
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(
        axiosError.response?.data?.message || axiosError.message || "保存失败",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm("确定要删除这道题目吗？此操作不可恢复。")) return;

    try {
      await deleteQuestion(id);
      navigate("/questions");
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

  const handleInputChange = (field: string, value: any) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleMatchingListChange = (
    side: "leftItems" | "rightItems",
    value: string,
  ) => {
    const items = value
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    setEditForm((prev) => {
      const currentMatches = prev.matching?.matches || {};
      const nextMatches: Record<string, string> = {};
      if (side === "leftItems") {
        items.forEach((item) => {
          if (currentMatches[item]) {
            nextMatches[item] = currentMatches[item];
          }
        });
      } else {
        Object.entries(currentMatches).forEach(([left, right]) => {
          if (items.includes(right)) {
            nextMatches[left] = right;
          }
        });
      }
      return {
        ...prev,
        matching: {
          leftItems:
            side === "leftItems" ? items : prev.matching?.leftItems || [],
          rightItems:
            side === "rightItems" ? items : prev.matching?.rightItems || [],
          matches: nextMatches,
        },
      };
    });
  };

  const updateMatchingPair = (leftItem: string, rightItem: string) => {
    setEditForm((prev) => {
      const leftItems = prev.matching?.leftItems || [];
      const rightItems = prev.matching?.rightItems || [];
      const nextMatches = {
        ...(prev.matching?.matches || {}),
        [leftItem]: rightItem,
      };
      const answerValue = JSON.stringify(
        leftItems.map((left) => ({
          left,
          right: nextMatches[left] || "",
        })),
      );
      return {
        ...prev,
        matching: {
          leftItems,
          rightItems,
          matches: nextMatches,
        },
        answer: answerValue,
      };
    });
  };

  const handleViewImportRecord = async (record: any) => {
    try {
      const images = await getImportRecordImages(record.jobId);
      setSelectedImportImages(images.images || []);
      setShowImportModal(true);
    } catch (err) {
      console.error("Failed to load import images:", err);
      setError("加载导入图片失败");
    }
  };

  const handleViewAllImportQuestions = (record: any) => {
    if (record.questionIds && record.questionIds.length > 0) {
      navigate(`/questions?ids=${record.questionIds.join(",")}`);
    }
  };

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
            <Button onClick={() => navigate("/questions")}>返回</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="bg-slatebg text-ink-900 antialiased min-h-screen pt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-white p-12 text-center">
            <p className="text-ink-700">题目不存在</p>
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
            <Button variant="outline" onClick={() => navigate("/questions")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
              {isEditing ? "编辑题目" : "题目详情"}
            </h1>
          </div>
          <div className="flex gap-2">
            {!isEditing && (
              <>
                <Button variant="outline" onClick={handleEdit}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  编辑
                </Button>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  删除
                </button>
              </>
            )}
            {isEditing && (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  <X className="h-4 w-4 mr-2" />
                  取消
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "保存中..." : "保存"}
                </Button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-border bg-white p-4 text-center">
            <p className="text-ink-900">{error}</p>
          </div>
        )}

        <div className="rounded-3xl border border-border bg-white p-6 shadow-soft">
          {isEditing ? (
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-ink-900">
                  题型
                </label>
                <select
                  className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900"
                  value={editForm.type || ""}
                  onChange={(e) => handleInputChange("type", e.target.value)}
                >
                  <option value="SINGLE_CHOICE">单选题</option>
                  <option value="MULTIPLE_CHOICE">多选题</option>
                  <option value="TRUE_FALSE">判断题</option>
                  <option value="FILL_BLANK">填空题</option>
                  <option value="MATCHING">连线题</option>
                  <option value="ESSAY">简答题</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink-900">
                  题干
                </label>
                <textarea
                  className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900 min-h-[120px]"
                  value={editForm.content || ""}
                  onChange={(e) => handleInputChange("content", e.target.value)}
                  placeholder="请输入题目内容"
                />
              </div>

              {(editForm.type === "SINGLE_CHOICE" ||
                editForm.type === "MULTIPLE_CHOICE") && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink-900">
                    选项（每行一个）
                  </label>
                  <textarea
                    className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900 min-h-[120px]"
                    value={
                      editForm.options
                        ? editForm.options
                            .map((o) => `${o.label}. ${o.content}`)
                            .join("\n")
                        : ""
                    }
                    onChange={(e) => {
                      const lines = e.target.value.split("\n").filter(Boolean);
                      const options = lines.map((line, idx) => ({
                        label: String.fromCharCode(65 + idx),
                        content: line.replace(/^[A-Z]\.\s*/, ""),
                      }));
                      handleInputChange("options", options);
                    }}
                    placeholder="A. 选项1&#10;B. 选项2&#10;C. 选项3&#10;D. 选项4"
                  />
                </div>
              )}

              {editForm.type === "MATCHING" && (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-ink-900">
                      左侧列表（每行一个）
                    </label>
                    <textarea
                      className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900 min-h-[120px]"
                      value={editForm.matching?.leftItems?.join("\n") || ""}
                      onChange={(e) =>
                        handleMatchingListChange("leftItems", e.target.value)
                      }
                      placeholder="示例：\n概念A\n概念B"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-ink-900">
                      右侧列表（每行一个）
                    </label>
                    <textarea
                      className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900 min-h-[120px]"
                      value={editForm.matching?.rightItems?.join("\n") || ""}
                      onChange={(e) =>
                        handleMatchingListChange("rightItems", e.target.value)
                      }
                      placeholder="示例：\n定义1\n定义2"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-ink-900">
                      正确连线
                    </label>
                    <div className="space-y-3">
                      {(editForm.matching?.leftItems || []).map((leftItem) => (
                        <div
                          key={leftItem}
                          className="flex flex-col gap-2 rounded-xl border border-border bg-slate-50 p-3"
                        >
                          <span className="text-sm font-semibold text-ink-900">
                            {leftItem}
                          </span>
                          <select
                            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900"
                            value={editForm.matching?.matches?.[leftItem] || ""}
                            onChange={(e) =>
                              updateMatchingPair(leftItem, e.target.value)
                            }
                          >
                            <option value="">请选择匹配项</option>
                            {(editForm.matching?.rightItems || []).map(
                              (rightItem) => (
                                <option key={rightItem} value={rightItem}>
                                  {rightItem}
                                </option>
                              ),
                            )}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink-900">
                  答案
                </label>
                <textarea
                  className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900 min-h-[80px]"
                  value={
                    typeof editForm.answer === "string" ? editForm.answer : ""
                  }
                  onChange={(e) => handleInputChange("answer", e.target.value)}
                  placeholder={
                    editForm.type === "TRUE_FALSE"
                      ? "正确 或 错误"
                      : editForm.type === "MATCHING"
                        ? "系统已根据连线生成答案，可留空"
                        : "请输入正确答案"
                  }
                  disabled={editForm.type === "MATCHING"}
                />
                <p className="mt-1 text-xs text-ink-700">
                  {editForm.type === "MULTIPLE_CHOICE"
                    ? "多个答案用逗号或分号分隔"
                    : ""}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink-900">
                  解析
                </label>
                <textarea
                  className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900 min-h-[80px]"
                  value={editForm.explanation || ""}
                  onChange={(e) =>
                    handleInputChange("explanation", e.target.value)
                  }
                  placeholder="请输入题目解析（可选）"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink-900">
                  示例图
                </label>
                <QuestionImageManager
                  questionId={id}
                  images={editForm.images || []}
                  onImagesChange={(images) =>
                    handleInputChange("images", images)
                  }
                  isEditing={true}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink-900">
                  标签
                </label>
                <div className="mt-2">
                  {/* 显示已存在的标签按钮 */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editForm.tags &&
                      editForm.tags.map((tag: string, index: number) => (
                        <div
                          key={index}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-800 border border-blue-200"
                        >
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const newTags = [...(editForm.tags || [])];
                              newTags.splice(index, 1);
                              handleInputChange("tags", newTags);
                            }}
                            className="ml-1 text-blue-500 hover:text-blue-700"
                          >
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
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
                      ))}
                  </div>

                  {/* 标签输入框 */}
                  <input
                    type="text"
                    className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const input = e.currentTarget.value.trim();
                        if (input && !editForm.tags?.includes(input)) {
                          handleInputChange("tags", [
                            ...(editForm.tags || []),
                            input,
                          ]);
                          e.currentTarget.value = "";
                        }
                      }
                    }}
                    placeholder="输入标签后按回车添加"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink-900">
                  难度
                </label>
                <select
                  className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900"
                  value={editForm.difficulty || 1}
                  onChange={(e) =>
                    handleInputChange("difficulty", parseInt(e.target.value))
                  }
                >
                  {[1, 2, 3, 4, 5].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink-900">
                  知识点
                </label>
                <input
                  type="text"
                  className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900"
                  value={editForm.knowledgePoint || ""}
                  onChange={(e) =>
                    handleInputChange("knowledgePoint", e.target.value)
                  }
                  placeholder="请输入知识点（可选）"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink-900">
                  可见性
                </label>
                <div className="mt-2 space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name={`isPublic-${id}`} // 使用题目ID确保唯一性
                      value="true"
                      checked={editForm.isPublic !== false}
                      onChange={() => handleInputChange("isPublic", true)}
                      className="mr-2"
                    />
                    <span className="text-sm text-ink-900">
                      公开 - 所有用户可见
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name={`isPublic-${id}`} // 使用题目ID确保唯一性
                      value="false"
                      checked={editForm.isPublic === false}
                      onChange={() => handleInputChange("isPublic", false)}
                      className="mr-2"
                    />
                    <span className="text-sm text-ink-900">
                      私有 - 仅自己和管理员可见
                    </span>
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <span className="shrink-0 rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-semibold text-ink-900">
                  {typeLabels[question.type] || question.type}
                </span>
                <div className="text-lg font-medium text-ink-900">
                  <MarkdownRenderer content={question.content} />
                </div>
              </div>

              {question.options && question.options.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-ink-900">
                    选项
                  </h3>
                  <div className="space-y-2">
                    {question.options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="font-semibold text-ink-900 w-6">
                          {opt.label}.
                        </span>
                        <div className="text-ink-700">
                          <MarkdownRenderer content={opt.content} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {question.matching && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-ink-900">
                    连线配置
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-border bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-ink-700 mb-2">
                        左侧
                      </p>
                      <div className="space-y-2">
                        {question.matching.leftItems.map((item) => (
                          <div
                            key={item}
                            className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-900"
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-ink-700 mb-2">
                        右侧
                      </p>
                      <div className="space-y-2">
                        {question.matching.rightItems.map((item) => (
                          <div
                            key={item}
                            className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-900"
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                    {Object.entries(question.matching.matches).map(
                      ([left, right]) => (
                        <div key={left}>
                          {left} → {right}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-ink-900">
                    答案
                  </h3>
                  <div className="rounded-xl border border-border bg-slate-50 px-3 py-2 text-ink-900">
                    <MarkdownRenderer
                      content={
                        Array.isArray(question.answer)
                          ? question.answer
                              .map((pair) => `${pair.left}→${pair.right}`)
                              .join(", ")
                          : question.answer || "-"
                      }
                    />
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold text-ink-900">
                    难度
                  </h3>
                  <p className="rounded-xl border border-border bg-slate-50 px-3 py-2 text-ink-900">
                    {question.difficulty}
                  </p>
                </div>
              </div>

              {question.explanation && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-ink-900">
                    解析
                  </h3>
                  <div className="rounded-xl border border-border bg-slate-50 px-3 py-2 text-ink-900">
                    <MarkdownRenderer content={question.explanation} />
                  </div>
                </div>
              )}

              {question.images && question.images.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-ink-900">
                    示例图
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {question.images.map((image, index) => (
                      <button
                        key={`${image}-${index}`}
                        type="button"
                        className="rounded-lg border border-border bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        aria-label={`打开示例图 ${index + 1}`}
                        onClick={() => {
                          setSelectedImportImages([image]);
                          setShowImportModal(true);
                        }}
                      >
                        <img
                          src={resolveAssetUrl(image)}
                          alt={`示例图 ${index + 1}`}
                          className="w-full max-h-48 object-contain rounded-lg"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {question.illustration && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-ink-900">
                    图例（旧版）
                  </h3>
                  <img
                    src={resolveAssetUrl(question.illustration)}
                    alt="题目图例"
                    className="max-w-full max-h-48 rounded-lg border border-border"
                  />
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {question.tags.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-ink-900">
                      标签
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {question.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="rounded-lg bg-slate-50 px-2 py-1 text-sm text-ink-900"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {question.knowledgePoint && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-ink-900">
                      知识点
                    </h3>
                    <p className="rounded-xl border border-border bg-slate-50 px-3 py-2 text-ink-900">
                      {question.knowledgePoint}
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-xs text-ink-700">
                  创建于 {new Date(question.createdAt).toLocaleString("zh-CN")}
                  {question.updatedAt !== question.createdAt &&
                    ` · 更新于 ${new Date(question.updatedAt).toLocaleString("zh-CN")}`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 导入记录 - 在编辑和查看模式下都显示 */}
        {importRecords.length > 0 && (
          <div className="mt-6 rounded-3xl border border-border bg-white p-6 shadow-soft">
            <h3 className="mb-4 text-lg font-semibold text-ink-900">
              导入记录
            </h3>
            <div className="space-y-3">
              {importRecords.map((record) => (
                <div
                  key={record.id}
                  className="rounded-xl border border-border bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-ink-700" />
                        <span className="font-medium text-ink-900">
                          {record.fileName}
                        </span>
                        <span className="text-xs text-ink-600 bg-white px-2 py-1 rounded">
                          {record.mode === "vision" ? "图片识别" : "文本解析"}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-ink-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(record.createdAt).toLocaleString("zh-CN")}
                        </span>
                        <span>共 {record.questionIds.length} 道题目</span>
                        {record.user && <span>导入者：{record.user.name}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewImportRecord(record)}
                        className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-ink-900 border border-border hover:bg-slate-50"
                      >
                        <Image className="h-3 w-3" />
                        查看原图
                      </button>
                      <button
                        onClick={() => handleViewAllImportQuestions(record)}
                        className="inline-flex items-center gap-1 rounded-lg bg-accent-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-700"
                      >
                        查看所有题目
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 导入图片查看模态框 */}
        {showImportModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            onClick={() => setShowImportModal(false)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setShowImportModal(false);
              }
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-image-modal-title"
            tabIndex={-1}
          >
            <div
              className="max-w-6xl max-h-[90vh] bg-white rounded-2xl p-6 overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3
                  id="import-image-modal-title"
                  className="text-lg font-semibold text-ink-900"
                >
                  导入原始图像
                </h3>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="text-ink-700 hover:text-ink-900 text-xl font-bold"
                  aria-label="关闭导入图片预览"
                >
                  ×
                </button>
              </div>
              <div className="grid gap-4">
                {selectedImportImages.map((image, index) => {
                  const imageSrc =
                    typeof image === "string"
                      ? resolveAssetUrl(image)
                      : image.data;

                  return (
                    <div
                      key={`${imageSrc || "image"}-${index}`}
                      className="text-center"
                    >
                      <p className="text-sm text-ink-600 mb-2">
                        第 {index + 1} 页
                      </p>
                      <img
                        src={imageSrc}
                        alt={`导入图像 ${index + 1}`}
                        className="max-w-full h-auto rounded-xl border border-border mx-auto"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
