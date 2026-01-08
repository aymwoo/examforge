import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import Button from "@/components/ui/Button";
import { createExam, type CreateExamDto } from "@/services/exams";

export enum ExamAccountMode {
  PERMANENT = 'PERMANENT',
  TEMPORARY_IMPORT = 'TEMPORARY_IMPORT', 
  TEMPORARY_REGISTER = 'TEMPORARY_REGISTER'
}

export default function NewExamPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<CreateExamDto>({
    title: "",
    description: "",
    duration: 60,
    totalScore: 100,
    accountModes: [ExamAccountMode.TEMPORARY_IMPORT],
  });

  const handleInputChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!form.title?.trim()) {
      setError("考试标题不能为空");
      return false;
    }
    if (!form.duration || form.duration < 1) {
      setError("考试时长必须大于0");
      return false;
    }
    if (!form.totalScore || form.totalScore < 1) {
      setError("总分必须大于0");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setError(null);
    try {
      // 尝试最简化的数据
      const minimalData = {
        title: form.title,
        duration: form.duration,
      };
      console.log('Submitting minimal exam data:', JSON.stringify(minimalData, null, 2));
      await createExam(minimalData as CreateExamDto);
      navigate("/exams");
    } catch (err: unknown) {
      console.error('Create exam error:', err);
      const axiosError = err as any;
      console.error('Error response:', axiosError.response);
      console.error('Error data:', axiosError.response?.data);
      setError(
        axiosError.response?.data?.message || 
        axiosError.response?.data?.error || 
        axiosError.message || 
        "创建失败"
      );
    } finally {
      setSaving(false);
    }
  };

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
              新增考试
            </h1>
          </div>
          <Button onClick={handleSubmit} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "新增中..." : "新增"}
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-border bg-white p-4 text-center">
            <p className="text-ink-900">{error}</p>
          </div>
        )}

        <div className="rounded-3xl border border-border bg-white p-6 shadow-soft">
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink-900">
                考试标题
              </label>
              <input
                type="text"
                className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900"
                value={form.title || ""}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="请输入考试标题"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-ink-900">
                考试描述
              </label>
              <textarea
                className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900 min-h-[100px]"
                value={form.description || ""}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="请输入考试描述（可选）"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-ink-900">
                  考试时长（分钟）
                </label>
                <input
                  type="number"
                  min="1"
                  className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900"
                  value={form.duration || 60}
                  onChange={(e) => handleInputChange("duration", parseInt(e.target.value))}
                  placeholder="60"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink-900">
                  总分
                </label>
                <input
                  type="number"
                  min="1"
                  className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900"
                  value={form.totalScore || 100}
                  onChange={(e) => handleInputChange("totalScore", parseInt(e.target.value))}
                  placeholder="100"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-4 flex-wrap">
                <label className="text-sm font-semibold text-ink-900 whitespace-nowrap">
                  学生账号模式
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: ExamAccountMode.PERMANENT, label: '固定账号' },
                    { value: ExamAccountMode.TEMPORARY_IMPORT, label: '临时导入' },
                    { value: ExamAccountMode.TEMPORARY_REGISTER, label: '自主注册' }
                  ].map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => {
                        const currentModes = form.accountModes || [];
                        const isSelected = currentModes.includes(mode.value);
                        if (isSelected) {
                          // 取消选择，但至少保留一个
                          if (currentModes.length > 1) {
                            handleInputChange("accountModes", currentModes.filter(m => m !== mode.value));
                          }
                        } else {
                          // 添加选择
                          handleInputChange("accountModes", [...currentModes, mode.value]);
                        }
                      }}
                      className={`px-4 py-2 text-sm rounded-lg border transition-colors whitespace-nowrap ${
                        (form.accountModes || []).includes(mode.value)
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-blue-400 hover:bg-blue-50'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-slate-50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-ink-900">
                说明
              </h3>
              <ul className="ml-4 list-decimal space-y-2 text-sm text-ink-700">
                <li>
                  创建考试后，可以进入考试详情页添加题目
                </li>
                <li>
                  从题库中选择题目添加到考试，并设置每题的分值和顺序
                </li>
                <li>
                  支持删除考试中的题目，或调整题目顺序和分值
                </li>
                <li>
                  考试创建后状态为"草稿"，可以在详情页修改状态为"已发布"
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
