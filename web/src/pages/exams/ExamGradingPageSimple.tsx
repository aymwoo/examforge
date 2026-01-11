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
  isReviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  gradingDetails?: any; // AI预评分详情
  submittedAt: string;
}

export default function ExamGradingPage() {
  const { id: examId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [exam, setExam] = useState<any>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, any>>({});
  const [manualScores, setManualScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 题型映射函数
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

  const loadExamAndSubmissions = async () => {
    if (!examId) return;
    
    setLoading(true);
    try {
      // 先加载考试信息
      const examResponse = await api.get(`/api/exams/${examId}`);
      setExam(examResponse.data);
      
      // 再加载提交信息
      const submissionsResponse = await api.get(`/api/exams/${examId}/submissions`);
      setSubmissions(submissionsResponse.data);
      
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmissionSelect = (submission: Submission) => {
    setSelectedSubmission(submission);
    setAiSuggestions({});
    
    // 加载评分数据
    if (submission.gradingDetails && submission.gradingDetails.details) {
      const suggestions: Record<string, any> = {};
      const initialScores: Record<string, number> = {};
      
      Object.entries(submission.gradingDetails.details).forEach(([questionId, detail]: [string, any]) => {
        suggestions[questionId] = detail;
        initialScores[questionId] = detail.score || 0;
      });
      
      setAiSuggestions(suggestions);
      setManualScores(initialScores);
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
    
    try {
      const totalScore = Object.values(manualScores).reduce((sum, score) => sum + score, 0);
      
      await api.post(`/api/exams/${examId}/submissions/${selectedSubmission.id}/grade`, {
        scores: manualScores,
        totalScore,
        reviewerId: 'teacher',
      });
      
      alert('评分复核完成！');
      await loadExamAndSubmissions();
      setSelectedSubmission(null);
    } catch (err: any) {
      alert('保存失败: ' + (err.response?.data?.message || err.message));
    }
  };

  useEffect(() => {
    loadExamAndSubmissions();
  }, [examId]);

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <p>加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <p>错误: {error}</p>
        <Button onClick={() => navigate('/exams')}>返回考试列表</Button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <div style={{ marginBottom: '20px' }}>
        <Button onClick={() => navigate(`/exams/${examId}`)}>
          ← 返回
        </Button>
        <h1 style={{ margin: '10px 0' }}>{exam?.title} - 评分管理</h1>
        <p>共 {submissions.length} 份提交</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        {/* 提交列表 */}
        <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px' }}>
          <h3>学生提交</h3>
          {submissions.length === 0 ? (
            <p>暂无提交记录</p>
          ) : (
            <div>
              {submissions.map((submission) => (
                <div 
                  key={submission.id} 
                  onClick={() => handleSubmissionSelect(submission)}
                  style={{ 
                    border: selectedSubmission?.id === submission.id ? '2px solid #007bff' : '1px solid #ddd', 
                    margin: '10px 0', 
                    padding: '10px', 
                    borderRadius: '5px',
                    backgroundColor: selectedSubmission?.id === submission.id ? '#e7f3ff' : '#f9f9f9',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>
                    {submission.student.displayName || submission.student.username}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    提交时间: {new Date(submission.submittedAt).toLocaleString()}
                  </div>
                  {submission.gradingDetails && (
                    <div style={{ fontSize: '14px', color: '#0066cc' }}>
                      AI预评分: {submission.gradingDetails.totalScore}/{submission.gradingDetails.maxTotalScore}
                      {submission.isReviewed ? (
                        <span style={{ marginLeft: '10px', backgroundColor: '#d4edda', padding: '2px 6px', borderRadius: '3px', fontSize: '12px' }}>
                          已复核
                        </span>
                      ) : submission.isAutoGraded && (
                        <span style={{ marginLeft: '10px', backgroundColor: '#fff3cd', padding: '2px 6px', borderRadius: '3px', fontSize: '12px' }}>
                          待复核
                        </span>
                      )}
                    </div>
                  )}
                  {submission.score !== null && (
                    <div style={{ color: '#28a745', fontWeight: 'bold' }}>
                      最终得分: {submission.score}/{exam?.totalScore}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 评分区域 */}
        <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px' }}>
          {selectedSubmission ? (
            <div>
              <h3>评分 - {selectedSubmission.student.displayName || selectedSubmission.student.username}</h3>
              
              {Object.keys(aiSuggestions).length > 0 ? (
                <div>
                  <div style={{ backgroundColor: '#e7f3ff', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>
                    <h4>答题概览</h4>
                    <p>总题数: {exam?.examQuestions?.length || 0}</p>
                    <p>满分: {exam?.totalScore}</p>
                    <p>提交时间: {new Date(selectedSubmission.submittedAt).toLocaleString()}</p>
                  </div>

                  {exam?.examQuestions?.map((examQuestion: any, index: number) => {
                    const question = examQuestion.question;
                    const suggestion = aiSuggestions[question.id];
                    const studentAnswer = selectedSubmission.answers[question.id];

                    if (!suggestion) return null;

                    return (
                      <div key={question.id} style={{ border: '1px solid #ddd', margin: '10px 0', padding: '15px', borderRadius: '5px' }}>
                        <h5>题目 {index + 1}: {question.content}</h5>
                        
                        <div style={{ backgroundColor: '#f8f9fa', padding: '10px', margin: '10px 0', borderRadius: '3px' }}>
                          <strong>学生答案:</strong> {studentAnswer || '未作答'}
                        </div>

                        {question.answer && (
                          <div style={{ backgroundColor: '#d4edda', padding: '10px', margin: '10px 0', borderRadius: '3px' }}>
                            <strong>参考答案:</strong> {question.answer}
                          </div>
                        )}

                        {suggestion.type === 'objective' ? (
                          <div style={{ backgroundColor: suggestion.isCorrect ? '#d4edda' : '#f8d7da', padding: '10px', margin: '10px 0', borderRadius: '3px' }}>
                            <strong>{suggestion.isCorrect ? '✓ 答案正确' : '✗ 答案错误'}</strong>
                            <span style={{ float: 'right' }}>{suggestion.score} / {suggestion.maxScore} 分</span>
                          </div>
                        ) : suggestion.aiGrading && (
                          <div style={{ backgroundColor: '#e2e3f0', padding: '10px', margin: '10px 0', borderRadius: '3px' }}>
                            <strong>AI评分建议:</strong> {suggestion.aiGrading.suggestedScore} / {suggestion.maxScore} 分
                            <br />
                            <strong>评分理由:</strong> {suggestion.aiGrading.reasoning}
                            <br />
                            <strong>置信度:</strong> {Math.round(suggestion.aiGrading.confidence * 100)}%
                          </div>
                        )}

                        <div style={{ backgroundColor: '#fff3cd', padding: '10px', margin: '10px 0', borderRadius: '3px' }}>
                          <label><strong>教师评分 (满分 {suggestion.maxScore} 分):</strong></label>
                          <input
                            type="number"
                            min="0"
                            max={suggestion.maxScore}
                            step="0.5"
                            value={manualScores[question.id] || 0}
                            onChange={(e) => handleScoreChange(question.id, parseFloat(e.target.value) || 0)}
                            style={{ marginLeft: '10px', padding: '5px', width: '80px' }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  <div style={{ backgroundColor: '#fff3cd', padding: '15px', borderRadius: '5px', marginTop: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>教师最终评分: {Object.values(manualScores).reduce((sum, score) => sum + score, 0)} / {exam?.totalScore}</strong>
                      </div>
                      <div>
                        {selectedSubmission.isReviewed && (
                          <span style={{ backgroundColor: '#d4edda', padding: '5px 10px', borderRadius: '3px', marginRight: '10px' }}>
                            已复核
                          </span>
                        )}
                        <Button onClick={handleSaveGrading}>
                          {selectedSubmission.isReviewed ? '重新复核' : 
                           selectedSubmission.score !== null ? '复核评分' : '确认评分'}
                        </Button>
                      </div>
                    </div>
                    {selectedSubmission.isAutoGraded && !selectedSubmission.isReviewed && 
                     Array.isArray(selectedSubmission.answers) && selectedSubmission.answers.some(answer => 
                       ['ESSAY', 'FILL_BLANK'].includes(
                         exam?.examQuestions?.find(eq => eq.question.id === answer.questionId)?.question.type
                       )
                     ) && (
                      <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8d7da', borderRadius: '3px' }}>
                        ⚠️ 此提交包含AI评分，需要教师复核确认
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <p>暂无评分数据</p>
                  <p style={{ fontSize: '14px', color: '#666' }}>请检查提交是否包含有效答案</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <h3>评分区域</h3>
              <p>请从左侧选择一个学生提交进行评分</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
