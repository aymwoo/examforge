import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button";
import ExamLayout from "@/components/ExamLayout";
import { getExamById, type Exam } from "@/services/exams";

export default function ExamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        {/* 题目管理 */}
        <div className="rounded-3xl border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-blue-900 mb-6">考试题目</h2>
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
                      {examQuestion.question?.options && examQuestion.question.options.length > 0 && (
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
              <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                添加题目
              </Button>
            </div>
          )}
        </div>
      </div>
    </ExamLayout>
  );
}
