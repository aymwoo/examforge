import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Clock, CheckCircle, AlertCircle, Bot, Save, Eye } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import api from "@/services/api";

interface Student {
  id: string;
  username: string;
  displayName?: string;
}

interface Submission {
  id: string;
  student: Student;
  answers: Record<string, any>;
  score?: number;
  isAutoGraded: boolean;
  gradingDetails?: any; // AI预评分详情
  submittedAt: string;
}

interface AIGradingSuggestion {
  type: 'objective' | 'subjective';
  isCorrect?: boolean;
  score?: number;
  maxScore: number;
  feedback?: string;
  aiSuggestion?: {
    suggestedScore: number;
    reasoning: string;
    suggestions: string;
    confidence: number;
  };
}

export default function ExamGradingPage() {
  const { id: examId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  console.log('ExamGradingPage rendered, examId:', examId);
  
  const [exam, setExam] = useState<any>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, AIGradingSuggestion>>({});
  const [manualScores, setManualScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [gradingLoading, setGradingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAnswerModal, setShowAnswerModal] = useState(false);

  useEffect(() => {
    console.log('useEffect triggered, examId:', examId);
    loadExamAndSubmissions();
  }, [examId]);

  const loadExamAndSubmissions = async () => {
    if (!examId) return;
    
    setLoading(true);
    try {
      console.log('Loading exam and submissions for examId:', examId);
      
      // 先加载考试信息
      const examResponse = await api.get(`/api/exams/${examId}`);
      console.log('Exam data:', examResponse.data);
      setExam(examResponse.data);
      
      // 再加载提交信息
      const submissionsResponse = await api.get(`/api/exams/${examId}/submissions`);
      console.log('Submissions data:', submissionsResponse.data);
      setSubmissions(submissionsResponse.data);
      
    } catch (err: any) {
      console.error('Error loading data:', err);
      console.error('Error response:', err.response);
      setError(err.response?.data?.message || err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const loadAISuggestions = async (submission: Submission) => {
    setGradingLoading(true);
    try {
      // 这个方法现在只是从数据库读取已存储的评分数据
      const response = await api.post(`/api/exams/${examId}/submissions/${submission.id}/ai-grade`);
      setAiSuggestions(response.data.suggestions);
      
      // 初始化手动评分为已存储的分数
      const initialScores: Record<string, number> = {};
      Object.entries(response.data.suggestions).forEach(([questionId, suggestion]: [string, any]) => {
        if (suggestion.type === 'objective') {
          initialScores[questionId] = suggestion.score;
        } else if (suggestion.aiSuggestion) {
          initialScores[questionId] = suggestion.aiSuggestion.suggestedScore;
        }
      });
      setManualScores(initialScores);
    } catch (err: any) {
      console.error('加载评分数据失败:', err);
      setError('评分数据加载失败，可能需要重新提交考试');
    } finally {
      setGradingLoading(false);
    }
  };

  const handleSubmissionSelect = (submission: Submission) => {
    setSelectedSubmission(submission);
    setAiSuggestions({});
    
    // 优先使用预存储的评分详情
    if (submission.gradingDetails && submission.gradingDetails.details) {
      const suggestions: Record<string, AIGradingSuggestion> = {};
      const initialScores: Record<string, number> = {};
      
      Object.entries(submission.gradingDetails.details).forEach(([questionId, detail]: [string, any]) => {
        if (detail.type === 'objective') {
          suggestions[questionId] = {
            type: 'objective',
            isCorrect: detail.isCorrect,
            score: detail.score,
            maxScore: detail.maxScore,
            feedback: detail.feedback,
          };
          initialScores[questionId] = detail.score;
        } else if (detail.type === 'subjective') {
          suggestions[questionId] = {
            type: 'subjective',
            maxScore: detail.maxScore,
            aiSuggestion: {
              suggestedScore: detail.aiGrading.suggestedScore,
              reasoning: detail.aiGrading.reasoning,
              suggestions: detail.aiGrading.suggestions,
              confidence: detail.aiGrading.confidence,
            },
          };
          initialScores[questionId] = detail.score;
        }
      });
      
      setAiSuggestions(suggestions);
      setManualScores(initialScores);
      setGradingLoading(false);
    } else {
      // 如果没有预评分数据，尝试从API获取（兼容旧数据）
      loadAISuggestions(submission);
    }
  };

  const handleScoreChange = (questionId: string, score: number) => {
    setManualScores(prev => ({
      ...prev,
      [questionId]: score
    }));
  };

  const handleSaveGrading = async () => {
    if (!selectedSubmission) return;

    const totalScore = Object.values(manualScores).reduce((sum, score) => sum + score, 0);
    
    try {
      await api.post(`/api/exams/${examId}/submissions/${selectedSubmission.id}/grade`, {
        scores: manualScores,
        totalScore,
      });
      
      alert('评分保存成功！');
      await loadExamAndSubmissions();
      setSelectedSubmission(null);
    } catch (err: any) {
      setError(err.response?.data?.message || '保存失败');
    }
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

  if (error) {
    return (
      <div className="bg-slatebg text-ink-900 antialiased min-h-screen pt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-white p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-ink-900 mb-4">{error}</p>
            <Button onClick={() => navigate('/exams')}>返回考试列表</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slatebg text-ink-900 antialiased min-h-screen pt-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 头部 */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate(`/exams/${examId}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-ink-900">{exam?.title} - 评分</h1>
              <p className="text-ink-600">共 {submissions.length} 份提交</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 提交列表 */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-border bg-white p-4">
              <h3 className="font-semibold text-ink-900 mb-4">学生提交</h3>
              <div className="space-y-2">
                {submissions.map((submission) => (
                  <button
                    key={submission.id}
                    onClick={() => handleSubmissionSelect(submission)}
                    className={`w-full text-left p-3 rounded-xl border transition-colors ${
                      selectedSubmission?.id === submission.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-border bg-white hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-ink-600" />
                        <span className="font-medium text-ink-900">
                          {submission.student.displayName || submission.student.username}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {submission.score !== null ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : submission.gradingDetails ? (
                          <div className="flex items-center gap-1">
                            <Bot className="h-4 w-4 text-blue-500" />
                            <span className="text-xs text-blue-600">AI已评</span>
                          </div>
                        ) : (
                          <Clock className="h-4 w-4 text-orange-500" />
                        )}
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-ink-600">
                      提交时间: {new Date(submission.submittedAt).toLocaleString()}
                    </div>
                    {submission.gradingDetails && (
                      <div className="mt-1 text-sm">
                        <span className="text-blue-600 font-semibold">
                          AI预评分: {submission.gradingDetails.totalScore}/{submission.gradingDetails.maxTotalScore}
                        </span>
                        {!submission.gradingDetails.isFullyAutoGraded && (
                          <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                            需复审
                          </span>
                        )}
                      </div>
                    )}
                    {submission.score !== null && (
                      <div className="mt-1 text-sm font-semibold text-green-600">
                        最终得分: {submission.score}/{exam?.totalScore}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 评分区域 */}
          <div className="lg:col-span-2">
            {selectedSubmission ? (
              <div className="rounded-2xl border border-border bg-white p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-ink-900">
                    评分 - {selectedSubmission.student.displayName || selectedSubmission.student.username}
                  </h3>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowAnswerModal(true)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      查看答题详情
                    </Button>
                    {gradingLoading && (
                      <div className="flex items-center gap-2 text-blue-600">
                        <Bot className="h-4 w-4" />
                        <span className="text-sm">AI分析中...</span>
                      </div>
                    )}
                  </div>
                </div>

                {Object.keys(aiSuggestions).length > 0 && (
                  <div className="space-y-6">
                    {/* 考试概览 */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                      <h4 className="font-semibold text-blue-800 mb-2">答题概览</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {(() => {
                          const totalQuestions = exam?.examQuestions?.length || 0;
                          const answeredQuestions = exam?.examQuestions?.filter((examQuestion: any) => {
                            const answer = selectedSubmission.answers[examQuestion.question.id];
                            return answer !== undefined && answer !== null && answer !== '' && 
                                   (Array.isArray(answer) ? answer.length > 0 : true);
                          }).length || 0;

                          return (
                            <>
                              <div>
                                <span className="text-blue-600">总题数:</span>
                                <span className="font-semibold ml-1">{totalQuestions}</span>
                              </div>
                              <div>
                                <span className="text-blue-600">已答题:</span>
                                <span className="font-semibold ml-1">{answeredQuestions}</span>
                              </div>
                              <div>
                                <span className="text-blue-600">满分:</span>
                                <span className="font-semibold ml-1">{exam?.totalScore}</span>
                              </div>
                              <div>
                                <span className="text-blue-600">提交时间:</span>
                                <span className="font-semibold ml-1">
                                  {new Date(selectedSubmission.submittedAt).toLocaleString()}
                                </span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {exam?.examQuestions?.map((examQuestion: any, index: number) => {
                      const question = examQuestion.question;
                      const suggestion = aiSuggestions[question.id];
                      const studentAnswer = selectedSubmission.answers[question.id];
                      const hasAnswer = studentAnswer !== undefined && studentAnswer !== null && studentAnswer !== '';

                      return (
                        <div key={question.id} className="border border-border rounded-xl p-6">
                          {/* 题目信息 */}
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-ink-900">
                                第 {index + 1} 题 
                                <span className="ml-2 text-sm bg-gray-100 px-2 py-1 rounded">
                                  {question.type === 'SINGLE_CHOICE' ? '单选题' :
                                   question.type === 'MULTIPLE_CHOICE' ? '多选题' :
                                   question.type === 'FILL_BLANK' ? '填空题' :
                                   question.type === 'SHORT_ANSWER' ? '简答题' :
                                   question.type === 'ESSAY' ? '论述题' : question.type}
                                </span>
                              </h4>
                              <span className="text-sm font-semibold text-blue-600">
                                {examQuestion.score} 分
                              </span>
                            </div>
                            
                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                              <p className="text-ink-900 font-medium mb-2">题目内容:</p>
                              <p className="text-ink-700">{question.content}</p>
                              
                              {/* 显示选项（如果是选择题） */}
                              {(question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE') && 
                               question.options && (
                                <div className="mt-3">
                                  <p className="text-sm font-medium text-ink-700 mb-2">选项:</p>
                                  <div className="space-y-1">
                                    {JSON.parse(question.options).map((option: string, optIndex: number) => (
                                      <div key={optIndex} className="text-sm text-ink-600">
                                        {String.fromCharCode(65 + optIndex)}. {option}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* 显示参考答案 */}
                              {question.answer && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <p className="text-sm font-medium text-green-700 mb-1">参考答案:</p>
                                  <p className="text-sm text-green-600">{question.answer}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 学生答案 */}
                          <div className="mb-4">
                            <div className={`rounded-lg p-4 border-2 ${
                              hasAnswer ? 'bg-white border-blue-200' : 'bg-red-50 border-red-200'
                            }`}>
                              <div className="flex items-center gap-2 mb-2">
                                <p className="font-medium text-ink-700">学生答案:</p>
                                {!hasAnswer && (
                                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">未作答</span>
                                )}
                              </div>
                              
                              {hasAnswer ? (
                                <div className="text-ink-900">
                                  {question.type === 'MULTIPLE_CHOICE' && Array.isArray(studentAnswer) ? (
                                    <div className="space-y-1">
                                      {studentAnswer.map((answer: string, idx: number) => (
                                        <div key={idx} className="text-sm">• {answer}</div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="whitespace-pre-wrap">{studentAnswer}</div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-gray-500 italic">学生未回答此题</p>
                              )}
                            </div>
                          </div>

                          {/* AI评分建议 */}
                          {suggestion?.type === 'objective' && (
                            <div className={`rounded-lg p-4 mb-4 ${
                              suggestion.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                            }`}>
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-lg ${suggestion.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                  {suggestion.isCorrect ? '✓' : '✗'}
                                </span>
                                <p className="font-medium">
                                  {suggestion.isCorrect ? '答案正确' : '答案错误'}
                                </p>
                                <span className={`text-sm px-2 py-1 rounded ${
                                  suggestion.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  自动评分: {suggestion.score}/{suggestion.maxScore}
                                </span>
                              </div>
                              <p className="text-sm">{suggestion.feedback}</p>
                            </div>
                          )}

                          {suggestion?.aiSuggestion && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Bot className="h-5 w-5 text-blue-600" />
                                <span className="font-medium text-blue-800">AI评分建议</span>
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                  置信度: {Math.round(suggestion.aiSuggestion.confidence * 100)}%
                                </span>
                              </div>
                              
                              <div className="space-y-2 text-sm">
                                <div>
                                  <span className="font-medium text-blue-700">建议得分:</span>
                                  <span className="ml-2 bg-blue-100 px-2 py-1 rounded font-semibold">
                                    {suggestion.aiSuggestion.suggestedScore}/{suggestion.maxScore}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium text-blue-700">评分理由:</span>
                                  <p className="mt-1 text-blue-600">{suggestion.aiSuggestion.reasoning}</p>
                                </div>
                                <div>
                                  <span className="font-medium text-blue-700">改进建议:</span>
                                  <p className="mt-1 text-blue-600">{suggestion.aiSuggestion.suggestions}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 教师评分 */}
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <label className="font-medium text-yellow-800">教师评分:</label>
                              <div className="flex items-center gap-3">
                                <input
                                  type="number"
                                  min="0"
                                  max={suggestion?.maxScore || examQuestion.score}
                                  value={manualScores[question.id] || 0}
                                  onChange={(e) => handleScoreChange(question.id, parseInt(e.target.value) || 0)}
                                  className="w-20 rounded-lg border border-yellow-300 px-3 py-2 text-center font-semibold"
                                />
                                <span className="text-yellow-700">/ {suggestion?.maxScore || examQuestion.score}</span>
                                <div className="text-xs text-yellow-600">
                                  {Math.round(((manualScores[question.id] || 0) / (suggestion?.maxScore || examQuestion.score)) * 100)}%
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <div className="border-t border-border pt-4">
                      <div className="space-y-3">
                        {/* AI预评分 */}
                        {selectedSubmission.gradingDetails && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Bot className="h-5 w-5 text-blue-600" />
                                <span className="font-semibold text-blue-800">AI预评分</span>
                              </div>
                              <div className="text-lg font-bold text-blue-700">
                                {selectedSubmission.gradingDetails.totalScore} / {selectedSubmission.gradingDetails.maxTotalScore}
                              </div>
                            </div>
                            {!selectedSubmission.gradingDetails.isFullyAutoGraded && (
                              <p className="text-xs text-blue-600 mt-1">
                                * 包含主观题，建议教师复审确认
                              </p>
                            )}
                          </div>
                        )}
                        
                        {/* 教师最终评分 */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="text-lg font-semibold text-yellow-800">
                              教师最终评分: {Object.values(manualScores).reduce((sum, score) => sum + score, 0)} / {exam?.totalScore}
                            </div>
                            <Button onClick={handleSaveGrading} className="flex items-center gap-2">
                              <Save className="h-4 w-4" />
                              {selectedSubmission.score !== null ? '更新评分' : '确认评分'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-white p-6 text-center">
                <p className="text-ink-600">请选择一个学生提交进行评分</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 学生答题详情模态框 */}
      <Modal
        isOpen={showAnswerModal}
        onClose={() => setShowAnswerModal(false)}
        title={`${selectedSubmission?.student.displayName || selectedSubmission?.student.username} - 答题详情`}
        size="xl"
      >
        {selectedSubmission && exam && (
          <div className="space-y-6">
            {/* 答题统计 */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-3">答题统计</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {(() => {
                  const totalQuestions = exam.examQuestions?.length || 0;
                  const answeredQuestions = exam.examQuestions?.filter((examQuestion: any) => {
                    const answer = selectedSubmission.answers[examQuestion.question.id];
                    return answer !== undefined && answer !== null && answer !== '' && 
                           (Array.isArray(answer) ? answer.length > 0 : true);
                  }).length || 0;
                  const unansweredQuestions = totalQuestions - answeredQuestions;
                  const completionRate = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

                  return (
                    <>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{totalQuestions}</div>
                        <div className="text-blue-700">总题数</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{answeredQuestions}</div>
                        <div className="text-green-700">已答题</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{unansweredQuestions}</div>
                        <div className="text-red-700">未答题</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{completionRate}%</div>
                        <div className="text-purple-700">完成率</div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* 每道题的答题情况 */}
            <div className="space-y-4">
              {exam.examQuestions?.map((examQuestion: any, index: number) => {
                const question = examQuestion.question;
                const studentAnswer = selectedSubmission.answers[question.id];
                const hasAnswer = studentAnswer !== undefined && studentAnswer !== null && studentAnswer !== '';

                return (
                  <div key={question.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h5 className="font-semibold text-gray-900 mb-1">
                          第 {index + 1} 题
                          <span className="ml-2 text-sm bg-gray-100 px-2 py-1 rounded">
                            {question.type === 'SINGLE_CHOICE' ? '单选题' :
                             question.type === 'MULTIPLE_CHOICE' ? '多选题' :
                             question.type === 'FILL_BLANK' ? '填空题' :
                             question.type === 'SHORT_ANSWER' ? '简答题' :
                             question.type === 'ESSAY' ? '论述题' : question.type}
                          </span>
                        </h5>
                        <p className="text-gray-700 text-sm">{question.content}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{examQuestion.score} 分</span>
                        <div className={`w-3 h-3 rounded-full ${
                          hasAnswer ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                      </div>
                    </div>

                    {/* 选择题选项 */}
                    {(question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE') && 
                     question.options && (
                      <div className="mb-3 bg-gray-50 rounded p-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">选项:</p>
                        <div className="space-y-1">
                          {JSON.parse(question.options).map((option: string, optIndex: number) => {
                            const isSelected = question.type === 'SINGLE_CHOICE' 
                              ? studentAnswer === option
                              : Array.isArray(studentAnswer) && studentAnswer.includes(option);
                            
                            return (
                              <div key={optIndex} className={`text-sm p-2 rounded ${
                                isSelected ? 'bg-blue-100 border border-blue-300' : 'bg-white'
                              }`}>
                                {String.fromCharCode(65 + optIndex)}. {option}
                                {isSelected && <span className="ml-2 text-blue-600 font-medium">✓ 已选择</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 学生答案 */}
                    <div className={`rounded p-3 ${
                      hasAnswer ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200'
                    }`}>
                      <p className="text-sm font-medium mb-2">
                        学生答案:
                        {!hasAnswer && <span className="ml-2 text-red-600">(未作答)</span>}
                      </p>
                      {hasAnswer ? (
                        <div className="text-gray-900">
                          {question.type === 'MULTIPLE_CHOICE' && Array.isArray(studentAnswer) ? (
                            <div className="space-y-1">
                              {studentAnswer.map((answer: string, idx: number) => (
                                <div key={idx} className="text-sm">• {answer}</div>
                              ))}
                            </div>
                          ) : (
                            <div className="whitespace-pre-wrap text-sm">{studentAnswer}</div>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 italic text-sm">学生未回答此题</p>
                      )}
                    </div>

                    {/* 参考答案 */}
                    {question.answer && (
                      <div className="mt-3 bg-green-50 border border-green-200 rounded p-3">
                        <p className="text-sm font-medium text-green-700 mb-1">参考答案:</p>
                        <p className="text-sm text-green-600">{question.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
