import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  BarChart3,
  TrendingUp,
  Users,
  Target,
  FileText,
  Sparkles,
  Clock,
  Eye,
  RefreshCw,
  X,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import Button from "@/components/ui/Button";
import ExamLayout from "@/components/ExamLayout";
import { getExamById, type Exam } from "@/services/exams";
import api from "@/services/api";

interface SavedAIReport {
  examId: string;
  examTitle: string;
  report: string | null;
  status: string | null;
  model: string | null;
  generatedAt: string | null;
  hasReport: boolean;
}

import { useToast } from "@/components/ui/Toast";

export default function ExamAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [exam, setExam] = useState<Exam | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiReport, setAiReport] = useState<string>("");
  const [generatingReport, setGeneratingReport] = useState(false);
  const [savedReport, setSavedReport] = useState<SavedAIReport | null>(null);
  const [loadingSavedReport, setLoadingSavedReport] = useState(false);
  const [showAiReportModal, setShowAiReportModal] = useState<boolean>(false);
  const [heatmapMode, setHeatmapMode] = useState<"mastery" | "matrix">(
    "mastery",
  );

  const getQuestionTypeName = (type: string) => {
    const typeMap: Record<string, string> = {
      SINGLE_CHOICE: "单选题",
      MULTIPLE_CHOICE: "多选题",
      TRUE_FALSE: "判断题",
      FILL_BLANK: "填空题",
      SHORT_ANSWER: "简答题",
      ESSAY: "论述题",
    };
    return typeMap[type] || type;
  };

  // 图表数据处理
  const getScoreDistributionData = () => {
    const scores: number[] = Array.isArray(analytics?.scores)
      ? analytics.scores
      : [];
    if (scores.length === 0) return [];

    const ranges = [
      { name: "0-20", min: 0, max: 20, count: 0 },
      { name: "21-40", min: 21, max: 40, count: 0 },
      { name: "41-60", min: 41, max: 60, count: 0 },
      { name: "61-80", min: 61, max: 80, count: 0 },
      { name: "81-100", min: 81, max: 100, count: 0 },
    ];

    scores.forEach((score) => {
      const bucket = ranges.find((r) => score >= r.min && score <= r.max);
      if (bucket) bucket.count += 1;
    });

    return ranges;
  };

  const getQuestionTypeData = () => {
    if (!analytics?.questionStats) return [];
    const typeCount: Record<string, number> = {};

    analytics.questionStats.forEach((q: any) => {
      const typeName = getQuestionTypeName(q.type);
      typeCount[typeName] = (typeCount[typeName] || 0) + 1;
    });

    return Object.entries(typeCount).map(([name, value]) => ({ name, value }));
  };

  const getDifficultyData = () => {
    if (!analytics?.questionStats) return [];
    const difficultyCount: Record<string, number> = {};

    analytics.questionStats.forEach((q: any) => {
      const difficulty = q.difficulty || "未设置";
      difficultyCount[difficulty] = (difficultyCount[difficulty] || 0) + 1;
    });

    return Object.entries(difficultyCount).map(([name, value]) => ({
      name,
      value,
    }));
  };

  const getKnowledgePointRadarData = () => {
    if (!analytics?.knowledgePointStats) return [];

    return analytics.knowledgePointStats.slice(0, 6).map((kp: any) => ({
      subject: kp.knowledgePoint || "未分类",
      score: kp.averageScore || 0,
      mastery: kp.masteryRate || 0,
    }));
  };

  // 箱线图数据 - 各题目得分分布
  const getBoxPlotData = () => {
    // Current backend analytics does not provide per-question distribution yet.
    // Fallback: render a minimal box based on question averageScore.
    if (!analytics?.questionStats) return [];

    return analytics.questionStats.slice(0, 8).map((q: any, index: number) => {
      const avgScore = q.averageScore || 0;
      return {
        name: `第${index + 1}题`,
        min: 0,
        q1: Math.max(0, avgScore * 0.5),
        median: avgScore,
        q3: Math.min(100, avgScore * 1.5),
        max: 100,
        outliers: [],
      };
    });
  };

  // 散点图数据 - 题目难度与正确率关系
  const getScatterData = () => {
    if (!analytics?.questionStats) return [];

    return analytics.questionStats.map((q: any, index: number) => ({
      x: q.difficulty || 0,
      y: q.correctRate || 0,
      name: `第${index + 1}题`,
      type: getQuestionTypeName(q.type),
    }));
  };

  // 直方图数据 - 详细分数分布
  const getHistogramData = () => {
    const scores: number[] = Array.isArray(analytics?.scores)
      ? analytics.scores
      : [];
    if (scores.length === 0) return [];

    const data: {
      score: string;
      count: number;
      percentage: string | number;
    }[] = [];
    const totalStudents = scores.length;

    for (let start = 0; start <= 100; start += 5) {
      const end = start + 4;
      const count = scores.filter((s) => s >= start && s <= end).length;
      data.push({
        score: `${start}-${end}`,
        count,
        percentage: ((count / totalStudents) * 100).toFixed(1),
      });
    }

    return data;
  };

  // 热力图数据 - 学生答题情况矩阵
  const getHeatmapMasteryData = () => {
    const heatmap = analytics?.heatmap;
    if (!heatmap?.questions || !heatmap?.mastery) return [];

    return heatmap.questions.map((question: any, index: number) => {
      const mastery = heatmap.mastery?.[index] || {};
      const masteryRate = mastery?.masteryRate ?? 0;
      const averageScore = mastery?.averageScore ?? 0;
      const maxScore = mastery?.maxScore ?? question.score ?? 0;

      return {
        question: `第${index + 1}题`,
        masteryRate: Math.round(masteryRate),
        averageScore,
        maxScore,
        order: question.order ?? index + 1,
      };
    });
  };

  const getHeatmapMatrixData = () => {
    const heatmap = analytics?.heatmap;
    if (!heatmap?.students || !heatmap?.questions || !heatmap?.values)
      return [];

    const data: {
      student: string;
      question: string;
      score: number;
      rate: number;
      maxScore: number;
      x: number;
      y: number;
    }[] = [];

    heatmap.students.forEach((student: any, studentIndex: number) => {
      heatmap.questions.forEach((question: any, questionIndex: number) => {
        const score = heatmap.values?.[studentIndex]?.[questionIndex] ?? 0;
        const maxScore = question?.score ?? 0;
        const rate = maxScore > 0 ? (score / maxScore) * 100 : 0;
        data.push({
          student: student.name || student.id,
          question: `第${questionIndex + 1}题`,
          score: Math.round(score),
          rate: Math.round(rate),
          maxScore,
          x: questionIndex,
          y: studentIndex,
        });
      });
    });

    return data;
  };

  // 自定义箱线图组件
  const BoxPlot = ({ data }: { data: any[] }) => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip
          formatter={(value, name: any) => {
            const labels: Record<string, string> = {
              min: "最小值",
              q1: "第一四分位数",
              median: "中位数",
              q3: "第三四分位数",
              max: "最大值",
            };
            const key = String(name);
            return [value, labels[key] || key];
          }}
        />
        <Bar dataKey="min" fill="#e5e7eb" />
        <Bar dataKey="q1" fill="#9ca3af" />
        <Bar dataKey="median" fill="#374151" />
        <Bar dataKey="q3" fill="#6b7280" />
        <Bar dataKey="max" fill="#d1d5db" />
      </BarChart>
    </ResponsiveContainer>
  );

  // 热力图组件
  const HeatmapMastery = ({ data }: { data: any[] }) => {
    const questions = data.map((d) => d.question);
    const getColor = (value: number) => {
      const clamped = Math.max(0, Math.min(100, value));
      const intensity = clamped / 100;
      const hue = 10 - 10 * intensity;
      const lightness = 95 - 45 * intensity;
      return `hsl(${hue}, 80%, ${lightness}%)`;
    };

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="grid grid-cols-11 gap-1 text-xs mb-1">
            <div className="font-semibold p-2 text-center">题号</div>
            {questions.map((q) => (
              <div key={q} className="text-center font-semibold p-2">
                {q}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-11 gap-1 text-xs">
            <div className="font-semibold p-2 text-right">掌握度</div>
            {data.map((item) => (
              <div
                key={item.question}
                className="aspect-square flex flex-col items-center justify-center text-[11px] font-semibold rounded"
                style={{
                  backgroundColor: getColor(item.masteryRate),
                  color: item.masteryRate > 55 ? "white" : "#1f2937",
                }}
                title={`${item.question} 掌握度 ${item.masteryRate}% (均分 ${item.averageScore.toFixed(
                  1,
                )}/${item.maxScore})`}
              >
                <span>{item.masteryRate}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const HeatmapMatrix = ({ data }: { data: any[] }) => {
    const students = [...new Set(data.map((d) => d.student))];
    const questions = [...new Set(data.map((d) => d.question))];

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Header row */}
          <div className="grid grid-cols-11 gap-1 text-xs mb-1">
            <div className="font-semibold p-2 text-center">学生</div>
            {questions.map((q) => (
              <div key={q} className="text-center font-semibold p-2">
                {q}
              </div>
            ))}
          </div>

          {/* Student rows */}
          {students.map((student) => (
            <div key={student} className="grid grid-cols-11 gap-1 text-xs">
              <div className="font-semibold p-2 text-right">{student}</div>
              {questions.map((question) => {
                const item = data.find(
                  (d) => d.student === student && d.question === question,
                );
                const score = item?.score || 0;
                const rate = item?.rate ?? 0;
                const intensity = rate / 100;
                return (
                  <div
                    key={`${student}-${question}`}
                    className="aspect-square flex flex-col items-center justify-center text-white text-[11px] font-semibold rounded"
                    style={{
                      backgroundColor: `rgba(59, 130, 246, ${intensity})`,
                      color: intensity > 0.5 ? "white" : "black",
                    }}
                    title={`${student} - ${question}: ${score}分 (${rate}%)`}
                  >
                    <span>{rate}%</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const COLORS = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff7300",
    "#8dd1e1",
    "#d084d0",
  ];

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const [examData, analyticsData, savedReportData] = await Promise.all([
        getExamById(id),
        api.get(`/api/exams/${id}/analytics`),
        api.get(`/api/exams/${id}/ai-report`).catch(() => ({ data: null })),
      ]);

      setExam(examData);
      setAnalytics(analyticsData.data);

      // 加载已保存的报告
      if (savedReportData.data && savedReportData.data.hasReport) {
        setSavedReport(savedReportData.data);
        setAiReport(savedReportData.data.report || "");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "加载失败");
    } finally {
      setLoading(false);
    }
  };

  // 加载已保存的报告
  const loadSavedReport = async () => {
    if (!id) return;
    setLoadingSavedReport(true);
    try {
      const response = await api.get(`/api/exams/${id}/ai-report`);
      if (response.data && response.data.hasReport) {
        setSavedReport(response.data);
        setAiReport(response.data.report || "");
      }
    } catch (err) {
      const error = err as any;
      console.error("加载保存的报告失败:", error);
      // 添加更详细的错误信息
      if (error?.response) {
        console.error(
          "Response error:",
          error.response.status,
          error.response.data,
        );
      } else if (error?.request) {
        console.error("Request error:", error.request);
      } else {
        console.error("General error:", error?.message);
      }
    } finally {
      setLoadingSavedReport(false);
    }
  };

  const generateAIReport = async () => {
    if (!analytics || !exam) return;

    // 先获取当前使用的provider信息
    try {
      const providerResponse = await api.get(
        "/api/settings/active-ai-provider",
      );
      const providerInfo = providerResponse.data?.provider;
      if (providerInfo) {
        // 格式化provider名称使其更易读
        let readableProvider = providerInfo.name || providerInfo.provider;

        // 如果是系统预设provider，显示更友好的名称
        if (readableProvider === "openai") {
          readableProvider = "OpenAI";
        } else if (readableProvider === "qwen") {
          readableProvider = "通义千问 (Qwen)";
        } else if (readableProvider === "custom" && providerInfo.name) {
          readableProvider = providerInfo.name; // 使用自定义provider的名称
        } else if (!providerInfo.id && readableProvider) {
          // 如果没有ID但有provider名称，显示友好名称
          readableProvider =
            readableProvider.charAt(0).toUpperCase() +
            readableProvider.slice(1);
        }

        // 准备额外信息
        const providerType = providerInfo.id ? "自定义" : "系统预设";
        const providerDetails = providerInfo.id
          ? `\n创建者: ${providerInfo.createdBy || "Unknown"}\n创建时间: ${providerInfo.createdAt ? new Date(providerInfo.createdAt).toLocaleString("zh-CN") : "N/A"}`
          : "";

        toast.default(
          `当前使用的AI Provider: ${readableProvider}\n模型: ${providerInfo.model || "default"}\n类型: ${providerType}${providerDetails}`,
        );
      } else {
        toast.default("正在使用默认AI Provider配置生成报告...");
      }
    } catch (error) {
      console.warn("无法获取当前AI Provider信息:", error);
      toast.default("正在使用默认AI Provider配置生成报告...");
    }

    setGeneratingReport(true);
    setAiReport(""); // 清空之前的报告

    try {
      const token = localStorage.getItem("token");
      const eventSource = new EventSource(
        `/api/exams/${id}/ai-report-stream?token=${token}`,
      );

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case "start":
            case "progress":
              console.log(data.message);
              break;
            case "stream":
              setAiReport((prev) => prev + data.content);
              break;
            case "complete":
              setAiReport(data.report);
              // 更新 savedReport 状态
              setSavedReport({
                examId: id || "",
                examTitle: exam?.title || "",
                report: data.report,
                status: "COMPLETED",
                model: data.model || null, // 使用从后端返回的模型信息
                generatedAt: data.generatedAt || new Date().toISOString(),
                hasReport: true,
              });
              eventSource.close();
              setGeneratingReport(false);
              toast.success("AI分析报告生成完成");
              break;
            case "error":
              eventSource.close();
              setGeneratingReport(false);
              if (data.message.includes("未找到可用的AI Provider")) {
                if (
                  confirm(
                    "未找到可用的AI Provider配置。是否前往设置页面配置AI服务？",
                  )
                ) {
                  navigate("/settings");
                }
              } else {
                toast.error(`生成AI报告失败：${data.message}`);
              }
              break;
          }
        } catch (error) {
          console.error("解析SSE数据失败:", error);
        }
      };

      eventSource.onerror = (error) => {
        console.error("SSE连接错误:", error);
        eventSource.close();
        setGeneratingReport(false);
        toast.error("生成AI报告时连接中断，请重试");
      };
    } catch (error: any) {
      console.error("生成AI报告失败:", error);
      setGeneratingReport(false);
      toast.error("启动AI报告生成失败，请重试");
    }
  };

  // 格式化生成时间
  const formatGeneratedTime = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="bg-slatebg text-ink-900 antialiased min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600 mx-auto mb-4"></div>
          <p className="text-ink-700">加载统计分析中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slatebg text-ink-900 antialiased min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => navigate(-1)}>返回</Button>
        </div>
      </div>
    );
  }

  if (!exam) return null;

  return (
    <ExamLayout activeTab="analytics">
      <div className="space-y-8">
        {analytics ? (
          <div className="space-y-8">
            {/* AI分析报告按钮区域 */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {savedReport?.hasReport && !loadingSavedReport && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-lg">
                    <Clock className="h-4 w-4 text-purple-500" />
                    <span>
                      报告生成于: {formatGeneratedTime(savedReport.generatedAt)}
                    </span>
                    {savedReport.model && (
                      <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                        {savedReport.model}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                {savedReport?.hasReport && !aiReport && (
                  <Button
                    onClick={loadSavedReport}
                    disabled={loadingSavedReport}
                    variant="outline"
                    className="flex items-center gap-2 text-purple-600 border-purple-200 hover:bg-purple-50"
                  >
                    <Eye className="h-4 w-4" />
                    {loadingSavedReport ? "加载中..." : "查看已保存报告"}
                  </Button>
                )}
                {aiReport && (
                  <Button
                    onClick={() => setShowAiReportModal(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3"
                  >
                    <FileText className="h-4 w-4" />
                    查看AI智能分析报告
                  </Button>
                )}
                <Button
                  onClick={generateAIReport}
                  disabled={generatingReport}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3"
                >
                  {savedReport?.hasReport ? (
                    <RefreshCw className="h-4 w-4" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {generatingReport
                    ? "生成中..."
                    : savedReport?.hasReport
                      ? "重新生成"
                      : "生成AI分析报告"}
                </Button>
              </div>
            </div>

            {/* 概览统计卡片 */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="rounded-full bg-blue-500 p-2">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-blue-900">平均分</h3>
                </div>
                <div className="text-3xl font-bold text-blue-600">
                  {analytics.scoreStats?.average?.toFixed(1) || 0}
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  满分 {exam.totalScore} 分
                </p>
              </div>

              <div className="rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-white p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="rounded-full bg-green-500 p-2">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-green-900">及格率</h3>
                </div>
                <div className="text-3xl font-bold text-green-600">
                  {analytics.scoreStats?.passRate?.toFixed(1) || 0}%
                </div>
                <p className="text-sm text-green-700 mt-1">60分及格线</p>
              </div>

              <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="rounded-full bg-purple-500 p-2">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-purple-900">参与率</h3>
                </div>
                <div className="text-3xl font-bold text-purple-600">
                  {analytics.participationStats?.participationRate?.toFixed(
                    1,
                  ) || 0}
                  %
                </div>
                <p className="text-sm text-purple-700 mt-1">
                  {analytics.participationStats?.submittedCount || 0}/
                  {analytics.participationStats?.totalStudents || 0} 人提交
                </p>
              </div>

              <div className="rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="rounded-full bg-orange-500 p-2">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-orange-900">分数区间</h3>
                </div>
                <div className="text-lg font-bold text-orange-600">
                  {analytics.scoreStats?.lowest || 0} -{" "}
                  {analytics.scoreStats?.highest || 0}
                </div>
                <p className="text-sm text-orange-700 mt-1">最低分 - 最高分</p>
              </div>
            </div>

            {/* 图表分析区域 */}
            <div className="grid gap-8 lg:grid-cols-2">
              {/* 分数分布图 */}
              <div className="rounded-3xl border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white p-8 shadow-lg">
                <h3 className="text-xl font-bold text-blue-900 mb-6">
                  分数分布
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getScoreDistributionData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* 题目类型分布 */}
              <div className="rounded-3xl border-2 border-green-100 bg-gradient-to-br from-green-50 to-white p-8 shadow-lg">
                <h3 className="text-xl font-bold text-green-900 mb-6">
                  题目类型分布
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getQuestionTypeData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: any) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getQuestionTypeData().map((_entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* 题目难度分布 */}
              <div className="rounded-3xl border-2 border-orange-100 bg-gradient-to-br from-orange-50 to-white p-8 shadow-lg">
                <h3 className="text-xl font-bold text-orange-900 mb-6">
                  题目难度分布
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getDifficultyData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#f97316" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* 知识点掌握雷达图 */}
              <div className="rounded-3xl border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-white p-8 shadow-lg">
                <h3 className="text-xl font-bold text-purple-900 mb-6">
                  知识点掌握情况
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={getKnowledgePointRadarData()}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar
                      name="掌握率"
                      dataKey="mastery"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.3}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 高级图表分析区域 */}
            <div className="space-y-8">
              <h2 className="text-2xl font-bold text-gray-900">高级数据分析</h2>

              <div className="grid gap-8 lg:grid-cols-2">
                {/* 箱线图 - 各题目得分分布 */}
                <div className="rounded-3xl border-2 border-cyan-100 bg-gradient-to-br from-cyan-50 to-white p-8 shadow-lg">
                  <h3 className="text-xl font-bold text-cyan-900 mb-6">
                    题目得分分布箱线图
                  </h3>
                  <BoxPlot data={getBoxPlotData()} />
                  <p className="text-sm text-cyan-700 mt-2">
                    显示每道题目的得分分布情况，包括最值、四分位数等统计信息
                  </p>
                </div>

                {/* 散点图 - 难度与正确率关系 */}
                <div className="rounded-3xl border-2 border-pink-100 bg-gradient-to-br from-pink-50 to-white p-8 shadow-lg">
                  <h3 className="text-xl font-bold text-pink-900 mb-6">
                    题目难度与正确率关系
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={getScatterData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="x"
                        label={{
                          value: "难度等级",
                          position: "insideBottom",
                          offset: -5,
                        }}
                      />
                      <YAxis
                        label={{
                          value: "正确率(%)",
                          angle: -90,
                          position: "insideLeft",
                        }}
                      />
                      <Tooltip
                        formatter={(value, name) => [
                          name === "y" ? `${value}%` : value,
                          name === "y" ? "正确率" : "难度",
                        ]}
                        labelFormatter={(label, payload) =>
                          payload?.[0]?.payload?.name || `题目 ${label}`
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="y"
                        stroke="#ec4899"
                        strokeWidth={2}
                        dot={{ fill: "#ec4899", r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <p className="text-sm text-pink-700 mt-2">
                    分析题目难度设置与学生答题正确率的相关性
                  </p>
                </div>
              </div>

              <div className="grid gap-8 lg:grid-cols-2">
                {/* 直方图 - 详细分数分布 */}
                <div className="rounded-3xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-8 shadow-lg">
                  <h3 className="text-xl font-bold text-indigo-900 mb-6">
                    详细分数分布直方图
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getHistogramData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="score" />
                      <YAxis />
                      <Tooltip
                        formatter={(value, name) => [
                          name === "count" ? `${value}人` : `${value}%`,
                          name === "count" ? "人数" : "占比",
                        ]}
                      />
                      <Bar dataKey="count" fill="#6366f1" />
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-sm text-indigo-700 mt-2">
                    更细粒度的分数分布，每5分为一个区间
                  </p>
                </div>

                {/* 知识点掌握趋势 */}
                <div className="rounded-3xl border-2 border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-8 shadow-lg">
                  <h3 className="text-xl font-bold text-emerald-900 mb-6">
                    知识点掌握趋势
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={analytics?.knowledgePointStats?.slice(0, 8) || []}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="knowledgePoint" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="masteryRate"
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={{ fill: "#10b981", r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="averageScore"
                        stroke="#059669"
                        strokeWidth={2}
                        dot={{ fill: "#059669", r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <p className="text-sm text-emerald-700 mt-2">
                    展示各知识点的掌握率和平均得分趋势
                  </p>
                </div>
              </div>

              {/* 热力图 - 题目掌握度 */}
              <div className="rounded-3xl border-2 border-amber-100 bg-gradient-to-br from-amber-50 to-white p-8 shadow-lg">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
                  <h3 className="text-xl font-bold text-amber-900">
                    试题掌握度热力图
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-amber-800">视图</span>
                    <div className="inline-flex rounded-full border border-amber-200 bg-white p-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setHeatmapMode("mastery")}
                        className={`px-3 py-1 rounded-full transition ${
                          heatmapMode === "mastery"
                            ? "bg-amber-500 text-white"
                            : "text-amber-800"
                        }`}
                      >
                        按题掌握度
                      </button>
                      <button
                        type="button"
                        onClick={() => setHeatmapMode("matrix")}
                        className={`px-3 py-1 rounded-full transition ${
                          heatmapMode === "matrix"
                            ? "bg-amber-500 text-white"
                            : "text-amber-800"
                        }`}
                      >
                        学生矩阵
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-amber-700 mb-6">
                  {heatmapMode === "mastery"
                    ? "题目重叠汇总学生答题情况，越热表示掌握越好，越冷表示掌握越差。"
                    : "展示每位学生在每道题的得分，颜色越深表示得分越高。"}
                </p>
                {heatmapMode === "mastery" ? (
                  <HeatmapMastery data={getHeatmapMasteryData()} />
                ) : (
                  <HeatmapMatrix data={getHeatmapMatrixData()} />
                )}
              </div>
            </div>

            {/* 详细统计 */}
            <div className="grid gap-8 lg:grid-cols-2">
              {/* 题目分析 */}
              <div className="rounded-3xl border-2 border-green-100 bg-gradient-to-br from-green-50 to-white p-8 shadow-lg">
                <div className="mb-6 flex items-center gap-3">
                  <div className="rounded-full bg-green-500 p-2">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-green-900">题目分析</h2>
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {analytics.questionStats?.map(
                    (question: any, index: number) => (
                      <div
                        key={question.questionId}
                        className="rounded-xl bg-white p-4 border border-green-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span className="font-medium text-green-900">
                              第 {index + 1} 题
                            </span>
                            <span className="ml-2 text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                              {getQuestionTypeName(question.type)}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-600">难度</div>
                            <div className="font-semibold">
                              {question.difficulty || "N/A"}
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="text-center bg-green-50 rounded-lg p-3">
                            <div className="text-lg font-bold text-green-600">
                              {question.correctRate?.toFixed(1) || 0}%
                            </div>
                            <div className="text-xs text-green-700">正确率</div>
                          </div>
                          <div className="text-center bg-blue-50 rounded-lg p-3">
                            <div className="text-lg font-bold text-blue-600">
                              {question.averageScore?.toFixed(1) || 0}
                            </div>
                            <div className="text-xs text-blue-700">
                              平均得分
                            </div>
                          </div>
                        </div>
                        {question.knowledgePoint && (
                          <div className="mt-2 text-xs text-gray-600">
                            知识点: {question.knowledgePoint}
                          </div>
                        )}
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* 知识点分析 */}
              <div className="rounded-3xl border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-white p-8 shadow-lg">
                <div className="mb-6 flex items-center gap-3">
                  <div className="rounded-full bg-purple-500 p-2">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-purple-900">
                    知识点分析
                  </h2>
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {analytics.knowledgePointStats?.map((kp: any) => (
                    <div
                      key={kp.knowledgePoint}
                      className="rounded-xl bg-white p-4 border border-purple-200"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="font-medium text-purple-900">
                            {kp.knowledgePoint || "未分类"}
                          </span>
                          <span className="ml-2 text-sm text-gray-600">
                            {kp.questionCount} 道题
                          </span>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="text-center bg-purple-50 rounded-lg p-3">
                          <div className="text-lg font-bold text-purple-600">
                            {kp.averageScore?.toFixed(1) || 0}
                          </div>
                          <div className="text-xs text-purple-700">
                            平均得分
                          </div>
                        </div>
                        <div className="text-center bg-green-50 rounded-lg p-3">
                          <div className="text-lg font-bold text-green-600">
                            {kp.masteryRate?.toFixed(1) || 0}%
                          </div>
                          <div className="text-xs text-green-700">掌握率</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 参与情况详细统计 */}
            <div className="rounded-3xl border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white p-8 shadow-lg">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-full bg-blue-500 p-2">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-blue-900">
                  参与情况统计
                </h2>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="text-center bg-white rounded-xl p-6 border border-blue-200">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {analytics.participationStats?.totalStudents || 0}
                  </div>
                  <div className="text-sm text-blue-700">总学生数</div>
                </div>
                <div className="text-center bg-white rounded-xl p-6 border border-green-200">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {analytics.participationStats?.submittedCount || 0}
                  </div>
                  <div className="text-sm text-green-700">已提交</div>
                </div>
                <div className="text-center bg-white rounded-xl p-6 border border-gray-200">
                  <div className="text-3xl font-bold text-gray-600 mb-2">
                    {analytics.participationStats?.notSubmittedCount || 0}
                  </div>
                  <div className="text-sm text-gray-700">未提交</div>
                </div>
                <div className="text-center bg-white rounded-xl p-6 border border-purple-200">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {analytics.participationStats?.participationRate?.toFixed(
                      1,
                    ) || 0}
                    %
                  </div>
                  <div className="text-sm text-purple-700">参与率</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-slate-50 p-8 text-center">
            <p className="text-ink-700">暂无统计数据，请确保有学生提交了考试</p>
          </div>
        )}

        {/* AI智能分析报告模态框 */}
        {aiReport && showAiReportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div
              className="bg-white rounded-xl w-full max-w-4xl xl:max-w-5xl max-h-[90vh] overflow-y-auto relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center rounded-t-xl">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-purple-500 p-2">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-purple-900">
                    AI智能分析报告
                  </h2>
                </div>
                <button
                  onClick={() => setShowAiReportModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="p-6">
                {savedReport?.generatedAt && (
                  <div className="flex items-center gap-2 text-sm text-purple-600 mb-4">
                    <Clock className="h-4 w-4" />
                    <span>
                      生成时间: {formatGeneratedTime(savedReport.generatedAt)}
                    </span>
                    {savedReport.model && (
                      <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                        {savedReport.model}
                      </span>
                    )}
                  </div>
                )}
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                    {aiReport}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ExamLayout>
  );
}
