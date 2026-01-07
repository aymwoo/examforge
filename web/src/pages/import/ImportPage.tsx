import { useState } from "react";
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

export default function ImportPage() {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: number;
    failed: number;
    errors: { row: number; message: string }[];
  } | null>(null);

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

  return (
    <div className="bg-slatebg text-ink-900 antialiased min-h-screen pt-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
              题目导入
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-700">
              批量导入题目到题库。支持 Excel (.xlsx, .xls) 和 CSV 文件。
            </p>
          </div>
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-ink-900 shadow-sm transition-colors hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            下载模板
          </button>
        </div>

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
                        <span className="font-semibold text-ink-900">题干</span>{" "}
                        - 必填，题目内容
                      </li>
                      <li>
                        <span className="font-semibold text-ink-900">题型</span>{" "}
                        - 可选，支持：单选题、多选题、判断题、填空题、简答题
                      </li>
                      <li>
                        <span className="font-semibold text-ink-900">选项</span>{" "}
                        - 选择题必填，用逗号、分号或竖线分隔
                      </li>
                      <li>
                        <span className="font-semibold text-ink-900">答案</span>{" "}
                        - 必填
                      </li>
                      <li>
                        <span className="font-semibold text-ink-900">解析</span>{" "}
                        - 可选
                      </li>
                      <li>
                        <span className="font-semibold text-ink-900">标签</span>{" "}
                        - 可选，用逗号分隔
                      </li>
                      <li>
                        <span className="font-semibold text-ink-900">难度</span>{" "}
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

        {uploadResult && (
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
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => navigate("/questions")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-ink-900 shadow-sm transition-colors hover:bg-slate-50"
                >
                  去题库查看
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
