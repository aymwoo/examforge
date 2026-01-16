import { Save } from "lucide-react";
import Button from "@/components/ui/Button";
import type { AIProviderItem } from "./types.ts";
import type { SystemSettings } from "@/services/settings";

interface PromptsTabProps {
  settings: SystemSettings;
  savingPromptTemplate: boolean;
  savingGradingPromptTemplate: boolean;
  savingAnalysisPromptTemplate: boolean;
  savingStudentAiAnalysisPromptTemplate: boolean;
  savingJsonGenerationPromptTemplate: boolean;
  promptTemplateChanged: boolean;
  gradingPromptTemplateChanged: boolean;
  analysisPromptTemplateChanged: boolean;
  studentAiAnalysisPromptTemplateChanged: boolean;
  jsonGenerationPromptTemplateChanged: boolean;
  onInputChange: (field: string, value: string) => void;
  onSavePromptTemplate: () => Promise<void>;
  onSaveGradingPromptTemplate: () => Promise<void>;
  onSaveAnalysisPromptTemplate: () => Promise<void>;
  onSaveStudentAiAnalysisPromptTemplate: () => Promise<void>;
  onSaveJsonGenerationPromptTemplate: () => Promise<void>;
  onInsertJsonStructure: () => Promise<void>;
  onResetToDefault: (templateType?: string) => Promise<void>;
  onInsertGradingVariables: () => void;
  onInsertAnalysisVariables: () => void;
  setSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
  providers: AIProviderItem[];
  defaultProviderId: string | null;
  handleUserProviderSelect: (providerId: string) => Promise<void>;
}

export function PromptsTab({
  settings,
  savingPromptTemplate,
  savingGradingPromptTemplate,
  savingAnalysisPromptTemplate,
  savingStudentAiAnalysisPromptTemplate,
  savingJsonGenerationPromptTemplate,
  promptTemplateChanged,
  gradingPromptTemplateChanged,
  analysisPromptTemplateChanged,
  studentAiAnalysisPromptTemplateChanged,
  jsonGenerationPromptTemplateChanged,
  onInputChange,
  onSavePromptTemplate,
  onSaveGradingPromptTemplate,
  onSaveAnalysisPromptTemplate,
  onSaveStudentAiAnalysisPromptTemplate,
  onSaveJsonGenerationPromptTemplate,
  onInsertJsonStructure,
  onResetToDefault,
  onInsertGradingVariables,
  onInsertAnalysisVariables,
  setSettings,
  providers,
  defaultProviderId,
  handleUserProviderSelect,
}: PromptsTabProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="col-span-2 rounded-3xl border border-border bg-white p-6 shadow-soft">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-900">
            AI Provider 选择
          </h2>
        </div>
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            选择您个人使用的AI Provider
          </label>
          <select
            value={settings.aiProvider || ""}
            onChange={(e) => handleUserProviderSelect(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">使用系统默认设置</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name} {provider.isGlobal ? "(全局)" : "(个人)"}{" "}
                {defaultProviderId === provider.id ? "(系统默认)" : ""}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-ink-700">
          选择您个人使用的AI
          Provider，此设置仅影响您的个人使用体验，不影响其他用户。
        </p>
      </div>

      <div className="rounded-3xl border border-border bg-white p-6 shadow-soft">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-900">
            试卷生成提示词配置
          </h2>
          <div className="flex gap-2">
            <Button onClick={onInsertJsonStructure} variant="outline" size="sm">
              插入JSON结构
            </Button>
            <Button
              onClick={() => onResetToDefault("PROMPT_TEMPLATE")}
              variant="outline"
              size="sm"
            >
              重置默认
            </Button>
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink-900">
            提示词模板
          </label>
          <textarea
            className="min-h-[200px] w-full rounded-xl border border-border bg-white px-3 py-2 text-sm font-mono text-ink-900"
            value={settings.promptTemplate}
            onChange={(e) => onInputChange("promptTemplate", e.target.value)}
            placeholder="输入AI提示词模板..."
          />
          <p className="mt-1 text-xs text-ink-700">
            提示词模板用于指导AI如何根据试卷图像生成题目。此为您的个人设置。
          </p>
        </div>
        <Button
          onClick={onSavePromptTemplate}
          disabled={savingPromptTemplate || !promptTemplateChanged}
          className={`mt-4 w-full ${promptTemplateChanged ? "bg-ink-900 text-white hover:bg-ink-800" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}
        >
          <Save className="mr-2 h-4 w-4" />
          {savingPromptTemplate ? "保存中..." : "保存提示词设置"}
        </Button>
      </div>

      <div className="rounded-3xl border border-border bg-white p-6 shadow-soft">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-900">
            AI评分提示词配置
          </h2>
          <div className="flex gap-2">
            <Button
              onClick={onInsertGradingVariables}
              variant="outline"
              size="sm"
            >
              插入支持变量
            </Button>
            <Button
              onClick={() => onResetToDefault("GRADING_PROMPT_TEMPLATE")}
              variant="outline"
              size="sm"
            >
              重置默认
            </Button>
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink-900">
            评分提示词模板
          </label>
          <textarea
            className="min-h-[200px] w-full rounded-xl border border-border bg-white px-3 py-2 text-sm font-mono text-ink-900"
            value={settings.gradingPromptTemplate}
            onChange={(e) =>
              onInputChange("gradingPromptTemplate", e.target.value)
            }
            placeholder="输入AI评分提示词模板..."
          />
          <p className="mt-1 text-xs text-ink-700">
            评分提示词模板用于指导AI如何评分学生答案。支持变量：
            {"{questionContent}"}, {"{questionType}"}, {"{referenceAnswer}"},
            {"{studentAnswer}"}, {"{maxScore}"}。
          </p>
        </div>
        <Button
          onClick={onSaveGradingPromptTemplate}
          disabled={
            savingGradingPromptTemplate || !gradingPromptTemplateChanged
          }
          className={`mt-4 w-full ${gradingPromptTemplateChanged ? "bg-ink-900 text-white hover:bg-ink-800" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}
        >
          <Save className="mr-2 h-4 w-4" />
          {savingGradingPromptTemplate ? "保存中..." : "保存评分提示词设置"}
        </Button>
      </div>

      <div className="rounded-3xl border border-border bg-white p-6 shadow-soft">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-900">
            评分管理 AI分析提示词配置
          </h2>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                const variables =
                  "\n支持的变量：\n- {studentLabel} - 学生显示名/账号\n- {studentPrompt} - 学生个性化提示词\n- {payload} - 评分详情JSON";
                setSettings((prev) => ({
                  ...prev,
                  studentAiAnalysisPromptTemplate:
                    prev.studentAiAnalysisPromptTemplate + variables,
                }));
              }}
              variant="outline"
              size="sm"
            >
              插入支持变量
            </Button>
            <Button
              onClick={() =>
                onResetToDefault("STUDENT_AI_ANALYSIS_PROMPT_TEMPLATE")
              }
              variant="outline"
              size="sm"
            >
              重置默认
            </Button>
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink-900">
            学生个人AI分析提示词模板
          </label>
          <textarea
            className="min-h-[200px] w-full rounded-xl border border-border bg-white px-3 py-2 text-sm font-mono text-ink-900"
            value={settings.studentAiAnalysisPromptTemplate}
            onChange={(e) =>
              onInputChange("studentAiAnalysisPromptTemplate", e.target.value)
            }
            placeholder="输入评分管理-学生AI分析提示词模板..."
          />
          <p className="mt-1 text-xs text-ink-700">
            用于评分管理页面对单个学生生成AI分析报告。此为您的个人设置。
          </p>
        </div>
        <Button
          onClick={onSaveStudentAiAnalysisPromptTemplate}
          disabled={
            savingStudentAiAnalysisPromptTemplate ||
            !studentAiAnalysisPromptTemplateChanged
          }
          className={`mt-4 w-full ${studentAiAnalysisPromptTemplateChanged ? "bg-ink-900 text-white hover:bg-ink-800" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}
        >
          <Save className="mr-2 h-4 w-4" />
          {savingStudentAiAnalysisPromptTemplate
            ? "保存中..."
            : "保存评分管理AI提示词设置"}
        </Button>
      </div>

      <div className="rounded-3xl border border-border bg-white p-6 shadow-soft">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-900">
            分析报告提示词配置
          </h2>
          <div className="flex gap-2">
            <Button
              onClick={onInsertAnalysisVariables}
              variant="outline"
              size="sm"
            >
              插入支持变量
            </Button>
            <Button
              onClick={() => onResetToDefault("ANALYSIS_PROMPT_TEMPLATE")}
              variant="outline"
              size="sm"
            >
              重置默认
            </Button>
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink-900">
            分析报告提示词模板
          </label>
          <textarea
            className="min-h-[200px] w-full rounded-xl border border-border bg-white px-3 py-2 text-sm font-mono text-ink-900"
            value={settings.analysisPromptTemplate}
            onChange={(e) =>
              onInputChange("analysisPromptTemplate", e.target.value)
            }
            placeholder="输入AI分析报告提示词模板..."
          />
          <p className="mt-1 text-xs text-ink-700">
            分析报告提示词模板用于指导AI如何生成考试分析报告。此为您的个人设置。
          </p>
        </div>
        <Button
          onClick={onSaveAnalysisPromptTemplate}
          disabled={
            savingAnalysisPromptTemplate || !analysisPromptTemplateChanged
          }
          className={`mt-4 w-full ${analysisPromptTemplateChanged ? "bg-ink-900 text-white hover:bg-ink-800" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}
        >
          <Save className="mr-2 h-4 w-4" />
          {savingAnalysisPromptTemplate ? "保存中..." : "保存分析提示词设置"}
        </Button>
      </div>

      <div className="rounded-3xl border border-border bg-white p-6 shadow-soft">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-900">
            AI生成JSON格式提示词配置
          </h2>
          <div className="flex gap-2">
            <Button
              onClick={() =>
                onResetToDefault("JSON_GENERATION_PROMPT_TEMPLATE")
              }
              variant="outline"
              size="sm"
            >
              重置默认
            </Button>
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink-900">
            AI生成JSON格式提示词模板
          </label>
          <textarea
            className="min-h-[200px] w-full rounded-xl border border-border bg-white px-3 py-2 text-sm font-mono text-ink-900"
            value={settings.jsonGenerationPromptTemplate}
            onChange={(e) =>
              onInputChange("jsonGenerationPromptTemplate", e.target.value)
            }
            placeholder="输入AI生成JSON格式提示词模板..."
          />
          <p className="mt-1 text-xs text-ink-700">
            提示词模板用于指导AI如何生成JSON格式的题目数据。此为您的个人设置。
          </p>
        </div>
        <Button
          onClick={onSaveJsonGenerationPromptTemplate}
          disabled={
            savingJsonGenerationPromptTemplate ||
            !jsonGenerationPromptTemplateChanged
          }
          className={`mt-4 w-full ${jsonGenerationPromptTemplateChanged ? "bg-ink-900 text-white hover:bg-ink-800" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}
        >
          <Save className="mr-2 h-4 w-4" />
          {savingJsonGenerationPromptTemplate
            ? "保存中..."
            : "保存JSON生成提示词设置"}
        </Button>
      </div>
    </div>
  );
}
