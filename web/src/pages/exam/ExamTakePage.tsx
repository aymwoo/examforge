import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Clock, FileText, Save, Send, AlertCircle, CheckCircle, X } from "lucide-react";
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
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [showDetailedResults, setShowDetailedResults] = useState(false);

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
      console.log('Received exam data:', response.data);
      console.log('Questions with images:', response.data.questions?.filter(q => q.images && q.images.length > 0));
      
      // 确保images数据不被修改
      const examData = {
        ...response.data,
        questions: response.data.questions?.map(q => ({
          ...q,
          images: q.images || []
        }))
      };
      
      console.log('Setting exam data:', examData);
      setExam(examData);
      setTimeLeft(response.data.duration * 60); // 转换为秒
      
      // 检查是否已提交
      await checkSubmissionStatus();
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

  const checkSubmissionStatus = async () => {
    try {
      // 检查提交状态
      const studentData = JSON.parse(localStorage.getItem('examStudent') || '{}');
      const statusResponse = await api.get(`/api/exams/${examId}/submission-status/${studentData.id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('examToken')}`
        }
      });
      
      if (statusResponse.data.hasSubmitted) {
        setIsSubmitted(true);
        setSubmissionResult(statusResponse.data.submission);
      }
    } catch (error) {
      console.error('检查提交状态失败:', error);
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
    if (!exam || Object.keys(answers).length === 0 || isSubmitted) return;

    const autoSaveTimer = setInterval(() => {
      handleAutoSave();
    }, 30000); // 每30秒自动保存

    return () => clearInterval(autoSaveTimer);
  }, [answers, exam, isSubmitted]);

  const handleAutoSave = async () => {
    if (!student || !examId || isSubmitted) return;
    
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
    setShowProgressModal(true);
    setProgress({ current: 0, total: 0, message: '正在提交...' });

    try {
      // 提交考试
      await api.post(`/api/exams/${examId}/submit`, {
        answers,
        examStudentId: student.id,
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('examToken')}`
        }
      });

      // 监听进度
      const eventSource = new EventSource(`/api/exams/${examId}/submit-progress/${student.id}`);
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'progress') {
          setProgress({
            current: data.current,
            total: data.total,
            message: data.message
          });
        } else if (data.type === 'complete') {
          setSubmissionResult(data.submission);
          setIsSubmitted(true);
          setShowProgressModal(false);
          eventSource.close();
        } else if (data.type === 'error') {
          setError(data.message);
          setShowProgressModal(false);
          eventSource.close();
        }
      };

      eventSource.onerror = () => {
        setError('连接中断，请刷新页面查看结果');
        setShowProgressModal(false);
        eventSource.close();
      };

    } catch (err: any) {
      setError(err.response?.data?.message || '提交失败');
      setShowProgressModal(false);
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

  // 已提交状态的醒目提示
  if (isSubmitted) {
    return (
      <div className="bg-slatebg text-ink-900 antialiased min-h-screen">
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center max-w-md">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-800 mb-4">考试已提交</h2>
            <p className="text-green-700 mb-4">您已成功提交考试，无需重复操作。</p>
            {submissionResult && (
              <div className="bg-white rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600">提交时间: {new Date(submissionResult.submittedAt).toLocaleString()}</p>
                <p className="text-lg font-semibold text-green-600">得分: {submissionResult.score}分</p>
                {exam?.questions?.some(q => q.type === 'ESSAY' || q.type === 'FILL_BLANK') && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-yellow-800">
                        试卷中包含主观题，分数需要教师复核之后才会生效
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-3">
              {submissionResult && (
                <Button 
                  onClick={() => {
                    console.log('submissionResult:', submissionResult);
                    console.log('showDetailedResults before:', showDetailedResults);
                    setShowDetailedResults(true);
                    console.log('showDetailedResults after:', true);
                  }} 
                  variant="outline"
                  className="flex-1"
                >
                  评分详情
                </Button>
              )}
              <Button onClick={() => navigate('/')} className="bg-green-600 hover:bg-green-700 flex-1">
                返回首页
              </Button>
            </div>
            
            {/* 直接显示的测试元素 */}
            {showDetailedResults && (
              <div className="mt-4 p-4 bg-red-500 text-white text-center text-xl font-bold border-4 border-black">
                🚨 测试元素显示成功！showDetailedResults = {String(showDetailedResults)} 🚨
              </div>
            )}
            
          </div>
        </div>
      </div>
    );
  }

  // 使用useEffect在body上添加Modal
  useEffect(() => {
    if (showDetailedResults) {
      const modalDiv = document.createElement('div');
      modalDiv.id = 'exam-modal';
      modalDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(0, 0, 0, 0.8);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
      `;
      
      // 创建评分详情内容
      let answersHtml = '';
      if (submissionResult?.answers && Array.isArray(submissionResult.answers)) {
        answersHtml = submissionResult.answers.map((answer, index) => {
          const question = exam?.questions?.find(q => q.id === answer.questionId);
          return `
            <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 16px; background: white;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h3 style="font-weight: bold; margin: 0;">题目 ${index + 1}</h3>
                <div style="text-align: right;">
                  <div style="font-size: 12px; color: #6b7280;">得分</div>
                  <div style="font-weight: bold; font-size: 18px;">
                    <span style="color: ${answer.score > 0 ? '#059669' : '#dc2626'};">${answer.score}</span>
                    <span style="color: #9ca3af;">/${answer.maxScore}</span>
                  </div>
                </div>
              </div>
              
              <div style="margin-bottom: 12px;">
                <div style="font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 4px;">题目内容:</div>
                <div style="color: #111827;">${question?.content || '题目内容未找到'}</div>
              </div>
              
              <div style="margin-bottom: 12px;">
                <div style="font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 4px;">您的答案:</div>
                <div style="background: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px; padding: 12px;">
                  ${answer.answer || '未作答'}
                </div>
              </div>
              
              ${question?.answer ? `
                <div style="margin-bottom: 12px;">
                  <div style="font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 4px;">参考答案:</div>
                  <div style="background: #dcfce7; border: 1px solid #86efac; border-radius: 8px; padding: 12px;">
                    ${question.answer}
                  </div>
                </div>
              ` : ''}
              
              ${answer.feedback ? `
                <div style="margin-bottom: 12px;">
                  <div style="font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 4px;">评分说明:</div>
                  <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 12px; font-size: 14px;">
                    ${answer.feedback}
                  </div>
                </div>
              ` : ''}
              
              ${question?.explanation ? `
                <div>
                  <div style="font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 4px;">题目解析:</div>
                  <div style="background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; font-size: 14px;">
                    ${question.explanation}
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        }).join('');
      } else {
        answersHtml = '<div style="text-align: center; color: #6b7280; padding: 32px;">暂无评分详情数据</div>';
      }
      
      modalDiv.innerHTML = `
        <div style="
          background-color: white;
          border-radius: 16px;
          max-width: 800px;
          width: 100%;
          max-height: 90vh;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        ">
          <div style="padding: 24px; border-bottom: 1px solid #e5e7eb;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <h2 style="font-size: 20px; font-weight: bold; margin: 0; color: #111827;">评分详情</h2>
              <button onclick="document.getElementById('exam-modal').remove(); window.setShowDetailedResults(false);" style="
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #6b7280;
                padding: 4px;
              ">✕</button>
            </div>
            ${submissionResult ? `
              <div style="margin-top: 16px; display: flex; gap: 16px; flex-wrap: wrap;">
                <div style="font-size: 14px; color: #6b7280;">
                  总分: <span style="font-weight: bold; font-size: 18px; color: #059669;">${submissionResult.score}分</span>
                </div>
                <div style="font-size: 14px; color: #6b7280;">
                  提交时间: ${new Date(submissionResult.submittedAt).toLocaleString()}
                </div>
              </div>
            ` : ''}
          </div>
          
          <div style="padding: 24px; max-height: calc(90vh - 120px); overflow-y: auto;">
            ${answersHtml}
          </div>
        </div>
      `;
      
      document.body.appendChild(modalDiv);
      
      // 设置全局函数供关闭按钮使用
      window.setShowDetailedResults = setShowDetailedResults;
      
      return () => {
        const existingModal = document.getElementById('exam-modal');
        if (existingModal) {
          existingModal.remove();
        }
        delete window.setShowDetailedResults;
      };
    }
  }, [showDetailedResults, submissionResult, exam]);

  const currentQuestion = exam?.questions?.[currentQuestionIndex];
  
  // 调试当前题目
  console.log('Current question index:', currentQuestionIndex);
  console.log('Total questions:', exam?.questions?.length);
  console.log('All questions:', exam?.questions?.map((q, i) => ({ index: i, id: q.id, hasImages: q.images?.length > 0 })));
  console.log('Current question:', currentQuestion);
  console.log('Current question images:', currentQuestion?.images);

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

      {/* 已提交提示 */}
      {isSubmitted && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>注意：</strong>您已经提交过此次考试，无法再次作答。如需查看结果，请联系老师。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 题目导航 */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-border bg-white p-4 sticky top-24">
              <h3 className="font-semibold text-ink-900 mb-4">题目导航</h3>
              <div className="grid grid-cols-5 gap-2">
                {exam.questions?.map((question, index) => (
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
                
                {/* 示例图展示 */}
                {currentQuestion.images && currentQuestion.images.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-ink-900 mb-2">示例图：</h4>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {currentQuestion.images.map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={image.startsWith('data:') ? image : `http://localhost:3000/${image}`}
                            alt={`题目示例图 ${index + 1}`}
                            className="w-full max-h-64 object-contain rounded-lg border border-border bg-slate-50 cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => {
                              // 点击图片放大查看
                              const modal = document.createElement('div');
                              modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4';
                              modal.onclick = () => modal.remove();
                              
                              const img = document.createElement('img');
                              img.src = image.startsWith('data:') ? image : `http://localhost:3000/${image}`;
                              img.className = 'max-w-full max-h-full object-contain rounded-lg';
                              img.onclick = (e) => e.stopPropagation();
                              
                              modal.appendChild(img);
                              document.body.appendChild(modal);
                            }}
                          />
                          {currentQuestion.images.length > 1 && (
                            <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                              {index + 1}/{currentQuestion.images.length}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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

                  {currentQuestionIndex === (exam.questions?.length || 0) - 1 ? (
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
                      onClick={() => setCurrentQuestionIndex(prev => Math.min((exam.questions?.length || 0) - 1, prev + 1))}
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
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/exam/${examId}/result`)}
                >
                  查看详细结果
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowGradingResults(false)}
                >
                  关闭
                </Button>
              </div>
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

      {/* 提交进度Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mb-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600 mx-auto"></div>
              </div>
              <h3 className="text-lg font-semibold mb-4">正在评分中...</h3>
              <div className="mb-4">
                <div className="bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-accent-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%' }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {progress.total > 0 ? `${progress.current}/${progress.total}` : '0/0'} - {progress.message}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
