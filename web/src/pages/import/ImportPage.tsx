import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Download,
  FileSpreadsheet,
  Upload,
  Info,
  CheckCircle,
  XCircle,
  ArrowRight,
} from "lucide-react";
import * as XLSX from "xlsx";
import axios from "axios";
import api from "@/services/api";
import {
  getProviders,
  getSettings,
  getUserSettings,
  getPromptTemplate,
  updateSetting,
  type AIModelConfig,
} from "@/services/settings";

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  qwen: "Qwen",
  custom: "自定义",
};

export default function ImportPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"excel" | "pdf">("excel");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [fileType, setFileType] = useState<"pdf" | "image" | null>(null);
  const [pdfMode, setPdfMode] = useState<"vision" | "text">("vision");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: number;
    failed: number;
    errors: { row: number; message: string }[];
    questionIds?: string[];
  } | null>(null);

  const [pdfJobId, setPdfJobId] = useState<string | null>(null);
  const [aiProvider, setAiProvider] = useState<string>("gpt-4");
  const [providerOptions, setProviderOptions] = useState<AIModelConfig[]>([]);
  const [pdfEvents, setPdfEvents] = useState<any[]>([]);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [tempPrompt, setTempPrompt] = useState<string>("");
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      setUploadResult(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      setUploadResult(null);
    }
  };

  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedPdf(file);

      // 检测文件类型
      if (file.type.startsWith("image/")) {
        setFileType("image");
        setPdfMode("vision"); // 图片只能用视觉识别
      } else if (file.type === "application/pdf") {
        setFileType("pdf");
      } else {
        setFileType(null);
      }

      setPdfJobId(null);
      setPdfEvents([]);
      setPdfError(null);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        题干: "这是一道示例题目",
        题型: "单选题",
        选项: "选项1,选项2,选项3,选项4",
        答案: "选项1",
        解析: "这是题目解析",
        标签: "标签1,标签2",
        难度: 1,
        知识点: "示例知识点",
      },
      {
        题干: "这是一道多选题示例",
        题型: "多选题",
        选项: "A,B,C,D",
        答案: "A,B,C",
        解析: "多选题可以有多个正确答案",
        标签: "多选",
        难度: 2,
        知识点: "逻辑推理",
      },
      {
        题干: "判断题示例",
        题型: "判断题",
        答案: "正确",
        解析: "判断题答案是正确或错误",
        标签: "判断",
        难度: 1,
        知识点: "基础",
      },
      {
        题干: "填空题示例：1 + 1 = ___",
        题型: "填空题",
        答案: "2",
        解析: "简单的加法",
        标签: "填空",
        难度: 1,
        知识点: "数学",
      },
      {
        题干: "简答题示例：请简述什么是人工智能",
        题型: "简答题",
        答案: "人工智能是计算机科学的一个分支",
        解析: "需要详细阐述概念",
        标签: "简答",
        难度: 3,
        知识点: "计算机科学",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "题目模板");

    XLSX.writeFile(workbook, "ExamForge题目导入模板.xlsx");
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadResult(null);

    const formData = new FormData();

    formData.append("file", selectedFile);

    try {
      const response = await axios.post("/api/import/excel", formData);

      setUploadResult(response.data);
      setSelectedFile(null);
    } catch (error: unknown) {
      console.error("Upload failed:", error);
      const axiosError = error as {
        response?: { data?: { message?: string } };
      };
      const message =
        axiosError.response?.data?.message || "上传失败，请检查文件格式";
      alert(message);
    } finally {
      setIsUploading(false);
    }
  };

  const latestPdfEvent =
    pdfEvents.length > 0 ? pdfEvents[pdfEvents.length - 1] : null;
  const pdfResult = latestPdfEvent?.result;
  const pdfStage = latestPdfEvent?.stage;
  const pdfMessage = latestPdfEvent?.message;
  const pdfProgress =
    latestPdfEvent?.total && latestPdfEvent?.current
      ? Math.min(
          100,
          Math.round((latestPdfEvent.current / latestPdfEvent.total) * 100),
        )
      : undefined;

  const pdfProgressLabel =
    pdfStage === "calling_ai" &&
    latestPdfEvent?.current &&
    latestPdfEvent?.total
      ? `AI 处理中（${latestPdfEvent.current}/${latestPdfEvent.total}）`
      : pdfStage === "saving_questions" &&
          latestPdfEvent?.current &&
          latestPdfEvent?.total
        ? `保存题目（${latestPdfEvent.current}/${latestPdfEvent.total}）`
        : pdfStage === "converting_pdf_to_images"
          ? fileType === "image"
            ? "准备图片识别"
            : "PDF 转图片中"
          : undefined;

  useEffect(() => {
    // Load current AI provider + available providers for dropdown.
    void (async () => {
      try {
        const [settingsData, providersData] = await Promise.all([
          getUserSettings(),
          getProviders(),
        ]);
        const preferredId =
          providersData.find((p) => p.provider === settingsData.aiProvider)
            ?.id ||
          providersData[0]?.id ||
          "";
        setAiProvider(preferredId);
        setProviderOptions(providersData);

        // Load user's prompt template (includes user customizations)
        const promptTemplate = settingsData.promptTemplate || "";
        console.log('Loaded prompt template:', promptTemplate);
        
        if (promptTemplate.trim()) {
          setTempPrompt(promptTemplate);
        } else {
          // If no user template, try to get default template
          try {
            const defaultTemplate = await getPromptTemplate();
            setTempPrompt(defaultTemplate);
          } catch (error) {
            console.warn("Failed to load default prompt template:", error);
            // Set a basic fallback
            setTempPrompt("请根据提供的内容生成考试题目。");
          }
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
        // Set basic fallback values
        setTempPrompt("请根据提供的内容生成考试题目。");
      }
    })();
  }, []);

  useEffect(() => {
    if (!pdfJobId) return;

    const url = `/api/import/pdf/progress/${pdfJobId}`;
    const es = new EventSource(url);
    let didReceiveAnyEvent = false;
    const timeout = window.setTimeout(() => {
      if (!didReceiveAnyEvent) {
        setPdfError("进度连接中断，请稍后重试");
        es.close();
      }
    }, 8000);

    es.onmessage = (event) => {
      didReceiveAnyEvent = true;
      window.clearTimeout(timeout);
      try {
        const data = JSON.parse(event.data);
        setPdfEvents((prev) => [...prev, data]);
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      window.clearTimeout(timeout);
      setPdfError("进度连接中断，请稍后重试");
      es.close();
    };

    return () => {
      window.clearTimeout(timeout);
      es.close();
    };
  }, [pdfJobId]);

  const handleClipboardPaste = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((type) => type.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          // 根据实际的MIME类型确定文件扩展名，并添加时间戳避免重名
          const extension = imageType.split('/')[1] || 'png';
          const timestamp = Date.now();
          const fileName = `clipboard-image-${timestamp}.${extension}`;
          const file = new File([blob], fileName, {
            type: imageType,
          });
          setSelectedPdf(file);
          setFileType("image");
          setPdfMode("vision");
          setPdfJobId(null);
          setPdfEvents([]);
          setPdfError(null);
          break;
        }
      }
    } catch (error) {
      console.error("Failed to read clipboard:", error);
      alert("无法读取剪贴板内容，请确保剪贴板中有图片");
    }
  };

  const handleAiDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleAiDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/") || file.type === "application/pdf") {
        setSelectedPdf(file);

        if (file.type.startsWith("image/")) {
          setFileType("image");
          setPdfMode("vision");
        } else if (file.type === "application/pdf") {
          setFileType("pdf");
        }

        setPdfJobId(null);
        setPdfEvents([]);
        setPdfError(null);
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (activeTab === "pdf" && e.ctrlKey && e.key === "v") {
      e.preventDefault();
      handleClipboardPaste();
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeTab]);

  const handlePdfUpload = async () => {
    if (!selectedPdf) return;

    setIsUploading(true);
    setPdfJobId(null);
    setPdfEvents([]);
    setPdfError(null);

    const formData = new FormData();
    formData.append("file", selectedPdf);

    try {
      const params = new URLSearchParams();
      params.append("mode", pdfMode);
      if (tempPrompt.trim()) {
        params.append("prompt", tempPrompt.trim());
      }

      const response = await api.post(
        `/api/import/pdf?${params.toString()}`,
        formData,
      );
      setPdfJobId(response.data.jobId);
      setSelectedPdf(null);
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { message?: string } };
      };
      setPdfError(axiosError.response?.data?.message || `${fileType === "image" ? "图片" : "PDF"} 上传失败`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-slatebg text-ink-900 antialiased min-h-screen pt-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
              题目导入
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-700">
              批量导入题目到题库。支持 Excel/CSV 或 AI 智能导入。
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/import/history')}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-ink-900 shadow-sm transition-colors hover:bg-slate-50"
            >
              导入历史
            </button>
            {activeTab === "excel" && (
              <button
                onClick={downloadTemplate}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-ink-900 shadow-sm transition-colors hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                下载模板
              </button>
            )}
          </div>
        </div>

        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab("excel")}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === "excel"
                ? "bg-accent-600 text-white"
                : "border border-border bg-white text-ink-900 hover:bg-slate-50"
            }`}
          >
            Excel/CSV
          </button>
          <button
            onClick={() => setActiveTab("pdf")}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === "pdf"
                ? "bg-accent-600 text-white"
                : "border border-border bg-white text-ink-900 hover:bg-slate-50"
            }`}
          >
            AI导入
          </button>
        </div>

        {activeTab === "excel" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-ink-900 mb-4">
                上传文件
              </h2>

              <div
                className={`mt-2 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-white p-12 transition-colors ${
                  dragActive
                    ? "border-accent-600 bg-accent-600/5"
                    : "hover:border-accent-600"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                />
                <FileSpreadsheet className="h-16 w-16 mb-4 text-ink-900" />
                <p className="text-base font-medium text-ink-900 mb-2">
                  拖拽文件到此处
                </p>
                <p className="text-sm text-ink-900 mb-4">
                  支持 Excel (.xlsx, .xls) 和 CSV 文件，最大 10MB
                </p>
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-700 cursor-pointer"
                >
                  <Upload className="h-4 w-4" />
                  选择文件
                </label>
              </div>

              {selectedFile && (
                <div className="mt-4 rounded-xl border border-border bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-ink-900">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-ink-700">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setUploadResult(null);
                      }}
                      className="text-xs font-semibold text-link-800 hover:text-link-700"
                    >
                      清除
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? "上传中..." : "开始导入"}
              </button>
            </div>

            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-ink-900 mb-4">
                导入格式说明
              </h2>

              <div className="space-y-3">
                <div className="rounded-xl border border-border bg-slate-50 p-3">
                  <div className="flex items-start gap-2">
                    <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-link-800" />
                    <div>
                      <p className="text-sm font-semibold text-ink-900">
                        支持的列
                      </p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-700">
                        <li>
                          <span className="font-semibold text-ink-900">
                            题干
                          </span>{" "}
                          - 必填，题目内容
                        </li>
                        <li>
                          <span className="font-semibold text-ink-900">
                            题型
                          </span>{" "}
                          - 可选，支持：单选题、多选题、判断题、填空题、简答题
                        </li>
                        <li>
                          <span className="font-semibold text-ink-900">
                            选项
                          </span>{" "}
                          - 选择题必填，用逗号、分号或竖线分隔
                        </li>
                        <li>
                          <span className="font-semibold text-ink-900">
                            答案
                          </span>{" "}
                          - 必填
                        </li>
                        <li>
                          <span className="font-semibold text-ink-900">
                            解析
                          </span>{" "}
                          - 可选
                        </li>
                        <li>
                          <span className="font-semibold text-ink-900">
                            标签
                          </span>{" "}
                          - 可选，用逗号分隔
                        </li>
                        <li>
                          <span className="font-semibold text-ink-900">
                            难度
                          </span>{" "}
                          - 可选，1-5 的整数
                        </li>
                        <li>
                          <span className="font-semibold text-ink-900">
                            知识点
                          </span>{" "}
                          - 可选
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-ink-900 mb-2">
                    题型值映射
                  </p>
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-border">
                        <td className="py-2 text-ink-700">单选题</td>
                        <td className="py-2 text-right text-ink-900">
                          SINGLE_CHOICE
                        </td>
                      </tr>
                      <tr className="border-b border-border">
                        <td className="py-2 text-ink-700">多选题</td>
                        <td className="py-2 text-right text-ink-900">
                          MULTIPLE_CHOICE
                        </td>
                      </tr>
                      <tr className="border-b border-border">
                        <td className="py-2 text-ink-700">判断题</td>
                        <td className="py-2 text-right text-ink-900">
                          TRUE_FALSE
                        </td>
                      </tr>
                      <tr className="border-b border-border">
                        <td className="py-2 text-ink-700">填空题</td>
                        <td className="py-2 text-right text-ink-900">
                          FILL_BLANK
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 text-ink-700">简答题</td>
                        <td className="py-2 text-right text-ink-900">ESSAY</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "pdf" && (
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-ink-900 mb-4">
              AI 智能导入
            </h2>

            <div className="rounded-2xl border border-border bg-slate-50 p-4">
              <p className="text-sm text-ink-700">
                上传 PDF 或图片后，系统会调用 AI
                识别内容并生成题目，最后保存到题库。
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-ink-600">
                <span className="flex items-center gap-1">
                  <span>💡</span>
                  <span>支持拖拽上传</span>
                </span>
                <span className="flex items-center gap-1">
                  <span>⌨️</span>
                  <span>快捷键 Ctrl+V 粘贴图片</span>
                </span>
                <span className="flex items-center gap-1">
                  <span>📁</span>
                  <span>支持 PDF、JPG、PNG 等格式</span>
                </span>
              </div>

              <div className="mt-4">
                <p className="text-sm font-semibold text-ink-900 mb-3">
                  选择 AI Provider
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {providerOptions.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={async () => {
                        setAiProvider(provider.id);
                        try {
                          // Always save the selected provider ID
                          await updateSetting("AI_PROVIDER", provider.id);

                          // For built-in providers, also save their settings to system_settings
                          const isBuiltInProvider = [
                            "gpt-4",
                            "gpt-3.5-turbo",
                            "qwen-turbo",
                            "qwen-plus",
                            "qwen-max",
                          ].includes(provider.id);

                          if (isBuiltInProvider) {
                            if (provider.defaultBaseUrl) {
                              await updateSetting("AI_BASE_URL", provider.defaultBaseUrl);
                            }
                            if (provider.defaultModel) {
                              await updateSetting("AI_MODEL", provider.defaultModel);
                            }
                          } else {
                            // For custom providers, clear system settings as they're stored in ai_providers table
                            await updateSetting("AI_BASE_URL", "");
                            await updateSetting("AI_MODEL", "");
                          }
                        } catch {
                          // ignore update errors here (Settings page is source of truth)
                        }
                      }}
                      className={`p-3 rounded-xl border text-left transition-colors ${
                        aiProvider === provider.id
                          ? "border-accent-600 bg-accent-50 text-accent-900"
                          : "border-border bg-white text-ink-900 hover:border-accent-300 hover:bg-accent-50"
                      }`}
                    >
                      <div className="font-medium text-sm">{provider.name}</div>
                      <div className="text-xs text-ink-600 mt-1">
                        {PROVIDER_LABELS[provider.provider] || provider.provider}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                {!selectedPdf ? (
                  <div
                    className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
                      dragActive
                        ? "border-accent-600 bg-accent-600/5"
                        : "border-border hover:border-accent-600 hover:bg-accent-600/5"
                    }`}
                    onDragEnter={handleAiDrag}
                    onDragLeave={handleAiDrag}
                    onDragOver={handleAiDrag}
                    onDrop={handleAiDrop}
                    onClick={() =>
                      document.getElementById("ai-file-upload")?.click()
                    }
                  >
                    <input
                      type="file"
                      id="ai-file-upload"
                      className="hidden"
                      accept="application/pdf,.pdf,image/*"
                      onChange={handlePdfSelect}
                    />
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-100">
                      <svg
                        className="h-8 w-8 text-accent-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-ink-900">
                      上传文件或拖拽到此处
                    </h3>
                    <p className="mb-4 text-sm text-ink-700">
                      支持 PDF 和图片格式 (JPG, PNG, GIF, WebP)
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-700"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                        选择文件
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClipboardPaste();
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-ink-900 shadow-sm transition-colors hover:bg-slate-50"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                        粘贴图片 (Ctrl+V)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border bg-white p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-100">
                        {fileType === "image" ? (
                          <svg
                            className="h-6 w-6 text-accent-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="h-6 w-6 text-accent-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-ink-900">
                          {selectedPdf.name}
                        </h4>
                        <p className="text-sm text-ink-700">
                          {(selectedPdf.size / 1024).toFixed(2)} KB •{" "}
                          {fileType === "image" ? "图片文件" : "PDF文件"}
                        </p>
                        {fileType === "image" && (
                          <p className="text-xs text-accent-600 mt-1">
                            仅支持图片识别模式
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setSelectedPdf(null);
                          setFileType(null);
                          setPdfJobId(null);
                          setPdfEvents([]);
                          setPdfError(null);
                        }}
                        className="rounded-lg p-2 text-ink-700 hover:bg-slate-100 hover:text-ink-900"
                      >
                        <svg
                          className="h-4 w-4"
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
                  </div>
                )}
              </div>

              {selectedPdf && fileType !== "image" && (
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-ink-900 mb-2">
                    识别模式
                  </label>
                  <select
                    value={pdfMode}
                    onChange={(e) => setPdfMode(e.target.value as any)}
                    className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-semibold text-ink-900 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  >
                    <option value="vision">图片识别（推荐）</option>
                    <option value="text">文本解析（可复制 PDF）</option>
                  </select>
                </div>
              )}

              {selectedPdf && (
                <div className="mt-4">
                  <button
                    onClick={handlePdfUpload}
                    disabled={isUploading}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-accent-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? (
                      <>
                        <svg
                          className="h-4 w-4 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        处理中...
                      </>
                    ) : (
                      <>
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                        开始 AI 识别
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Prompt Editor - moved below the import button */}
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-ink-900">
                      AI 提示词
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPromptEditor(!showPromptEditor)}
                    className="text-xs text-accent-600 hover:text-accent-700"
                  >
                    {showPromptEditor ? "收起" : "展开编辑"}
                  </button>
                </div>

                {showPromptEditor && (
                  <div className="mt-2">
                    <textarea
                      value={tempPrompt}
                      onChange={(e) => setTempPrompt(e.target.value)}
                      placeholder="输入 AI 提示词..."
                      className="w-full h-48 rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900 placeholder-ink-500 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white resize-y"
                    />
                    <p className="mt-1 text-xs text-ink-600">
                      此处修改仅对本次导入有效，不会保存到系统设置
                    </p>
                  </div>
                )}

                {!showPromptEditor && (
                  <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-border">
                    {tempPrompt ? (
                      <div className="text-xs text-ink-700 max-h-24 overflow-y-auto whitespace-pre-wrap">
                        {tempPrompt}
                      </div>
                    ) : (
                      <div className="text-xs text-ink-500 italic">
                        正在加载提示词...
                      </div>
                    )}
                  </div>
                )}
              </div>

              {pdfError && (
                <div className="mt-3 rounded-xl border border-border bg-white p-3 text-sm text-ink-900">
                  {pdfError}
                </div>
              )}

              {(pdfMessage || pdfProgress !== undefined) && (
                <div className="mt-4 rounded-xl border border-border bg-white p-4">
                  <p className="text-sm font-semibold text-ink-900">进度</p>
                  <p className="mt-1 text-xs text-ink-700">
                    文件类型：{fileType === "image" ? "图片" : "PDF"} |
                    识别模式：{pdfMode === "vision" ? "图片识别" : "文本解析"}
                  </p>

                  {pdfProgressLabel && (
                    <p className="mt-1 text-sm font-semibold text-ink-900">
                      {pdfProgressLabel}
                    </p>
                  )}
                  {pdfMessage && (
                    <p className="mt-1 text-sm text-ink-700">{pdfMessage}</p>
                  )}
                  {pdfProgress !== undefined && (
                    <div className="mt-3">
                      <div className="h-2 w-full rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-accent-600"
                          style={{ width: `${pdfProgress}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-ink-700">
                        {pdfProgress}%
                      </p>
                    </div>
                  )}
                  {pdfStage === "chunked_text" &&
                    latestPdfEvent?.meta &&
                    pdfMode === "text" && (
                      <div className="mt-4 rounded-2xl border border-border bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-ink-900">
                          分块信息
                        </p>
                        <div className="mt-2 grid gap-2 text-xs text-ink-700 sm:grid-cols-2">
                          <div>
                            总块数：
                            {String(
                              (latestPdfEvent.meta as any).totalChunks ?? "-",
                            )}
                          </div>
                          <div>
                            原文长度：
                            {String(
                              (latestPdfEvent.meta as any).totalTextLength ??
                                "-",
                            )}
                          </div>
                          <div>
                            单块上限：
                            {String(
                              (latestPdfEvent.meta as any).maxChunkChars ?? "-",
                            )}
                          </div>
                          <div>
                            overlap：
                            {String(
                              (latestPdfEvent.meta as any).overlapChars ?? "-",
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                  {pdfStage === "calling_ai" &&
                    latestPdfEvent?.meta &&
                    pdfMode === "text" && (
                      <div className="mt-4 rounded-2xl border border-border bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-ink-900">
                          当前分块
                        </p>
                        <div className="mt-2 grid gap-2 text-xs text-ink-700 sm:grid-cols-2">
                          <div>
                            块序号：
                            {String(
                              (latestPdfEvent.meta as any).chunkIndex ?? "-",
                            )}
                          </div>
                          <div>
                            块长度：
                            {String(
                              (latestPdfEvent.meta as any).chunkLength ?? "-",
                            )}
                          </div>
                          <div>
                            疑似半题：
                            {String(
                              (latestPdfEvent.meta as any).looksIncomplete ??
                                false,
                            )}
                          </div>
                          <div>
                            补全拼接：
                            {String(
                              (latestPdfEvent.meta as any)
                                .mergedNextHeadChars ?? 0,
                            )}
                          </div>
                        </div>
                        {(latestPdfEvent.meta as any).chunkPreview && (
                          <p className="mt-2 text-xs text-ink-700">
                            预览：
                            {String((latestPdfEvent.meta as any).chunkPreview)}
                          </p>
                        )}
                      </div>
                    )}

                  {pdfStage === "done" && pdfResult && (
                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <div className="rounded-2xl border border-border bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-ink-900">
                          成功
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-ink-900">
                          {pdfResult.success}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-ink-900">
                          失败
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-ink-900">
                          {pdfResult.failed}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-ink-900">
                          总计
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-ink-900">
                          {pdfResult.success + pdfResult.failed}
                        </p>
                      </div>
                    </div>
                  )}

                  {pdfStage === "done" && pdfResult?.success > 0 && (
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
                      <button
                        onClick={() => {
                          const questionIds = latestPdfEvent?.meta?.questionIds;
                          if (questionIds && questionIds.length > 0) {
                            navigate(`/questions?ids=${questionIds.join(",")}`);
                          } else {
                            navigate("/questions");
                          }
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-ink-900 shadow-sm transition-colors hover:bg-slate-50"
                      >
                        查看刚刚导入的试题
                        <ArrowRight className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          const questionIds = latestPdfEvent?.meta?.questionIds;
                          if (questionIds && questionIds.length > 0) {
                            navigate(
                              `/exams/new?questionIds=${questionIds.join(",")}`,
                            );
                          } else {
                            navigate("/exams/new");
                          }
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-700"
                      >
                        创建考试
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {pdfStage === "done" && pdfResult?.errors?.length > 0 && (
                    <div className="mt-4 rounded-2xl border border-border bg-white p-4">
                      <p className="text-sm font-semibold text-ink-900 mb-3">
                        错误详情
                      </p>
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="border-b border-border">
                            <tr>
                              <th className="py-2 text-left text-ink-900">
                                序号
                              </th>
                              <th className="py-2 text-left text-ink-900">
                                错误信息
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {pdfResult.errors.map(
                              (error: any, index: number) => (
                                <tr
                                  key={index}
                                  className="border-b border-border"
                                >
                                  <td className="py-2 text-ink-700">
                                    {error.row}
                                  </td>
                                  <td className="py-2 text-ink-900">
                                    {error.message}
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {uploadResult && activeTab === "excel" && (
          <div className="mt-6 rounded-3xl border border-border bg-white p-6 shadow-soft">
            <h2 className="text-2xl font-semibold tracking-tight text-ink-900 mb-4">
              导入结果
            </h2>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-link-800" />
                  <p className="text-sm font-semibold text-ink-900">成功</p>
                </div>
                <p className="mt-2 text-2xl font-semibold text-ink-900">
                  {uploadResult.success}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-ink-900" />
                  <p className="text-sm font-semibold text-ink-900">失败</p>
                </div>
                <p className="mt-2 text-2xl font-semibold text-ink-900">
                  {uploadResult.failed}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-slate-50 p-4">
                <p className="text-sm font-semibold text-ink-900">总计</p>
                <p className="mt-2 text-2xl font-semibold text-ink-900">
                  {uploadResult.success + uploadResult.failed}
                </p>
              </div>
            </div>

            {uploadResult.errors.length > 0 && (
              <div className="mt-4 rounded-2xl border border-border bg-white p-4">
                <p className="text-sm font-semibold text-ink-900 mb-3">
                  错误详情
                </p>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border">
                      <tr>
                        <th className="py-2 text-left text-ink-900">行号</th>
                        <th className="py-2 text-left text-ink-900">
                          错误信息
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadResult.errors.map((error, index) => (
                        <tr key={index} className="border-b border-border">
                          <td className="py-2 text-ink-700">{error.row}</td>
                          <td className="py-2 text-ink-900">{error.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {uploadResult.success > 0 && (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  onClick={() => {
                    if (
                      uploadResult.questionIds &&
                      uploadResult.questionIds.length > 0
                    ) {
                      navigate(
                        `/questions?ids=${uploadResult.questionIds.join(",")}`,
                      );
                    } else {
                      navigate("/questions");
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-ink-900 shadow-sm transition-colors hover:bg-slate-50"
                >
                  查看刚刚导入的试题
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (
                      uploadResult.questionIds &&
                      uploadResult.questionIds.length > 0
                    ) {
                      navigate(
                        `/exams/new?questionIds=${uploadResult.questionIds.join(",")}`,
                      );
                    } else {
                      navigate("/exams/new");
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-700"
                >
                  创建考试
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
