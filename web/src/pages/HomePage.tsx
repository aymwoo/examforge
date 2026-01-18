import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  Users,
  FileText,
  RefreshCw,
  Brain,
  BarChart3,
  Upload,
  CheckCircle,
  BookOpen,
} from "lucide-react";
import Button from "@/components/ui/Button";
import api from "@/services/api";

interface StatsCardProps {
  title: string;
  value: string | number;
  percentage?: string;
  icon: React.ReactNode;
  colorClass: "blue" | "green" | "orange" | "purple";
  children?: React.ReactNode;
}

const colorMap = {
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-500",
    border: "border-blue-50/50",
  },
  green: {
    bg: "bg-green-50",
    text: "text-green-500",
    border: "border-green-50/50",
  },
  orange: {
    bg: "bg-orange-50",
    text: "text-orange-500",
    border: "border-orange-50/50",
  },
  purple: {
    bg: "bg-purple-50",
    text: "text-purple-500",
    border: "border-purple-50/50",
  },
};

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  percentage,
  icon,
  colorClass,
  children,
}) => {
  const colors = colorMap[colorClass];

  return (
    <div
      className={`bg-white rounded-2xl p-6 relative overflow-hidden shadow-soft border ${colors.border} hover:shadow-lg transition-all duration-300 h-64 flex flex-col justify-between group`}
    >
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 ${colors.bg} rounded-lg ${colors.text}`}>
            {icon}
          </div>
          <span className="font-semibold text-gray-700 text-lg">{title}</span>
        </div>
        <div className="flex items-end justify-between">
          <div className="text-5xl font-bold text-gray-800 mt-2 ml-1">
            {value}
          </div>
          {percentage && (
            <span className={`${colors.text} text-sm font-bold mb-1`}>
              {percentage}
            </span>
          )}
        </div>
      </div>

      <div className="mt-auto relative w-full z-10">{children}</div>
    </div>
  );
};

interface OngoingExam {
  id: string;
  title: string;
  description?: string;
  startTime: string | null;
  endTime: string | null;
  duration: number;
  totalScore: number;
  status: string;
  submissionCount: number;
  totalStudents: number;
  creator: { id: string; name: string | null; username: string } | null;
}

export default function HomePage() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<{
    ongoingExams: number;
    totalStudents: number;
    totalSubmissions: number;
    totalQuestions: number;
    exams: OngoingExam[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadDashboardData = async () => {
    try {
      const response = await api.get("/api/exams/dashboard");
      setDashboardData(response.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("加载仪表板数据失败:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // 设置自动刷新，每30秒更新一次数据
    const interval = setInterval(() => {
      loadDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

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
        {/* 统计卡片 */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {/* 正在进行 */}
          <StatsCard
            title="正在进行"
            value={dashboardData?.ongoingExams || 0}
            icon={<Clock size={20} />}
            colorClass="blue"
          >
            <svg
              className="w-full h-16 -ml-2"
              viewBox="0 0 200 60"
              fill="none"
              preserveAspectRatio="none"
            >
              <path
                d="M0,50 Q25,45 50,35 T100,25 T150,15 T200,5"
                stroke="#3b82f6"
                strokeWidth="2"
                fill="none"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d="M0,50 Q25,45 50,35 T100,25 T150,15 T200,5 L200,60 L0,60 Z"
                fill="url(#blueGradient)"
                opacity="0.3"
              />
              <defs>
                <linearGradient
                  id="blueGradient"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </StatsCard>

          {/* 参与学生 */}
          <StatsCard
            title="参与学生"
            value={dashboardData?.totalStudents || 0}
            percentage="80%"
            icon={<Users size={20} />}
            colorClass="green"
          >
            <div className="mb-2">
              <div className="w-full h-2 bg-green-100 rounded-full mb-4 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 bg-green-500 w-[80%] rounded-full"></div>
              </div>
              <div className="flex justify-between items-center text-xs font-medium text-gray-400">
                <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center shadow-sm">
                  1
                </div>
                <div className="w-6 h-6 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                  2
                </div>
                <div className="w-6 h-6 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                  3
                </div>
                <div className="w-6 h-6 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                  4
                </div>
                <div className="w-6 h-6 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                  5
                </div>
              </div>
            </div>
          </StatsCard>

          {/* 已提交 */}
          <StatsCard
            title="已提交"
            value={dashboardData?.totalSubmissions || 0}
            icon={<FileText size={20} />}
            colorClass="orange"
          >
            <svg
              className="w-full h-16 -ml-2"
              viewBox="0 0 200 60"
              fill="none"
              preserveAspectRatio="none"
            >
              <path
                d="M0,45 L20,40 L35,48 L50,35 L65,42 L80,30 L95,38 L110,25 L125,32 L140,20 L155,28 L170,15 L185,22 L200,10"
                stroke="#f97316"
                strokeWidth="2"
                fill="none"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d="M0,45 L20,40 L35,48 L50,35 L65,42 L80,30 L95,38 L110,25 L125,32 L140,20 L155,28 L170,15 L185,22 L200,10 L200,60 L0,60 Z"
                fill="url(#orangeGradient)"
                opacity="0.3"
              />
              <defs>
                <linearGradient
                  id="orangeGradient"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </StatsCard>

          {/* 题目数量 */}
          <StatsCard
            title="题目数量"
            value={dashboardData?.totalQuestions || 0}
            percentage="90%"
            icon={<BookOpen size={20} />}
            colorClass="purple"
          >
            <div className="mb-8 w-full">
              <div className="h-4 w-full bg-purple-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{ width: "90%" }}
                ></div>
              </div>
            </div>
            <Button
              onClick={() => navigate("/questions")}
              className="w-full bg-purple-50 hover:bg-purple-100 text-purple-600 border-0 text-sm py-2 font-semibold transition-all duration-300"
            >
              查看题库
            </Button>
          </StatsCard>
        </div>

        {/* 产品特性介绍 */}
        <div className="mt-16 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-ink-900 mb-4">
              为什么选择 ExamForge？
            </h2>
            <p className="text-lg text-ink-600 max-w-2xl mx-auto">
              基于AI的智能考试平台，让考试管理变得简单高效
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2">
            {/* AI智能评分 */}
            <div className="bg-white rounded-3xl p-8 shadow-soft border border-border hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-ink-900 mb-4">
                AI智能评分
              </h3>
              <p className="text-ink-600 mb-4">
                支持主观题智能评分，基于大语言模型提供准确的评分建议，大幅提升评分效率。
              </p>
              <ul className="space-y-2 text-sm text-ink-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  支持简答题、论述题评分
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  多种AI模型可选
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  人工复核确保准确性
                </li>
              </ul>
            </div>

            {/* 批量导入 */}
            <div className="bg-white rounded-3xl p-8 shadow-soft border border-border hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-6">
                <Upload className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-ink-900 mb-4">
                批量导入题目
              </h3>
              <p className="text-ink-600 mb-4">
                支持Excel、PDF等多种格式的题目批量导入，OCR识别让题目录入变得轻松简单。
              </p>
              <ul className="space-y-2 text-sm text-ink-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Excel标准格式导入
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  PDF文档OCR识别
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  图片OCR识别
                </li>
              </ul>
            </div>

            {/* 高级PDF处理 */}
            <div className="bg-white rounded-3xl p-8 shadow-soft border border-border hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-ink-900 mb-4">
                高级PDF处理
              </h3>
              <p className="text-ink-600 mb-4">
                支持PDF页眉页脚裁剪和多页拼接，提升OCR识别精度。
              </p>
              <ul className="space-y-2 text-sm text-ink-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  自动裁剪页眉页脚
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  多页内容拼接
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  高精度OCR识别
                </li>
              </ul>
            </div>

            {/* 数据分析 */}
            <div className="bg-white rounded-3xl p-8 shadow-soft border border-border hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-ink-900 mb-4">
                智能数据分析
              </h3>
              <p className="text-ink-600 mb-4">
                提供丰富的图表分析和统计报告，深入了解学生学习情况和考试效果。
              </p>
              <ul className="space-y-2 text-sm text-ink-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  多维度数据可视化
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  知识点掌握分析
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  学习效果评估
                </li>
              </ul>
            </div>

            {/* 导入历史管理 */}
            <div className="bg-white rounded-3xl p-8 shadow-soft border border-border hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mb-6">
                <RefreshCw className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-ink-900 mb-4">
                导入历史管理
              </h3>
              <p className="text-ink-600 mb-4">
                完整记录每次导入任务的状态和结果，支持基于历史记录重新创建考试。
              </p>
              <ul className="space-y-2 text-sm text-ink-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  任务状态跟踪
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  基于历史创建考试
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  详细处理日志
                </li>
              </ul>
            </div>

            {/* 考试数据导出 */}
            <div className="bg-white rounded-3xl p-8 shadow-soft border border-border hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-ink-900 mb-4">
                考试数据导出
              </h3>
              <p className="text-ink-600 mb-4">
                支持将考试数据导出为多种格式（PDF、Excel、JSON），便于备份和打印。
              </p>
              <ul className="space-y-2 text-sm text-ink-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  多格式导出选项
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  包含AI分析报告
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  实时进度反馈
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* 正在进行的考试列表 */}
        <div className="rounded-3xl border border-border bg-white p-8 shadow-soft">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-ink-900">正在进行的考试</h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <RefreshCw className="h-4 w-4" />
              <span>最后更新: {lastUpdated.toLocaleTimeString("zh-CN")}</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>

          {(dashboardData?.exams?.length || 0) === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                暂无正在进行的考试
              </h3>
              <p className="text-gray-500 mb-6">当前没有正在进行中的考试</p>
              <Button onClick={() => navigate("/exams")}>查看所有考试</Button>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {dashboardData?.exams?.map((exam: OngoingExam) => {
                const submissionRate =
                  exam.totalStudents > 0
                    ? Math.round(
                        (exam.submissionCount / exam.totalStudents) * 100,
                      )
                    : 0;
                const creatorLabel =
                  exam.creator?.name || exam.creator?.username;

                return (
                  <div
                    key={exam.id}
                    className="rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-white p-6 shadow-lg hover:shadow-xl transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xl font-bold text-green-900 truncate">
                          {exam.title}
                        </h3>
                        {exam.description && (
                          <p className="text-green-700 text-sm mt-1 line-clamp-2">
                            {exam.description}
                          </p>
                        )}
                      </div>
                      <div className="rounded-full bg-green-500 px-3 py-1 shrink-0">
                        <span className="text-white text-xs font-medium">
                          进行中
                        </span>
                      </div>
                    </div>

                    <div className="bg-white/80 rounded-lg px-4 py-3 mb-4">
                      <div className="flex items-center gap-2 text-sm text-ink-700 whitespace-nowrap overflow-hidden">
                        {creatorLabel && (
                          <span className="shrink-0">
                            创建者:{" "}
                            <span className="font-semibold">
                              {creatorLabel}
                            </span>
                          </span>
                        )}
                        {creatorLabel && (
                          <span className="text-gray-300">·</span>
                        )}
                        <span className="shrink-0">
                          总分:{" "}
                          <span className="font-semibold text-blue-600">
                            {exam.totalScore}分
                          </span>
                        </span>
                        <span className="text-gray-300">·</span>
                        <span className="shrink-0">
                          时长:{" "}
                          <span className="font-semibold text-purple-600">
                            {exam.duration}分钟
                          </span>
                        </span>
                        <span className="text-gray-300">·</span>
                        <span className="shrink-0">
                          提交率:{" "}
                          <span className="font-semibold text-orange-600">
                            {submissionRate}%
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => navigate(`/exam/${exam.id}`)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                      >
                        进入考试
                      </Button>
                      <Button
                        onClick={() => navigate(`/exams/${exam.id}`)}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        管理考试
                      </Button>
                      <Button
                        onClick={() => navigate(`/exams/${exam.id}/grading`)}
                        variant="outline"
                        className="flex-1 border-green-300 text-green-700 hover:bg-green-50"
                      >
                        实时评分
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
