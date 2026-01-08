import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Clock, FileText, Save, Send, AlertCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import api from "@/services/api";
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';

interface Question {
  id: string;
  content: string;
  type: string;
  options?: string[];
  score: number;
  order: number;
}

interface ExamInfo {
  id: string;
  title: string;
  description?: string;
  duration: number;
  totalScore: number;
  questions: Question[];
}

interface ExamStudent {
  id: string;
  username: string;
  displayName?: string;
}

export default function ExamTakePage() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<ExamInfo | null>(null);
  const [student, setStudent] = useState<ExamStudent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [showGradingResults, setShowGradingResults] = useState(false);
  const [gradingResults, setGradingResults] = useState<any>(null);

  useEffect(() => {
    // 检查是否已登录
    const token = localStorage.getItem('examToken');
    const studentData = localStorage.getItem('examStudent');
    
    if (!token || !studentData) {
      navigate(`/exam/${examId}/login`);
      return;
    }

    try {
      setStudent(JSON.parse(studentData));
      loadExamInfo();
    } catch (err) {
      navigate(`/exam/${examId}/login`);
    }
  }, [examId, navigate]);

  const loadExamInfo = async () => {
    if (!examId) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/api/exams/${examId}/take`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('examToken')}`
        }
      });
      setExam(response.data);
      setTimeLeft(response.data.duration * 60); // 转换为秒
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('examToken');
        localStorage.removeItem('examStudent');
        navigate(`/exam/${examId}/login`);
      } else {
        setError(err.response?.data?.message || '加载考试信息失败');
      }
    } finally {
      setLoading(false);
    }
  };

  // 倒计时
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleSubmitExam(); // 时间到自动提交
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // 自动保存
  useEffect(() => {
    if (!exam || Object.keys(answers).length === 0) return;

    const autoSaveTimer = setInterval(() => {
      handleAutoSave();
    }, 30000); // 每30秒自动保存

    return () => clearInterval(autoSaveTimer);
  }, [answers, exam]);

  const handleAutoSave = async () => {
    if (!student || !examId) return;
    
    setAutoSaving(true);
    try {
      await api.post(`/api/exams/${examId}/save-answers`, {
        answers,
        examStudentId: student.id,
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('examToken')}`
        }
      });
    } catch (err) {
      console.error('自动保存失败:', err);
    } finally {
      setAutoSaving(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmitExam = async () => {
    if (!student || !examId) return;

    if (!confirm('确定要提交考试吗？提交后将无法修改答案。')) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post(`/api/exams/${examId}/submit`, {
        answers,
        examStudentId: student.id,
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('examToken')}`
        }
      });

      // 显示评分结果
      setGradingResults(response.data.gradingResults);
      setShowGradingResults(true);
      
    } catch (err: any) {
      setError(err.response?.data?.message || '提交失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    if (confirm('确定要退出考试吗？未保存的答案将丢失。')) {
      localStorage.removeItem('examToken');
      localStorage.removeItem('examStudent');
      navigate(`/exam/${examId}/login`);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="bg-slatebg text-ink-900 antialiased min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-ink-700">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slatebg text-ink-900 antialiased min-h-screen flex items-center justify-center">
        <div className="rounded-2xl border border-border bg-white p-6 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-ink-900 mb-4">{error}</p>
          <Button onClick={() => navigate(`/exam/${examId}/login`)}>重新登录</Button>
        </div>
      </div>
    );
  }

  if (!exam) return null;

  const currentQuestion = exam.questions[currentQuestionIndex];

  return (
    <div className="bg-slatebg text-ink-900 antialiased min-h-screen">
      {/* 顶部导航 */}
      <div className="border-b border-border bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <FileText className="h-6 w-6 text-accent-600" />
              <div>
                <h1 className="text-lg font-semibold text-ink-900">{exam.title}</h1>
                <p className="text-sm text-ink-600">
                  {student?.displayName || student?.username}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 text-sm font-semibold ${
                timeLeft < 300 ? 'text-red-600' : 'text-ink-600'
              }`}>
                <Clock className="h-4 w-4" />
                <span>{formatTime(timeLeft)}</span>
              </div>
              {autoSaving && (
                <div className="flex items-center gap-2 text-xs text-blue-600">
                  <Save className="h-3 w-3" />
                  <span>保存中...</span>
                </div>
              )}
              <Button variant="outline" onClick={handleLogout}>
                退出考试
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 题目导航 */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-border bg-white p-4 sticky top-24">
              <h3 className="font-semibold text-ink-900 mb-4">题目导航</h3>
              <div className="grid grid-cols-5 gap-2">
                {exam.questions.map((question, index) => (
                  <button
                    key={question.id}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`w-8 h-8 rounded text-xs font-semibold transition-colors ${
                      index === currentQuestionIndex
                        ? 'bg-blue-500 text-white'
                        : answers[question.id] !== undefined
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : 'bg-gray-100 text-gray-600 border border-gray-300'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              <div className="mt-4 text-xs text-ink-600">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>当前题目</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                  <span>已答题</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
                  <span>未答题</span>
                </div>
              </div>
            </div>
          </div>

          {/* 题目内容 */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-border bg-white p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-ink-900">
                    第 {currentQuestionIndex + 1} 题
                  </h2>
                  <span className="text-sm text-ink-600">
                    {currentQuestion.score} 分
                  </span>
                </div>
                <div className="prose max-w-none">
                  <p className="text-ink-900">{currentQuestion.content}</p>
                </div>
              </div>

              {/* 答题区域 */}
              <div className="mb-6">
                {currentQuestion.type === 'SINGLE_CHOICE' && (
                  <div className="space-y-3">
                    {currentQuestion.options?.map((option, index) => {
                      // 处理选项格式：可能是字符串或对象
                      const optionText = typeof option === 'string' ? option : 
                        (option as any)?.content || (option as any)?.label || String(option);
                      return (
                        <label key={index} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name={`question-${currentQuestion.id}`}
                            value={optionText}
                            checked={answers[currentQuestion.id] === optionText}
                            onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-ink-900">{String.fromCharCode(65 + index)}. {optionText}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {currentQuestion.type === 'MULTIPLE_CHOICE' && (
                  <div className="space-y-3">
                    {currentQuestion.options?.map((option, index) => {
                      // 处理选项格式：可能是字符串或对象
                      const optionText = typeof option === 'string' ? option : 
                        (option as any)?.content || (option as any)?.label || String(option);
                      return (
                        <label key={index} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            value={optionText}
                            checked={(answers[currentQuestion.id] || []).includes(optionText)}
                            onChange={(e) => {
                              const currentAnswers = answers[currentQuestion.id] || [];
                              if (e.target.checked) {
                                handleAnswerChange(currentQuestion.id, [...currentAnswers, optionText]);
                              } else {
                                handleAnswerChange(currentQuestion.id, currentAnswers.filter((a: string) => a !== optionText));
                              }
                            }}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-ink-900">{String.fromCharCode(65 + index)}. {optionText}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {(currentQuestion.type === 'FILL_BLANK' || currentQuestion.type === 'SHORT_ANSWER' || currentQuestion.type === 'ESSAY') && (
                  <div className="border border-border rounded-xl overflow-hidden">
                    <MDEditor
                      value={answers[currentQuestion.id] || ''}
                      onChange={(value) => handleAnswerChange(currentQuestion.id, value || '')}
                      preview="edit"
                      hideToolbar={currentQuestion.type === 'FILL_BLANK'}
                      visibleDragbar={false}
                      height={currentQuestion.type === 'ESSAY' ? 300 : currentQuestion.type === 'SHORT_ANSWER' ? 200 : 100}
                      data-color-mode="light"
                    />
                  </div>
                )}
              </div>

              {/* 导航按钮 */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                >
                  上一题
                </Button>

                <div className="flex gap-3">
                  <Button
                    onClick={handleAutoSave}
                    disabled={autoSaving}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {autoSaving ? '保存中...' : '保存答案'}
                  </Button>

                  {currentQuestionIndex === exam.questions.length - 1 ? (
                    <Button
                      onClick={handleSubmitExam}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                    >
                      <Send className="h-4 w-4" />
                      {isSubmitting ? '提交中...' : '提交考试'}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setCurrentQuestionIndex(prev => Math.min(exam.questions.length - 1, prev + 1))}
                    >
                      下一题
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 评分结果模态框 */}
      {showGradingResults && gradingResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">考试评分结果</h2>
              <Button
                variant="outline"
                onClick={() => navigate(`/exam/${examId}/result`)}
              >
                查看详细结果
              </Button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">总分统计</h3>
                <p className="text-lg">
                  总得分：<span className="font-bold text-blue-600">{gradingResults.totalScore}</span> / {gradingResults.maxTotalScore}
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">题目评分详情</h3>
                {Object.entries(gradingResults.details || {}).map(([questionId, detail]: [string, any], index: number) => (
                  <div key={questionId} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">第 {index + 1} 题</span>
                      <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {detail.score} / {detail.maxScore} 分
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>学生答案：</strong>
                        <div className="bg-gray-50 p-2 rounded mt-1">{detail.studentAnswer}</div>
                      </div>
                      
                      {detail.aiGrading && (
                        <div className="bg-blue-50 p-2 rounded">
                          <strong>AI评价：</strong>{detail.aiGrading.reasoning}
                          {detail.aiGrading.suggestions && (
                            <div className="mt-1 text-gray-600">
                              <strong>建议：</strong>{detail.aiGrading.suggestions}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
