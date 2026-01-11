import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BookOpen, Users } from "lucide-react";
import Button from "@/components/ui/Button";
import ExamLayout from "@/components/ExamLayout";
import { getExamById, type Exam } from "@/services/exams";

export default function ExamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'questions' | 'students'>('questions');

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
        {/* 标签页导航 */}
        <div className="flex border-b-2 border-gray-200">
          <button
            onClick={() => setActiveTab('questions')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors rounded-t-lg ${
              activeTab === 'questions'
                ? 'border-b-2 border-blue-500 text-blue-700 bg-blue-50'
                : 'text-gray-600 hover:text-blue-700 hover:bg-blue-50'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            考试题目 ({exam.examQuestions?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors rounded-t-lg ${
              activeTab === 'students'
                ? 'border-b-2 border-blue-500 text-blue-700 bg-blue-50'
                : 'text-gray-600 hover:text-blue-700 hover:bg-blue-50'
            }`}
          >
            <Users className="h-4 w-4" />
            学生管理
          </button>
        </div>

        {/* 题目管理 */}
        {activeTab === 'questions' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold mb-4">考试题目</h3>
            {exam.examQuestions && exam.examQuestions.length > 0 ? (
              <div className="space-y-3">
                {exam.examQuestions.map((examQuestion: any, index: number) => (
                  <div key={examQuestion.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">第 {index + 1} 题</span>
                        <span className="ml-2 text-sm text-gray-600">
                          {examQuestion.question?.content?.substring(0, 50)}...
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {examQuestion.score} 分
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                暂无题目，请添加题目
              </div>
            )}
          </div>
        )}

        {/* 学生管理 */}
        {activeTab === 'students' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold mb-4">学生管理</h3>
            <div className="text-center py-8 text-gray-500">
              学生管理功能开发中...
            </div>
          </div>
        )}
      </div>
    </ExamLayout>
  );
}
