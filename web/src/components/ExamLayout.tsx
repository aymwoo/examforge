import { ReactNode, useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, BarChart3, Users, CheckSquare, Eye, Download, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { getExamById, deleteExam, type Exam } from "@/services/exams";

interface ExamLayoutProps {
  children: ReactNode;
  activeTab: 'details' | 'analytics' | 'grading';
}

export default function ExamLayout({ children, activeTab }: ExamLayoutProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadExam();
    }
  }, [id]);

  const loadExam = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getExamById(id);
      setExam(data);
    } catch (err) {
      console.error('加载考试信息失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExam = async () => {
    if (!id || !exam) return;
    
    if (!confirm(`确定要删除考试"${exam.title}"吗？此操作不可撤销。`)) {
      return;
    }

    try {
      await deleteExam(id);
      navigate('/exams');
    } catch (err) {
      alert('删除失败，请重试');
    }
  };

  if (loading) {
    return (
      <div className="bg-slatebg text-ink-900 antialiased min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600 mx-auto mb-4"></div>
          <p className="text-ink-700">加载中...</p>
        </div>
      </div>
    );
  }

  if (!exam) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'bg-green-100 text-green-800';
      case 'DRAFT': return 'bg-yellow-100 text-yellow-800';
      case 'ARCHIVED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return '已发布';
      case 'DRAFT': return '草稿';
      case 'ARCHIVED': return '已归档';
      default: return status;
    }
  };

  return (
    <div className="bg-slatebg text-ink-900 antialiased min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面头部 */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              onClick={() => navigate('/exams')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              返回考试列表
            </Button>
          </div>

          {/* 考试基本信息 */}
          <div className="rounded-3xl border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white p-8 shadow-lg mb-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-blue-900 mb-2">{exam.title}</h1>
                <p className="text-blue-700 mb-4">{exam.description}</p>
                <div className="flex items-center gap-4 text-sm text-blue-600">
                  <span>时长: {exam.duration} 分钟</span>
                  <span>总分: {exam.totalScore} 分</span>
                  <span>题目数: {exam.examQuestions?.length || 0}</span>
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(exam.status)}`}>
                  {getStatusText(exam.status)}
                </span>
                <div className="mt-2 text-sm text-blue-600">
                  创建时间: {new Date(exam.createdAt).toLocaleDateString('zh-CN')}
                </div>
              </div>
            </div>

            {/* 快速操作 */}
            <div className="border-t border-blue-200 pt-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">快速操作</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Button 
                  onClick={() => navigate(`/exams/${id}/grading`)}
                  className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-xl text-sm"
                >
                  <CheckSquare className="h-4 w-4" />
                  评分管理
                </Button>
                
                <Button 
                  onClick={() => navigate(`/exams/${id}/analytics`)}
                  className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white p-3 rounded-xl text-sm"
                >
                  <BarChart3 className="h-4 w-4" />
                  统计分析
                </Button>
                
                <Button 
                  onClick={() => window.open(`/exam/${id}/login`, '_blank')}
                  className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white p-3 rounded-xl text-sm"
                >
                  <Eye className="h-4 w-4" />
                  预览考试
                </Button>
                
                <Button 
                  variant="outline"
                  className="flex items-center gap-2 border-2 border-orange-300 text-orange-600 hover:bg-orange-50 p-3 rounded-xl text-sm"
                >
                  <Download className="h-4 w-4" />
                  导出数据
                </Button>
                
                <Button 
                  variant="outline"
                  className="flex items-center gap-2 border-2 border-red-300 text-red-600 hover:bg-red-50 p-3 rounded-xl text-sm"
                  onClick={handleDeleteExam}
                >
                  <Trash2 className="h-4 w-4" />
                  删除考试
                </Button>
              </div>
            </div>
          </div>

          {/* 标签页导航 */}
          <div className="flex border-b-2 border-gray-200 mb-8">
            <button
              onClick={() => navigate(`/exams/${id}`)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors rounded-t-lg ${
                activeTab === 'details'
                  ? 'border-b-2 border-blue-500 text-blue-700 bg-blue-50'
                  : 'text-gray-600 hover:text-blue-700 hover:bg-blue-50'
              }`}
            >
              <Users className="h-4 w-4" />
              考试详情
            </button>
            <button
              onClick={() => navigate(`/exams/${id}/analytics`)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors rounded-t-lg ${
                activeTab === 'analytics'
                  ? 'border-b-2 border-blue-500 text-blue-700 bg-blue-50'
                  : 'text-gray-600 hover:text-blue-700 hover:bg-blue-50'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              统计分析
            </button>
            <button
              onClick={() => navigate(`/exams/${id}/grading`)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors rounded-t-lg ${
                activeTab === 'grading'
                  ? 'border-b-2 border-blue-500 text-blue-700 bg-blue-50'
                  : 'text-gray-600 hover:text-blue-700 hover:bg-blue-50'
              }`}
            >
              <CheckSquare className="h-4 w-4" />
              评分管理
            </button>
          </div>
        </div>

        {/* 页面内容 */}
        {children}
      </div>
    </div>
  );
}
