import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Play, Square } from "lucide-react";
import Button from "@/components/ui/Button";
import ExamLayout from "@/components/ExamLayout";
import { getExamById, updateExam, type Exam } from "@/services/exams";

export default function ExamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (id) {
      loadExam();
    }
  }, [id]);

  const loadExam = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getExamById(id);
      setExam(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "加载失败");
    } finally {
      setLoading(false);
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

  if (error) {
    return (
      <div className="bg-slatebg text-ink-900 antialiased min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => navigate('/exams')}>返回考试列表</Button>
        </div>
      </div>
    );
  }

  if (!exam) return null;

  return (
    <ExamLayout activeTab="questions">
      <div className="space-y-8">
        {/* 考试状态和操作 */}
        <div className="rounded-3xl border-2 border-green-100 bg-gradient-to-br from-green-50 to-white p-8 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-green-900 mb-2">考试状态</h2>
              <div className="flex items-center gap-3">
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  exam.status === 'PUBLISHED' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {exam.status === 'PUBLISHED' ? '已发布' : '草稿'}
                </span>
                <span className="text-gray-600">
                  题目数量: {exam.examQuestions?.length || 0} 道
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {exam.status === 'PUBLISHED' ? (
                <Button
                  onClick={handleWithdrawExam}
                  disabled={updating}
                  className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white"
                >
                  <Square className="h-4 w-4" />
                  {updating ? '撤回中...' : '撤回考试'}
                </Button>
              ) : (
                <Button
                  onClick={handlePublishExam}
                  disabled={updating || (exam.examQuestions?.length || 0) === 0}
                  className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white"
                >
                  <Play className="h-4 w-4" />
                  {updating ? '发布中...' : '发布考试'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 题目管理 */}
        <div className="rounded-3xl border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white p-8 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-blue-900">考试题目</h2>
            <Button 
              onClick={() => navigate(`/exams/${id}/add-questions`)}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              添加题目
            </Button>
          </div>
          {exam.examQuestions && exam.examQuestions.length > 0 ? (
            <div className="space-y-4">
              {exam.examQuestions.map((examQuestion: any, index: number) => (
                <div key={examQuestion.id} className="bg-white border border-blue-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                          第 {index + 1} 题
                        </span>
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                          {examQuestion.question?.type || '未知类型'}
                        </span>
                      </div>
                      <div className="text-gray-800 mb-2">
                        {examQuestion.question?.content}
                      </div>
                      {examQuestion.question?.options && Array.isArray(examQuestion.question.options) && examQuestion.question.options.length > 0 && (
                        <div className="text-sm text-gray-600 space-y-1">
                          {examQuestion.question.options.map((option: any, optIndex: number) => (
                            <div key={optIndex}>
                              {option.label}: {option.content}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-lg font-bold text-blue-600">
                        {examQuestion.score} 分
                      </div>
                      {examQuestion.question?.difficulty && (
                        <div className="text-sm text-gray-500">
                          难度: {examQuestion.question.difficulty}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-blue-700 mb-4">暂无题目，请添加题目</p>
            </div>
          )}
        </div>
      </div>
    </ExamLayout>
  );
}
