import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BarChart3, TrendingUp, Users, Target } from "lucide-react";
import Button from "@/components/ui/Button";
import ExamLayout from "@/components/ExamLayout";
import { getExamById, type Exam } from "@/services/exams";
import api from "@/services/api";

export default function ExamAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const [examData, analyticsData] = await Promise.all([
        getExamById(id),
        api.get(`/api/exams/${id}/analytics`)
      ]);
      
      setExam(examData);
      setAnalytics(analyticsData.data);
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
      {analytics ? (
        <div className="space-y-8">
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
