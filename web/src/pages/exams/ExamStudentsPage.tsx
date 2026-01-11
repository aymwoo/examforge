import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ExamLayout from "@/components/ExamLayout";
import { getExamById, type Exam } from "@/services/exams";
import api from "@/services/api";

interface Submission {
  id: string;
  student: {
    id: string;
    username: string;
    displayName?: string;
  };
  submittedAt: string;
  score: number | null;
  isAutoGraded: boolean;
  isReviewed: boolean;
  gradingDetails?: any;
}

export default function ExamStudentsPage() {
  const { id } = useParams<{ id: string }>();
  const [exam, setExam] = useState<Exam | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [examData, submissionsResponse] = await Promise.all([
        getExamById(id),
        api.get(`/api/exams/${id}/submissions`)
      ]);
      setExam(examData);
      setSubmissions(submissionsResponse.data);
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ExamLayout activeTab="students">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </ExamLayout>
    );
  }

  return (
    <ExamLayout activeTab="students">
      <div className="space-y-8">
        <div className="rounded-3xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-indigo-900 mb-6">学生管理</h2>
          
          {/* 统计信息 */}
          <div className="grid gap-4 sm:grid-cols-3 mb-8">
            <div className="bg-white rounded-xl p-4 border border-indigo-200">
              <div className="text-2xl font-bold text-indigo-600">{submissions.length}</div>
              <div className="text-sm text-indigo-700">已提交学生</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-green-200">
              <div className="text-2xl font-bold text-green-600">
                {submissions.filter(s => s.isReviewed).length}
              </div>
              <div className="text-sm text-green-700">已复核</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">
                {submissions.filter(s => s.isAutoGraded && !s.isReviewed).length}
              </div>
              <div className="text-sm text-yellow-700">待复核</div>
            </div>
          </div>

          {/* 学生列表 */}
          <div className="space-y-4">
            {submissions.length > 0 ? (
              submissions.map((submission) => (
                <div 
                  key={submission.id}
                  className="bg-white rounded-xl p-6 border border-indigo-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-indigo-900">
                        {submission.student.displayName || submission.student.username}
                      </div>
                      <div className="text-sm text-gray-600">
                        提交时间: {new Date(submission.submittedAt).toLocaleString('zh-CN')}
                      </div>
                    </div>
                    <div className="text-right">
                      {submission.score !== null && (
                        <div className="text-lg font-bold text-green-600 mb-1">
                          {submission.score}/{exam?.totalScore}
                        </div>
                      )}
                      {submission.gradingDetails && (
                        <div className="text-sm text-blue-600 mb-2">
                          AI预评分: {submission.gradingDetails.totalScore}/{submission.gradingDetails.maxTotalScore}
                        </div>
                      )}
                      <div className="flex gap-2">
                        {submission.isReviewed ? (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                            已复核
                          </span>
                        ) : submission.isAutoGraded ? (
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                            待复核
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                            未评分
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-indigo-700">暂无学生提交</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ExamLayout>
  );
}
