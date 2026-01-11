import { ReactNode, useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, BarChart3, Users, CheckSquare, Eye, Download, Trash2, FileText, UserCheck, Play, Square } from "lucide-react";
import Button from "@/components/ui/Button";
import { getExamById, deleteExam, updateExam, type Exam } from "@/services/exams";
import api from "@/services/api";

interface ExamLayoutProps {
  children: ReactNode;
  activeTab: 'questions' | 'students' | 'analytics' | 'grading' | 'preview' | 'export' | 'delete';
}

export default function ExamLayout({ children, activeTab }: ExamLayoutProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (id) {
      loadExam();
    }
  }, [id]);

  const loadExam = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [examData, submissionsResponse] = await Promise.all([
        getExamById(id),
        api.get(`/api/exams/${id}/submissions`).catch(() => ({ data: [] }))
      ]);
      setExam(examData);
      setSubmissionCount(submissionsResponse.data.length || 0);
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

  const handlePublishExam = async () => {
    if (!exam || !id) return;
    
    if (exam.examQuestions?.length === 0) {
      alert('请先添加题目再发布考试');
      return;
    }

    if (!confirm('确定要发布这个考试吗？发布后学生就可以参加考试了。')) {
      return;
    }

    setUpdating(true);
    try {
      const updatedExam = await updateExam(id, { status: 'PUBLISHED' });
      setExam(updatedExam);
      alert('考试发布成功！');
    } catch (err: any) {
      alert(err.response?.data?.message || '发布失败，请重试');
    } finally {
      setUpdating(false);
    }
  };

  const handleWithdrawExam = async () => {
    if (!exam || !id) return;

    if (!confirm('确定要撤回这个考试吗？撤回后学生将无法继续参加考试。')) {
      return;
    }

    setUpdating(true);
    try {
      const updatedExam = await updateExam(id, { status: 'DRAFT' });
      setExam(updatedExam);
      alert('考试已撤回！');
    } catch (err: any) {
      alert(err.response?.data?.message || '撤回失败，请重试');
    } finally {
      setUpdating(false);
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
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-blue-900">{exam.title}</h1>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(exam.status)}`}>
                    {getStatusText(exam.status)}
                  </span>
                </div>
                <p className="text-blue-700 mb-4">{exam.description}</p>
                <div className="flex items-center gap-4 text-sm text-blue-600">
                  <span>时长: {exam.duration} 分钟</span>
                  <span>总分: {exam.totalScore} 分</span>
                  <span>题目数: {exam.examQuestions?.length || 0}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-3 mb-3">
                  {exam.status === 'PUBLISHED' ? (
                    <Button
                      onClick={handleWithdrawExam}
                      disabled={updating}
                      size="sm"
                      className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white"
                    >
                      <Square className="h-4 w-4" />
                      {updating ? '撤回中...' : '撤回考试'}
                    </Button>
                  ) : (
                    <Button
                      onClick={handlePublishExam}
                      disabled={updating || (exam.examQuestions?.length || 0) === 0}
                      size="sm"
                      className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white"
                    >
                      <Play className="h-4 w-4" />
                      {updating ? '发布中...' : '发布考试'}
                    </Button>
                  )}
                </div>
                <div className="text-sm text-blue-600">
                  创建时间: {new Date(exam.createdAt).toLocaleDateString('zh-CN')}
                </div>
              </div>
            </div>

            {/* 快速操作 - 移除此部分 */}
          </div>

          {/* 标签页导航 */}
          <div className="flex flex-wrap border-b-2 border-gray-200 mb-8 gap-1">
            <button
              onClick={() => navigate(`/exams/${id}`)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors rounded-t-lg ${
                activeTab === 'questions'
                  ? 'border-b-2 border-blue-500 text-blue-700 bg-blue-50'
                  : 'text-gray-600 hover:text-blue-700 hover:bg-blue-50'
              }`}
            >
              <FileText className="h-4 w-4" />
              考试题目
              {exam.examQuestions && exam.examQuestions.length > 0 && (
                <span className="ml-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                  {exam.examQuestions.length}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate(`/exams/${id}/students`)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors rounded-t-lg ${
                activeTab === 'students'
                  ? 'border-b-2 border-indigo-500 text-indigo-700 bg-indigo-50'
                  : 'text-gray-600 hover:text-indigo-700 hover:bg-indigo-50'
              }`}
            >
              <UserCheck className="h-4 w-4" />
              学生管理
              {submissionCount > 0 && (
                <span className="ml-1 bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs">
                  {submissionCount}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate(`/exams/${id}/analytics`)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors rounded-t-lg ${
                activeTab === 'analytics'
                  ? 'border-b-2 border-purple-500 text-purple-700 bg-purple-50'
                  : 'text-gray-600 hover:text-purple-700 hover:bg-purple-50'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              统计分析
            </button>
            <button
              onClick={() => navigate(`/exams/${id}/grading`)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors rounded-t-lg ${
                activeTab === 'grading'
                  ? 'border-b-2 border-green-500 text-green-700 bg-green-50'
                  : 'text-gray-600 hover:text-green-700 hover:bg-green-50'
              }`}
            >
              <CheckSquare className="h-4 w-4" />
              评分管理
            </button>
            <button
              onClick={() => window.open(`/exam/${id}/login`, '_blank')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors rounded-t-lg ${
                activeTab === 'preview'
                  ? 'border-b-2 border-cyan-500 text-cyan-700 bg-cyan-50'
                  : 'text-gray-600 hover:text-cyan-700 hover:bg-cyan-50'
              }`}
            >
              <Eye className="h-4 w-4" />
              预览考试
            </button>
            <button
              className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors rounded-t-lg ${
                activeTab === 'export'
                  ? 'border-b-2 border-orange-500 text-orange-700 bg-orange-50'
                  : 'text-gray-600 hover:text-orange-700 hover:bg-orange-50'
              }`}
            >
              <Download className="h-4 w-4" />
              导出数据
            </button>
            <button
              onClick={handleDeleteExam}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors rounded-t-lg ${
                activeTab === 'delete'
                  ? 'border-b-2 border-red-500 text-red-700 bg-red-50'
                  : 'text-gray-600 hover:text-red-700 hover:bg-red-50'
              }`}
            >
              <Trash2 className="h-4 w-4" />
              删除考试
            </button>
          </div>
        </div>

        {/* 页面内容 */}
        {children}
      </div>
    </div>
  );
}
