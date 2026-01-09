import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import Button from "@/components/ui/Button";
import { createQuestion, type Question } from "@/services/questions";


export default function NewQuestionPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<Question>>({
    type: "SINGLE_CHOICE",
    content: "",
    answer: "",
    explanation: "",
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

  const handleInputChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleTagsChange = (value: string) => {
    const tags = value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setForm((prev) => ({ ...prev, tags }));
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
      await createQuestion(form);
      navigate("/questions");
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(
        axiosError.response?.data?.message || axiosError.message || "创建失败",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTypeChange = (newType: string) => {
    setForm((prev) => ({ ...prev, type: newType }));
    setError(null);
  };

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
              新增题目
            </h1>
          </div>
          <Button onClick={handleSubmit} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "保存中..." : "保存"}
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
            </div>

            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-ink-900">
                  标签
                </label>
                <input
                  type="text"
                  className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900"
                  value={form.tags ? form.tags.join(", ") : ""}
                  onChange={(e) => handleTagsChange(e.target.value)}
                  placeholder="多个标签用逗号分隔"
                />
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
                    <span className="text-sm text-ink-900">公开 - 所有用户可见</span>
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
                    <span className="text-sm text-ink-900">私有 - 仅自己和管理员可见</span>
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
