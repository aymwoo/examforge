import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import Button from "@/components/ui/Button";
import QuestionImageManager from "@/components/QuestionImageManager";
import {
  createQuestion,
  getQuestionById,
  updateQuestion,
  type Question,
} from "@/services/questions";

export default function NewQuestionPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<Question>>({
    type: "SINGLE_CHOICE",
    content: "",
    answer: "",
    explanation: "",
    illustration: "",
    images: [],
    tags: [],
    difficulty: 1,
    options: [
      { label: "A", content: "" },
      { label: "B", content: "" },
      { label: "C", content: "" },
      { label: "D", content: "" },
    ],
    knowledgePoint: "",
    isPublic: true,
  });

  useEffect(() => {
    if (isEditMode && id) {
      loadQuestion();
    }
  }, [isEditMode, id]);

  const loadQuestion = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const question = await getQuestionById(id);
      setForm({
        ...question,
        options: question.options || [
          { label: "A", content: "" },
          { label: "B", content: "" },
          { label: "C", content: "" },
          { label: "D", content: "" },
        ],
      });
    } catch (err: any) {
      setError(err.response?.data?.message || "加载题目失败");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleOptionsChange = (value: string) => {
    const lines = value.split("\n").filter(Boolean);
    const options = lines.map((line, idx) => ({
      label: String.fromCharCode(65 + idx),
      content: line.replace(/^[A-Z]\.\s*/, ""),
    }));
    setForm((prev) => ({ ...prev, options }));
  };

  const validateForm = (): boolean => {
    if (!form.content?.trim()) {
      setError("题干不能为空");
      return false;
    }
    if (
      (form.type === "SINGLE_CHOICE" || form.type === "MULTIPLE_CHOICE") &&
      (!form.options || form.options.every((o) => !o.content))
    ) {
      setError("选择题必须至少有一个选项");
      return false;
    }
    if (!form.answer?.trim()) {
      setError("答案不能为空");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setError(null);
    try {
      if (isEditMode && id) {
        await updateQuestion(id, form);
      } else {
        await createQuestion(form);
      }
      navigate("/questions");
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(
        axiosError.response?.data?.message ||
          axiosError.message ||
          (isEditMode ? "更新失败" : "创建失败"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTypeChange = (newType: string) => {
    setForm((prev) => ({ ...prev, type: newType }));
    setError(null);
  };

  if (loading) {
    return (
      <div className="bg-slatebg text-ink-900 antialiased min-h-screen pt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-ink-700">加载中...</p>
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
              {isEditMode ? "编辑题目" : "新增题目"}
            </h1>
          </div>
          <Button onClick={handleSubmit} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving
              ? isEditMode
                ? "更新中..."
                : "保存中..."
              : isEditMode
                ? "更新"
                : "保存"}
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-border bg-white p-4 text-center">
            <p className="text-ink-900">{error}</p>
          </div>
        )}

        <div className="rounded-3xl border border-border bg-white p-6 shadow-soft">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6 lg:col-span-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-ink-900">
                  题型
                </label>
                <select
                  className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900"
                  value={form.type || ""}
                  onChange={(e) => handleTypeChange(e.target.value)}
                >
                  <option value="SINGLE_CHOICE">单选题</option>
                  <option value="MULTIPLE_CHOICE">多选题</option>
                  <option value="TRUE_FALSE">判断题</option>
                  <option value="FILL_BLANK">填空题</option>
                  <option value="ESSAY">简答题</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink-900">
                  题干
                </label>
                <textarea
                  className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900 min-h-[120px]"
                  value={form.content || ""}
                  onChange={(e) => handleInputChange("content", e.target.value)}
                  placeholder="请输入题目内容"
                />
              </div>

              {(form.type === "SINGLE_CHOICE" ||
                form.type === "MULTIPLE_CHOICE") && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink-900">
                    选项（每行一个）
                  </label>
                  <textarea
                    className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900 min-h-[120px]"
                    value={
                      form.options
                        ? form.options
                            .map((o) => `${o.label}. ${o.content}`)
                            .join("\n")
                        : ""
                    }
                    onChange={(e) => {
                      handleOptionsChange(e.target.value);
                    }}
                    placeholder="A. 选项1&#10;B. 选项2&#10;C. 选项3&#10;D. 选项4"
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink-900">
                  答案
                </label>
                <textarea
                  className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900 min-h-[80px]"
                  value={form.answer || ""}
                  onChange={(e) => handleInputChange("answer", e.target.value)}
                  placeholder={
                    form.type === "TRUE_FALSE"
                      ? "正确 或 错误"
                      : "请输入正确答案"
                  }
                />
                <p className="mt-1 text-xs text-ink-700">
                  {form.type === "MULTIPLE_CHOICE"
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
                  value={form.explanation || ""}
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
                  images={form.images || []}
                  onImagesChange={(images) =>
                    handleInputChange("images", images)
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink-900">
                  图例（兼容旧版）
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const result = event.target?.result as string;
                            handleInputChange("illustration", result);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                      id="illustration-upload"
                    />
                    <label
                      htmlFor="illustration-upload"
                      className="cursor-pointer inline-flex items-center px-3 py-1.5 text-xs font-medium text-accent-600 bg-accent-50 border border-accent-200 rounded-lg hover:bg-accent-100"
                    >
                      选择图片
                    </label>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const clipboardItems =
                            await navigator.clipboard.read();
                          for (const item of clipboardItems) {
                            if (
                              item.types.includes("image/png") ||
                              item.types.includes("image/jpeg")
                            ) {
                              const blob = await item.getType(
                                item.types.find((type) =>
                                  type.startsWith("image/"),
                                ) || "",
                              );
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const result = event.target?.result as string;
                                handleInputChange("illustration", result);
                              };
                              reader.readAsDataURL(blob);
                              break;
                            }
                          }
                        } catch (err) {
                          console.error("Failed to read clipboard:", err);
                        }
                      }}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-accent-600 bg-accent-50 border border-accent-200 rounded-lg hover:bg-accent-100"
                    >
                      从剪贴板粘贴
                    </button>
                    {form.illustration && (
                      <button
                        type="button"
                        onClick={() => handleInputChange("illustration", "")}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
                      >
                        清除图片
                      </button>
                    )}
                  </div>
                  {form.illustration && (
                    <div className="mt-2">
                      <img
                        src={form.illustration}
                        alt="题目图例"
                        className="max-w-full max-h-48 rounded-lg border border-border"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-ink-900">
                  标签
                </label>
                <div className="mt-2">
                  {/* 显示已存在的标签按钮 */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.tags &&
                      form.tags.map((tag: string, index: number) => (
                        <div
                          key={index}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-800 border border-blue-200"
                        >
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const newTags = [...(form.tags || [])];
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
                        if (input && !form.tags?.includes(input)) {
                          handleInputChange("tags", [
                            ...(form.tags || []),
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
                  value={form.difficulty || 1}
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
                  value={form.knowledgePoint || ""}
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
                      name="isPublic"
                      value="true"
                      checked={form.isPublic !== false}
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
                      name="isPublic"
                      value="false"
                      checked={form.isPublic === false}
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
          </div>
        </div>
      </div>
    </div>
  );
}
