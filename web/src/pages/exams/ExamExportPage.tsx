import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import ExamLayout from "@/components/ExamLayout";
import Button from "@/components/ui/Button";
import { useExamExport } from "@/hooks/useExamExport";

type ExportItemKey =
  | "grades"
  | "examAiPdf"
  | "studentAiPdfs"
  | "rawJson"
  | "questions";

const defaultSelected: Record<ExportItemKey, boolean> = {
  grades: true,
  examAiPdf: true,
  studentAiPdfs: true,
  rawJson: true,
  questions: true,
};

export default function ExamExportPage() {
  const { id } = useParams<{ id: string }>();
  const [selected, setSelected] = useState(defaultSelected);

  const exportOptions = useMemo(
    () => ({
      includeGrades: selected.grades,
      includeExamAiPdf: selected.examAiPdf,
      includeStudentAiPdfs: selected.studentAiPdfs,
      includeRawJson: selected.rawJson,
      includeQuestions: selected.questions,
    }),
    [selected],
  );

  const { startExport, close, modal } = useExamExport(id, exportOptions);

  type ExportStep = {
    id:
      | "fetching"
      | "grades"
      | "questions"
      | "raw-json"
      | "exam-ai-pdf"
      | "student-ai-pdfs"
      | "zipping"
      | "complete";
    label: string;
    enabled: boolean;
  };

  const steps: ExportStep[] = [
    { id: "fetching", label: "获取考试数据", enabled: true },
    { id: "grades", label: "生成成绩册", enabled: selected.grades },
    { id: "questions", label: "生成题目明细", enabled: selected.questions },
    { id: "raw-json", label: "生成 JSON", enabled: selected.rawJson },
    {
      id: "exam-ai-pdf",
      label: "生成考试 AI PDF",
      enabled: selected.examAiPdf,
    },
    {
      id: "student-ai-pdfs",
      label: "生成学生 AI PDF",
      enabled: selected.studentAiPdfs,
    },
    { id: "zipping", label: "打包 zip", enabled: true },
    { id: "complete", label: "完成下载", enabled: true },
  ];

  const visibleSteps = steps.filter((s) => s.enabled);

  const currentStepId =
    typeof modal.step === "string" &&
    steps.some((s) => s.id === modal.step) &&
    steps.find((s) => s.id === modal.step)?.enabled
      ? (modal.step as ExportStep["id"])
      : null;

  const currentMessage =
    modal.message ||
    (currentStepId
      ? `${visibleSteps.find((s) => s.id === currentStepId)?.label}...`
      : "正在处理...");

  const processedCount =
    typeof (modal.meta as any)?.processedCount === "number"
      ? ((modal.meta as any).processedCount as number)
      : null;
  const totalReports =
    typeof (modal.meta as any)?.totalReports === "number"
      ? ((modal.meta as any).totalReports as number)
      : null;

  const currentIndex = currentStepId
    ? visibleSteps.findIndex((s) => s.id === currentStepId)
    : -1;

  const isCompleted = (stepId: ExportStep["id"]) => {
    if (!currentStepId) return false;
    if (stepId === "complete" && modal.progress >= 100) return true;
    const index = visibleSteps.findIndex((s) => s.id === stepId);
    return index !== -1 && currentIndex !== -1 && index < currentIndex;
  };

  const isCurrent = (stepId: ExportStep["id"]) => stepId === currentStepId;

  return (
    <ExamLayout activeTab="export">
      <div className="space-y-6">
        <div className="rounded-3xl border-2 border-orange-100 bg-gradient-to-br from-orange-50 to-white p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-orange-900">导出数据</h2>
          <p className="mt-2 text-sm text-orange-800">
            勾选需要导出的内容，系统将只把选中的文件打包进 zip。
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <label className="flex items-start gap-3 p-4 rounded-xl border bg-white hover:bg-orange-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.grades}
                onChange={(e) =>
                  setSelected((s) => ({ ...s, grades: e.target.checked }))
                }
                className="mt-1"
              />
              <div>
                <div className="font-semibold text-gray-900">
                  成绩册（Excel）
                </div>
                <div className="text-sm text-gray-600">
                  包含学生成绩、提交状态等
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-xl border bg-white hover:bg-orange-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.examAiPdf}
                onChange={(e) =>
                  setSelected((s) => ({ ...s, examAiPdf: e.target.checked }))
                }
                className="mt-1"
              />
              <div>
                <div className="font-semibold text-gray-900">
                  考试 AI 分析（PDF）
                </div>
                <div className="text-sm text-gray-600">
                  包含整场考试 AI 分析内容
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-xl border bg-white hover:bg-orange-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.studentAiPdfs}
                onChange={(e) =>
                  setSelected((s) => ({
                    ...s,
                    studentAiPdfs: e.target.checked,
                  }))
                }
                className="mt-1"
              />
              <div>
                <div className="font-semibold text-gray-900">
                  学生个人 AI 分析（PDF）
                </div>
                <div className="text-sm text-gray-600">
                  仅包含已生成的学生报告
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-xl border bg-white hover:bg-orange-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.questions}
                onChange={(e) =>
                  setSelected((s) => ({ ...s, questions: e.target.checked }))
                }
                className="mt-1"
              />
              <div>
                <div className="font-semibold text-gray-900">
                  题目明细（Excel）
                </div>
                <div className="text-sm text-gray-600">题干、答案、分值等</div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-xl border bg-white hover:bg-orange-50 cursor-pointer sm:col-span-2">
              <input
                type="checkbox"
                checked={selected.rawJson}
                onChange={(e) =>
                  setSelected((s) => ({ ...s, rawJson: e.target.checked }))
                }
                className="mt-1"
              />
              <div>
                <div className="font-semibold text-gray-900">
                  原始数据（JSON）
                </div>
                <div className="text-sm text-gray-600">
                  包含考试结构与原始数据，便于二次处理
                </div>
              </div>
            </label>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <Button
              onClick={startExport}
              className="bg-orange-600 hover:bg-orange-700 text-white"
              disabled={
                !Object.values(selected).some(Boolean) || modal.isExporting
              }
            >
              {modal.isExporting ? "导出中..." : "开始导出"}
            </Button>
            {!Object.values(selected).some(Boolean) && (
              <span className="text-sm text-red-600">至少选择一项导出内容</span>
            )}
          </div>

          {(modal.isExporting || modal.error) && (
            <div className="mt-6 rounded-2xl border border-orange-100 bg-white p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">
                  {modal.error ? "导出失败" : "正在导出"}
                </div>
                <div className="text-sm text-gray-600">{modal.progress}%</div>
              </div>

              <div className="mt-3 w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-orange-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${modal.progress}%` }}
                ></div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-sm text-gray-700">{currentMessage}</div>
                  {currentStepId && (
                    <div className="mt-1 text-xs text-gray-500">
                      当前步骤：
                      {visibleSteps.find((s) => s.id === currentStepId)?.label}
                    </div>
                  )}

                  {currentStepId === "student-ai-pdfs" &&
                    totalReports !== null &&
                    processedCount !== null && (
                      <div className="mt-1 text-xs text-gray-500">
                        已生成学生报告 {processedCount} / {totalReports}
                      </div>
                    )}
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="text-xs font-semibold text-gray-700">
                    导出步骤
                  </div>
                  <ol className="mt-2 space-y-2">
                    {visibleSteps.map((s) => {
                      const done = isCompleted(s.id);
                      const current = isCurrent(s.id);
                      return (
                        <li
                          key={s.id}
                          className="flex items-center gap-2 text-xs"
                        >
                          <span
                            className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                              done
                                ? "border-green-300 bg-green-100 text-green-700"
                                : current
                                  ? "border-orange-300 bg-orange-100 text-orange-700"
                                  : "border-gray-200 bg-white text-gray-400"
                            }`}
                          >
                            {done ? "✓" : current ? "•" : ""}
                          </span>
                          <span
                            className={`${
                              done
                                ? "text-gray-700"
                                : current
                                  ? "text-orange-700 font-semibold"
                                  : "text-gray-500"
                            }`}
                          >
                            {s.label}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </div>

              {modal.error && (
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    onClick={startExport}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    重试
                  </Button>
                  <Button variant="outline" onClick={close}>
                    关闭
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ExamLayout>
  );
}
