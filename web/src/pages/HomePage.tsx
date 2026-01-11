import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Users, FileText, Calendar } from "lucide-react";
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

  const loadDashboardData = async () => {
    try {
      const response = await api.get('/api/exams/dashboard');
      setDashboardData(response.data);
    } catch (error) {
      console.error('加载仪表板数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
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
        {/* 页面标题 */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-ink-900 mb-4">考试管理系统</h1>
          <p className="text-lg text-ink-600">实时监控正在进行的考试</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="rounded-2xl border border-border bg-white p-6 shadow-soft">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-blue-100 p-3">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink-600">正在进行</p>
                <p className="text-2xl font-bold text-ink-900">{dashboardData?.ongoingExams || 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-white p-6 shadow-soft">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-100 p-3">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink-600">参与学生</p>
                <p className="text-2xl font-bold text-ink-900">{dashboardData?.totalStudents || 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-white p-6 shadow-soft">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-orange-100 p-3">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink-600">已提交</p>
                <p className="text-2xl font-bold text-ink-900">{dashboardData?.totalSubmissions || 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-white p-6 shadow-soft">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-purple-100 p-3">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink-600">总考试</p>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/exams')}
                  className="text-sm"
                >
                  查看全部
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 正在进行的考试列表 */}
        <div className="rounded-3xl border border-border bg-white p-8 shadow-soft">
          <h2 className="text-2xl font-bold text-ink-900 mb-6">正在进行的考试</h2>
          
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
