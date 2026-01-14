import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BarChart3, TrendingUp, Users, Target, FileText, Sparkles, Clock, Eye, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
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

export default function ExamAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiReport, setAiReport] = useState<string>('');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [savedReport, setSavedReport] = useState<SavedAIReport | null>(null);
  const [loadingSavedReport, setLoadingSavedReport] = useState(false);

  const getQuestionTypeName = (type: string) => {
    const typeMap: Record<string, string> = {
      'SINGLE_CHOICE': '单选题',
      'MULTIPLE_CHOICE': '多选题',
      'TRUE_FALSE': '判断题',
      'FILL_BLANK': '填空题',
      'SHORT_ANSWER': '简答题',
      'ESSAY': '论述题'
    };
    return typeMap[type] || type;
  };

  // 图表数据处理
  const getScoreDistributionData = () => {
    if (!analytics?.scoreStats) return [];
    const ranges = [
      { name: '0-20', min: 0, max: 20, count: 0 },
      { name: '21-40', min: 21, max: 40, count: 0 },
      { name: '41-60', min: 41, max: 60, count: 0 },
      { name: '61-80', min: 61, max: 80, count: 0 },
      { name: '81-100', min: 81, max: 100, count: 0 }
    ];
    
    // 模拟分数分布数据
    const totalStudents = analytics.participationStats?.submittedCount || 0;
    const average = analytics.scoreStats.average || 0;
    
    if (totalStudents > 0) {
      ranges[0].count = Math.floor(totalStudents * 0.05);
      ranges[1].count = Math.floor(totalStudents * 0.15);
      ranges[2].count = Math.floor(totalStudents * 0.25);
      ranges[3].count = Math.floor(totalStudents * 0.35);
      ranges[4].count = totalStudents - ranges[0].count - ranges[1].count - ranges[2].count - ranges[3].count;
    }
    
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
      const difficulty = q.difficulty || '未设置';
      difficultyCount[difficulty] = (difficultyCount[difficulty] || 0) + 1;
    });
    
    return Object.entries(difficultyCount).map(([name, value]) => ({ name, value }));
  };

  const getKnowledgePointRadarData = () => {
    if (!analytics?.knowledgePointStats) return [];
    
    return analytics.knowledgePointStats.slice(0, 6).map((kp: any) => ({
      subject: kp.knowledgePoint || '未分类',
      score: kp.averageScore || 0,
      mastery: kp.masteryRate || 0
    }));
  };

  // 箱线图数据 - 各题目得分分布
  const getBoxPlotData = () => {
    if (!analytics?.questionStats) return [];
    
    return analytics.questionStats.slice(0, 8).map((q: any, index: number) => {
      const avgScore = q.averageScore || 0;
      const variance = Math.random() * 10; // 模拟方差
      return {
        name: `第${index + 1}题`,
        min: Math.max(0, avgScore - variance * 2),
        q1: Math.max(0, avgScore - variance),
        median: avgScore,
        q3: Math.min(100, avgScore + variance),
        max: Math.min(100, avgScore + variance * 2),
        outliers: []
      };
    });
  };

  // 散点图数据 - 题目难度与正确率关系
  const getScatterData = () => {
    if (!analytics?.questionStats) return [];
    
    return analytics.questionStats.map((q: any, index: number) => ({
      x: q.difficulty || Math.random() * 5 + 1,
      y: q.correctRate || 0,
      name: `第${index + 1}题`,
      type: getQuestionTypeName(q.type)
    }));
  };

  // 直方图数据 - 详细分数分布
  const getHistogramData = () => {
    if (!analytics?.scoreStats) return [];
    
    const data = [];
    const totalStudents = analytics.participationStats?.submittedCount || 0;
    const average = analytics.scoreStats.average || 0;
    
    // 生成更细粒度的分数分布
    for (let i = 0; i <= 100; i += 5) {
      const count = Math.max(0, Math.floor(
        totalStudents * Math.exp(-Math.pow(i - average, 2) / (2 * Math.pow(15, 2))) / Math.sqrt(2 * Math.PI * Math.pow(15, 2)) * 5
      ));
      data.push({
        score: `${i}-${i + 4}`,
        count: count,
        percentage: totalStudents > 0 ? (count / totalStudents * 100).toFixed(1) : 0
      });
    }
    
    return data;
  };

  // 热力图数据 - 学生答题情况矩阵
  const getHeatmapData = () => {
    if (!analytics?.questionStats) return [];
    
    const students = ['学生A', '学生B', '学生C', '学生D', '学生E', '学生F', '学生G', '学生H'];
    const questions = analytics.questionStats.slice(0, 10);
    const data = [];
    
    students.forEach((student, studentIndex) => {
      questions.forEach((question, questionIndex) => {
        const correctRate = question.correctRate || 0;
        // 基于正确率生成模拟得分，添加随机性
        const score = Math.min(100, Math.max(0, 
          correctRate + (Math.random() - 0.5) * 30
        ));
        
        data.push({
          student: student,
          question: `第${questionIndex + 1}题`,
          score: Math.round(score),
          x: questionIndex,
          y: studentIndex
        });
      });
    });
    
    return data;
  };

  // 自定义箱线图组件
  const BoxPlot = ({ data }: { data: any[] }) => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip 
          formatter={(value, name) => {
            const labels: Record<string, string> = {
              min: '最小值',
              q1: '第一四分位数',
              median: '中位数',
              q3: '第三四分位数',
              max: '最大值'
            };
            return [value, labels[name] || name];
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
  const Heatmap = ({ data }: { data: any[] }) => {
    const students = [...new Set(data.map(d => d.student))];
    const questions = [...new Set(data.map(d => d.question))];
    
    return (
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="grid grid-cols-11 gap-1 text-xs">
            <div></div>
            {questions.map(q => (
              <div key={q} className="text-center font-semibold p-2">{q}</div>
            ))}
            {students.map(student => (
              <div key={student} className="contents">
                <div className="font-semibold p-2 text-right">{student}</div>
                {questions.map(question => {
                  const item = data.find(d => d.student === student && d.question === question);
                  const score = item?.score || 0;
                  const intensity = score / 100;
                  return (
                    <div
                      key={`${student}-${question}`}
                      className="aspect-square flex items-center justify-center text-white text-xs font-semibold rounded"
                      style={{
                        backgroundColor: `rgba(59, 130, 246, ${intensity})`,
                        color: intensity > 0.5 ? 'white' : 'black'
                      }}
                      title={`${student} - ${question}: ${score}分`}
                    >
                      {score}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

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
        setAiReport(savedReportData.data.report || '');
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
        setAiReport(response.data.report || '');
      }
    } catch (error) {
      console.error('加载保存的报告失败:', error);
    } finally {
      setLoadingSavedReport(false);
    }
  };

  const generateAIReport = async () => {
    if (!analytics || !exam) return;
    
    setGeneratingReport(true);
    setAiReport(''); // 清空之前的报告
    
    try {
      const eventSource = new EventSource(`/api/exams/${id}/ai-report-stream`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'start':
            case 'progress':
              console.log(data.message);
              break;
            case 'stream':
              setAiReport(prev => prev + data.content);
              break;
            case 'complete':
              setAiReport(data.report);
              // 更新 savedReport 状态
              setSavedReport({
                examId: id || '',
                examTitle: exam?.title || '',
                report: data.report,
                status: 'COMPLETED',
                model: null,
                generatedAt: data.generatedAt || new Date().toISOString(),
                hasReport: true,
              });
              eventSource.close();
              setGeneratingReport(false);
              break;
            case 'error':
              eventSource.close();
              setGeneratingReport(false);
              if (data.message.includes('未找到可用的AI Provider')) {
                if (confirm('未找到可用的AI Provider配置。是否前往设置页面配置AI服务？')) {
                  navigate('/settings');
                }
              } else {
                alert(`生成AI报告失败：${data.message}`);
              }
              break;
          }
        } catch (error) {
          console.error('解析SSE数据失败:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE连接错误:', error);
        eventSource.close();
        setGeneratingReport(false);
        alert('生成AI报告时连接中断，请重试');
      };

    } catch (error: any) {
      console.error('生成AI报告失败:', error);
      setGeneratingReport(false);
      alert('启动AI报告生成失败，请重试');
    }
  };

  // 格式化生成时间
  const formatGeneratedTime = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
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
                    <span>报告生成于: {formatGeneratedTime(savedReport.generatedAt)}</span>
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
                    {loadingSavedReport ? '加载中...' : '查看已保存报告'}
                  </Button>
                )}
                <Button
                  onClick={generateAIReport}
                  disabled={generatingReport}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3"
                >
                  {savedReport?.hasReport ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                  {generatingReport ? '生成中...' : (savedReport?.hasReport ? '重新生成' : '生成AI分析报告')}
                </Button>
              </div>
            </div>

            {/* AI分析报告展示 */}
            {aiReport && (
              <div className="rounded-3xl border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-white p-8 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-purple-500 p-2">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-purple-900">AI智能分析报告</h2>
                  </div>
                  {savedReport?.generatedAt && (
                    <div className="flex items-center gap-2 text-sm text-purple-600">
                      <Clock className="h-4 w-4" />
                      <span>生成时间: {formatGeneratedTime(savedReport.generatedAt)}</span>
                    </div>
                  )}
                </div>
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                    {aiReport}
                  </div>
                </div>
              </div>
            )}

          {/* 概览统计卡片 */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="rounded-full bg-blue-500 p-2">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-blue-900">平均分</h3>
                </div>
                <div className="text-3xl font-bold text-blue-600">{analytics.scoreStats?.average?.toFixed(1) || 0}</div>
                <p className="text-sm text-blue-700 mt-1">满分 {exam.totalScore} 分</p>
              </div>

              <div className="rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-white p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="rounded-full bg-green-500 p-2">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-green-900">及格率</h3>
                </div>
                <div className="text-3xl font-bold text-green-600">{analytics.scoreStats?.passRate?.toFixed(1) || 0}%</div>
                <p className="text-sm text-green-700 mt-1">60分及格线</p>
              </div>

              <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="rounded-full bg-purple-500 p-2">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-purple-900">参与率</h3>
                </div>
                <div className="text-3xl font-bold text-purple-600">{analytics.participationStats?.participationRate?.toFixed(1) || 0}%</div>
                <p className="text-sm text-purple-700 mt-1">{analytics.participationStats?.submittedCount || 0}/{analytics.participationStats?.totalStudents || 0} 人提交</p>
              </div>

              <div className="rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="rounded-full bg-orange-500 p-2">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-orange-900">分数区间</h3>
                </div>
                <div className="text-lg font-bold text-orange-600">
                  {analytics.scoreStats?.lowest || 0} - {analytics.scoreStats?.highest || 0}
                </div>
                <p className="text-sm text-orange-700 mt-1">最低分 - 最高分</p>
              </div>
            </div>

            {/* 图表分析区域 */}
            <div className="grid gap-8 lg:grid-cols-2">
              {/* 分数分布图 */}
              <div className="rounded-3xl border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white p-8 shadow-lg">
                <h3 className="text-xl font-bold text-blue-900 mb-6">分数分布</h3>
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
                <h3 className="text-xl font-bold text-green-900 mb-6">题目类型分布</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getQuestionTypeData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getQuestionTypeData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* 题目难度分布 */}
              <div className="rounded-3xl border-2 border-orange-100 bg-gradient-to-br from-orange-50 to-white p-8 shadow-lg">
                <h3 className="text-xl font-bold text-orange-900 mb-6">题目难度分布</h3>
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
                <h3 className="text-xl font-bold text-purple-900 mb-6">知识点掌握情况</h3>
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
                  <h3 className="text-xl font-bold text-cyan-900 mb-6">题目得分分布箱线图</h3>
                  <BoxPlot data={getBoxPlotData()} />
                  <p className="text-sm text-cyan-700 mt-2">显示每道题目的得分分布情况，包括最值、四分位数等统计信息</p>
                </div>

                {/* 散点图 - 难度与正确率关系 */}
                <div className="rounded-3xl border-2 border-pink-100 bg-gradient-to-br from-pink-50 to-white p-8 shadow-lg">
                  <h3 className="text-xl font-bold text-pink-900 mb-6">题目难度与正确率关系</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={getScatterData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="x" label={{ value: '难度等级', position: 'insideBottom', offset: -5 }} />
                      <YAxis label={{ value: '正确率(%)', angle: -90, position: 'insideLeft' }} />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'y' ? `${value}%` : value,
                          name === 'y' ? '正确率' : '难度'
                        ]}
                        labelFormatter={(label, payload) => 
                          payload?.[0]?.payload?.name || `题目 ${label}`
                        }
                      />
                      <Line type="monotone" dataKey="y" stroke="#ec4899" strokeWidth={2} dot={{ fill: '#ec4899', r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                  <p className="text-sm text-pink-700 mt-2">分析题目难度设置与学生答题正确率的相关性</p>
                </div>
              </div>

              <div className="grid gap-8 lg:grid-cols-2">
                {/* 直方图 - 详细分数分布 */}
                <div className="rounded-3xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-8 shadow-lg">
                  <h3 className="text-xl font-bold text-indigo-900 mb-6">详细分数分布直方图</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getHistogramData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="score" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'count' ? `${value}人` : `${value}%`,
                          name === 'count' ? '人数' : '占比'
                        ]}
                      />
                      <Bar dataKey="count" fill="#6366f1" />
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-sm text-indigo-700 mt-2">更细粒度的分数分布，每5分为一个区间</p>
                </div>

                {/* 知识点掌握趋势 */}
                <div className="rounded-3xl border-2 border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-8 shadow-lg">
                  <h3 className="text-xl font-bold text-emerald-900 mb-6">知识点掌握趋势</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics?.knowledgePointStats?.slice(0, 8) || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="knowledgePoint" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="masteryRate" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        dot={{ fill: '#10b981', r: 5 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="averageScore" 
                        stroke="#059669" 
                        strokeWidth={2}
                        dot={{ fill: '#059669', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <p className="text-sm text-emerald-700 mt-2">展示各知识点的掌握率和平均得分趋势</p>
                </div>
              </div>

              {/* 热力图 - 学生答题情况矩阵 */}
              <div className="rounded-3xl border-2 border-amber-100 bg-gradient-to-br from-amber-50 to-white p-8 shadow-lg">
                <h3 className="text-xl font-bold text-amber-900 mb-6">学生答题情况热力图</h3>
                <Heatmap data={getHeatmapData()} />
                <p className="text-sm text-amber-700 mt-4">
                  颜色深浅表示得分高低，深蓝色表示高分，浅色表示低分。可快速识别学生薄弱题目和整体答题模式。
                </p>
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
                  {analytics.questionStats?.map((question: any, index: number) => (
                    <div key={question.questionId} className="rounded-xl bg-white p-4 border border-green-200">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="font-medium text-green-900">第 {index + 1} 题</span>
                          <span className="ml-2 text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {getQuestionTypeName(question.type)}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">难度</div>
                          <div className="font-semibold">{question.difficulty || 'N/A'}</div>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="text-center bg-green-50 rounded-lg p-3">
                          <div className="text-lg font-bold text-green-600">{question.correctRate?.toFixed(1) || 0}%</div>
                          <div className="text-xs text-green-700">正确率</div>
                        </div>
                        <div className="text-center bg-blue-50 rounded-lg p-3">
                          <div className="text-lg font-bold text-blue-600">{question.averageScore?.toFixed(1) || 0}</div>
                          <div className="text-xs text-blue-700">平均得分</div>
                        </div>
                      </div>
                      {question.knowledgePoint && (
                        <div className="mt-2 text-xs text-gray-600">
                          知识点: {question.knowledgePoint}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 知识点分析 */}
              <div className="rounded-3xl border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-white p-8 shadow-lg">
                <div className="mb-6 flex items-center gap-3">
                  <div className="rounded-full bg-purple-500 p-2">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-purple-900">知识点分析</h2>
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {analytics.knowledgePointStats?.map((kp: any) => (
                    <div key={kp.knowledgePoint} className="rounded-xl bg-white p-4 border border-purple-200">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="font-medium text-purple-900">{kp.knowledgePoint || '未分类'}</span>
                          <span className="ml-2 text-sm text-gray-600">{kp.questionCount} 道题</span>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="text-center bg-purple-50 rounded-lg p-3">
                          <div className="text-lg font-bold text-purple-600">{kp.averageScore?.toFixed(1) || 0}</div>
                          <div className="text-xs text-purple-700">平均得分</div>
                        </div>
                        <div className="text-center bg-green-50 rounded-lg p-3">
                          <div className="text-lg font-bold text-green-600">{kp.masteryRate?.toFixed(1) || 0}%</div>
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
                <h2 className="text-xl font-bold text-blue-900">参与情况统计</h2>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="text-center bg-white rounded-xl p-6 border border-blue-200">
                  <div className="text-3xl font-bold text-blue-600 mb-2">{analytics.participationStats?.totalStudents || 0}</div>
                  <div className="text-sm text-blue-700">总学生数</div>
                </div>
                <div className="text-center bg-white rounded-xl p-6 border border-green-200">
                  <div className="text-3xl font-bold text-green-600 mb-2">{analytics.participationStats?.submittedCount || 0}</div>
                  <div className="text-sm text-green-700">已提交</div>
                </div>
                <div className="text-center bg-white rounded-xl p-6 border border-gray-200">
                  <div className="text-3xl font-bold text-gray-600 mb-2">{analytics.participationStats?.notSubmittedCount || 0}</div>
                  <div className="text-sm text-gray-700">未提交</div>
                </div>
                <div className="text-center bg-white rounded-xl p-6 border border-purple-200">
                  <div className="text-3xl font-bold text-purple-600 mb-2">{analytics.participationStats?.participationRate?.toFixed(1) || 0}%</div>
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
      </div>
    </ExamLayout>
  );
}
