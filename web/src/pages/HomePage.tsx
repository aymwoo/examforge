import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Users, FileText, Calendar, RefreshCw, Zap, Brain, BarChart3, Shield, Upload, CheckCircle, BookOpen } from "lucide-react";
import Button from "@/components/ui/Button";
import api from "@/services/api";

interface OngoingExam {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalScore: number;
  status: string;
  submissionCount: number;
  totalStudents: number;
}

export default function HomePage() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadDashboardData = async () => {
    try {
      const response = await api.get('/api/exams/dashboard');
      setDashboardData(response.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('加载仪表板数据失败:', error);
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

  const getTimeRemaining = (endTime: string) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return '已结束';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
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
        {/* 统计卡片 */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {/* 正在进行 - 脉冲动画 */}
          <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 p-8 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer">
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
            <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-white/5 rounded-full blur-lg"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="p-4 bg-white/15 rounded-3xl backdrop-blur-md border border-white/20 shadow-lg">
                  <Clock className="h-7 w-7 text-white drop-shadow-sm" />
                </div>
                <div className="text-right">
                  <p className="text-4xl font-black text-white mb-1 tracking-tight">{dashboardData?.ongoingExams || 0}</p>
                  <p className="text-blue-100 text-sm font-semibold tracking-wide">正在进行</p>
                </div>
              </div>
              {/* 考试试卷图标 */}
              <div className="flex justify-center">
                <div className="relative">
                  <svg className="w-16 h-16 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    <circle cx="8" cy="12" r="1" className="text-white/80" />
                    <circle cx="8" cy="15" r="1" className="text-white/80" />
                    <circle cx="8" cy="18" r="1" className="text-white/80" />
                    <rect x="10" y="11.5" width="6" height="1" className="text-white/80" />
                    <rect x="10" y="14.5" width="6" height="1" className="text-white/80" />
                    <rect x="10" y="17.5" width="4" height="1" className="text-white/80" />
                  </svg>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                </div>
              </div>
            </div>
          </div>

          {/* 参与学生 - 用户头像堆叠 */}
          <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 p-8 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer">
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
            <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-white/5 rounded-full blur-lg"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="p-4 bg-white/15 rounded-3xl backdrop-blur-md border border-white/20 shadow-lg">
                  <Users className="h-7 w-7 text-white drop-shadow-sm" />
                </div>
                <div className="text-right">
                  <p className="text-4xl font-black text-white mb-1 tracking-tight">{dashboardData?.totalStudents || 0}</p>
                  <p className="text-emerald-100 text-sm font-semibold tracking-wide">参与学生</p>
                </div>
              </div>
              {/* 用户头像堆叠效果 */}
              <div className="flex justify-center">
                <div className="flex -space-x-2">
                  {[1,2,3,4,5].map((i) => (
                    <div key={i} className={`w-8 h-8 bg-white/30 rounded-full border-2 border-white/50 flex items-center justify-center text-xs text-white font-semibold animate-bounce`} style={{animationDelay: `${i * 0.1}s`}}>
                      {i}
                    </div>
                  ))}
                  <div className="w-8 h-8 bg-white/20 rounded-full border-2 border-white/30 flex items-center justify-center text-xs text-white">
                    +
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 已提交 - 检查标记动画 */}
          <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 p-8 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer">
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
            <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-white/5 rounded-full blur-lg"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="p-4 bg-white/15 rounded-3xl backdrop-blur-md border border-white/20 shadow-lg">
                  <FileText className="h-7 w-7 text-white drop-shadow-sm" />
                </div>
                <div className="text-right">
                  <p className="text-4xl font-black text-white mb-1 tracking-tight">{dashboardData?.totalSubmissions || 0}</p>
                  <p className="text-amber-100 text-sm font-semibold tracking-wide">已提交</p>
                </div>
              </div>
              {/* 检查标记动画 */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-white/40 rounded-full animate-ping"></div>
                </div>
              </div>
            </div>
          </div>

          {/* 题目数量 - 书本堆叠效果 */}
          <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 via-violet-600 to-violet-700 p-8 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer">
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
            <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-white/5 rounded-full blur-lg"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="p-4 bg-white/15 rounded-3xl backdrop-blur-md border border-white/20 shadow-lg">
                  <BookOpen className="h-7 w-7 text-white drop-shadow-sm" />
                </div>
                <div className="text-right">
                  <p className="text-4xl font-black text-white mb-1 tracking-tight">{dashboardData?.totalQuestions || 0}</p>
                  <p className="text-violet-100 text-sm font-semibold tracking-wide">题目数量</p>
                </div>
              </div>
              {/* 书本堆叠效果 */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-10 h-2 bg-white/30 rounded-sm transform rotate-2"></div>
                  <div className="w-10 h-2 bg-white/40 rounded-sm transform -rotate-1 -mt-1"></div>
                  <div className="w-10 h-2 bg-white/50 rounded-sm transform rotate-1 -mt-1"></div>
                  <div className="w-10 h-2 bg-white/60 rounded-sm -mt-1"></div>
                </div>
              </div>
              <Button 
                onClick={() => navigate('/questions')}
                className="mt-4 w-full bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md text-sm py-2 font-semibold transition-all duration-300 hover:scale-105"
              >
                查看题库
              </Button>
            </div>
          </div>
        </div>

        {/* 产品特性介绍 */}
        <div className="mt-16 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-ink-900 mb-4">为什么选择 ExamForge？</h2>
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
              <h3 className="text-xl font-bold text-ink-900 mb-4">AI智能评分</h3>
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
              <h3 className="text-xl font-bold text-ink-900 mb-4">批量导入题目</h3>
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
                  多种题型自动识别
                </li>
              </ul>
            </div>

            {/* 数据分析 */}
            <div className="bg-white rounded-3xl p-8 shadow-soft border border-border hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-ink-900 mb-4">智能数据分析</h3>
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

            {/* 易于使用 */}
            <div className="bg-white rounded-3xl p-8 shadow-soft border border-border hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl flex items-center justify-center mb-6">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-ink-900 mb-4">易于使用</h3>
              <p className="text-ink-600 mb-4">
                直观的用户界面，简单的操作流程，无需复杂培训即可快速上手使用。
              </p>
              <ul className="space-y-2 text-sm text-ink-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  现代化界面设计
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  一键式操作
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  完整使用文档
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
              <span>最后更新: {lastUpdated.toLocaleTimeString('zh-CN')}</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          
          {(dashboardData?.exams?.length || 0) === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无正在进行的考试</h3>
              <p className="text-gray-500 mb-6">当前没有正在进行中的考试</p>
              <Button onClick={() => navigate('/exams')}>
                查看所有考试
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {dashboardData?.exams?.map((exam: any) => (
                <div 
                  key={exam.id} 
                  className="rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-white p-6 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-green-900 mb-2">{exam.title}</h3>
                      {exam.description && (
                        <p className="text-green-700 text-sm mb-3">{exam.description}</p>
                      )}
                    </div>
                    <div className="rounded-full bg-green-500 px-3 py-1">
                      <span className="text-white text-xs font-medium">进行中</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">剩余时间</p>
                      <p className="font-semibold text-red-600">{getTimeRemaining(exam.endTime)}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">总分</p>
                      <p className="font-semibold text-blue-600">{exam.totalScore}分</p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">时长</p>
                      <p className="font-semibold text-purple-600">{exam.duration}分钟</p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">提交率</p>
                      <p className="font-semibold text-orange-600">
                        {exam.totalStudents > 0 
                          ? Math.round((exam.submissionCount / exam.totalStudents) * 100)
                          : 0}%
                      </p>
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
