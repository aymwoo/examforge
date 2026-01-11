import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Trash2, Plus, Check, Users, BookOpen, CheckCircle, Filter, Clock } from "lucide-react";
import Button from "@/components/ui/Button";
import ExamLayout from "@/components/ExamLayout";
import { getExamById, deleteExam, addQuestionToExam, getExamStudents, addExamStudent, generateExamStudents, deleteExamStudent, type Exam } from "@/services/exams";
import { listQuestions, type Question } from "@/services/questions";
import api from "@/services/api";

export default function ExamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    title?: string;
    description?: string;
    duration?: number;
    totalScore?: number;
    startTime?: string;
    endTime?: string;
    status?: string;
  }>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [showQuestionBank, setShowQuestionBank] = useState(false);

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
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    type: '',
    difficulty: '',
    knowledgePoint: '',
    tags: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [addingQuestions, setAddingQuestions] = useState(false);
  const [activeTab, setActiveTab] = useState<'questions' | 'students'>('questions');
  const [students, setStudents] = useState<any[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({ username: '', password: '', displayName: '' });

  const loadExam = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getExamById(id);
      setExam(data);
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(
        axiosError.response?.data?.message || axiosError.message || "加载失败",
      );
    } finally {
      setLoading(false);
    }
  };

  // ... 其他函数保持不变 ...

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
    <ExamLayout activeTab="details">
      {/* 页面内容简化版本 */}
      <div className="text-center py-8">
        <p className="text-gray-600">考试详情页面内容正在重构中...</p>
        <p className="text-sm text-gray-500 mt-2">请使用上方的标签页导航到其他功能</p>
      </div>
    </ExamLayout>
  );
}
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    title?: string;
    description?: string;
    duration?: number;
    totalScore?: number;
    startTime?: string;
    endTime?: string;
    status?: string;
  }>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [showQuestionBank, setShowQuestionBank] = useState(false);

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
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    type: '',
    difficulty: '',
    knowledgePoint: '',
    tags: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [addingQuestions, setAddingQuestions] = useState(false);
  const [activeTab, setActiveTab] = useState<'questions' | 'students'>('questions');
  const [students, setStudents] = useState<any[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({ username: '', password: '', displayName: '' });

  const loadExam = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getExamById(id);
      setExam(data);
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(
        axiosError.response?.data?.message || axiosError.message || "加载失败",
      );
    } finally {
      setLoading(false);
    }
  };

  const updateExamField = async (field: string, value: any) => {
    if (!id) return;
    
    // 状态变更需要确认
    if (field === 'status') {
      const statusMessages = {
        'PUBLISHED': '发布考试后，学生将可以参加考试。确定要发布吗？',
        'DRAFT': '撤回到草稿状态后，学生将无法参加考试。确定要撤回吗？',
        'ARCHIVED': '归档考试后，考试将被标记为已结束。确定要归档吗？'
      };
      
      if (!confirm(statusMessages[value as keyof typeof statusMessages] || '确定要更改状态吗？')) {
        return;
      }
      
      // 发布前检查
      if (value === 'PUBLISHED') {
        if (!exam?.examQuestions || exam.examQuestions.length === 0) {
          alert('考试至少需要包含一道题目才能发布');
          return;
        }
      }
    }
    
    try {
      await api.put(`/api/exams/${id}`, { [field]: value });
      await loadExam();
      setEditingField(null);
      setEditValues({});
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || '更新失败');
    }
  };

  const startEditing = (field: string, currentValue: any) => {
    setEditingField(field);
    setEditValues({ [field]: currentValue });
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValues({});
  };

  const saveField = (field: string) => {
    const value = editValues[field as keyof typeof editValues];
    if (value !== undefined) {
      updateExamField(field, value);
    }
  };

  useEffect(() => {
    loadExam();
  }, [id]);

  // Auto-add questions from URL params
  useEffect(() => {
    const addQuestions = searchParams.get('addQuestions');
    if (addQuestions && exam) {
      const questionIds = addQuestions.split(',').filter(Boolean);
      if (questionIds.length > 0) {
        // Auto-add questions and remove the parameter
        handleAutoAddQuestions(questionIds);
        setSearchParams(prev => {
          const newParams = new URLSearchParams(prev);
          newParams.delete('addQuestions');
          return newParams;
        });
      }
    }
  }, [exam, searchParams]);

  const handleAutoAddQuestions = async (questionIds: string[]) => {
    if (!id) return;
    
    try {
      for (const questionId of questionIds) {
        await addQuestionToExam(id, questionId, 1); // Default score of 1
      }
      await loadExam(); // Reload to show added questions
    } catch (err: unknown) {
      console.error('Auto-add questions failed:', err);
      // Don't show error to user as this is automatic
    }
  };

  const loadQuestionBank = async () => {
    setQuestionsLoading(true);
    try {
      const response = await listQuestions({ page: 1, limit: 100 });
      setQuestions(response.data);
    } catch (err: unknown) {
      console.error("加载题库失败:", err);
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleToggleQuestionBank = () => {
    if (!showQuestionBank) {
      loadQuestionBank();
    }
    setShowQuestionBank((prev) => !prev);
  };

  const handleDeleteExam = async () => {
    if (!confirm("确定要删除这个考试吗？此操作不可恢复。")) return;

    try {
      await deleteExam(id!);
      navigate("/exams");
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(
        axiosError.response?.data?.message || axiosError.message || "删除失败",
      );
    }
  };

  const handleAddQuestion = (questionId: string) => {
    // 如果题目已经在考试中，不允许选择
    if (questionInExamIds.includes(questionId)) {
      return;
    }
    
    if (selectedQuestions.includes(questionId)) {
      setSelectedQuestions((prev) => prev.filter((id) => id !== questionId));
    } else {
      setSelectedQuestions((prev) => [...prev, questionId]);
    }
  };

  const handleAddSelectedQuestions = async () => {
    if (selectedQuestions.length === 0) return;
    
    setAddingQuestions(true);
    try {
      // 为每个选中的题目添加到考试中
      for (const questionId of selectedQuestions) {
        const nextOrder = (exam?.examQuestions?.length || 0) + 1;
        await addQuestionToExam(id!, {
          questionId,
          order: nextOrder,
          score: 5, // 默认5分
        });
      }
      
      // 重新加载考试数据
      await loadExam();
      
      // 清空选中的题目
      setSelectedQuestions([]);
      
      // 收起题库
      setShowQuestionBank(false);
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(
        axiosError.response?.data?.message || axiosError.message || "添加题目失败",
      );
    } finally {
      setAddingQuestions(false);
    }
  };

  const loadStudents = async () => {
    if (!id) return;
    setStudentsLoading(true);
    try {
      const data = await getExamStudents(id);
      setStudents(data);
    } catch (err: unknown) {
      console.error("加载学生列表失败:", err);
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleAddStudent = async () => {
    if (!newStudent.username || !newStudent.password) return;
    
    try {
      await addExamStudent(id!, newStudent);
      setNewStudent({ username: '', password: '', displayName: '' });
      setShowAddStudent(false);
      await loadStudents();
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(
        axiosError.response?.data?.message || axiosError.message || "添加学生失败",
      );
    }
  };

  const handleGenerateStudents = async () => {
    const count = prompt("请输入要生成的学生账号数量:");
    if (!count || isNaN(Number(count))) return;
    
    try {
      await generateExamStudents(id!, Number(count));
      await loadStudents();
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(
        axiosError.response?.data?.message || axiosError.message || "生成学生账号失败",
      );
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm("确定要删除这个学生账号吗？")) return;
    
    try {
      await deleteExamStudent(id!, studentId);
      await loadStudents();
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(
        axiosError.response?.data?.message || axiosError.message || "删除学生失败",
      );
    }
  };

  const filteredQuestions = questions.filter((question) => {
    // 搜索词筛选
    const matchesSearch = !searchTerm || 
                         question.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         question.tags.join(' ').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (question.knowledgePoint && question.knowledgePoint.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // 题型筛选
    const matchesType = !filters.type || question.type === filters.type;
    
    // 难度筛选
    const matchesDifficulty = !filters.difficulty || question.difficulty.toString() === filters.difficulty;
    
    // 知识点筛选
    const matchesKnowledgePoint = !filters.knowledgePoint || 
                                 (question.knowledgePoint && question.knowledgePoint.toLowerCase().includes(filters.knowledgePoint.toLowerCase()));
    
    // 标签筛选
    const matchesTags = !filters.tags || 
                       question.tags.join(' ').toLowerCase().includes(filters.tags.toLowerCase());
    
    return matchesSearch && matchesType && matchesDifficulty && matchesKnowledgePoint && matchesTags;
  });

  const questionInExamIds = exam?.examQuestions?.map((eq: any) => eq.question?.id || eq.questionId) || [];

  if (loading) {
    return (
      <div className="bg-slatebg text-ink-900 antialiased min-h-screen pt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-white p-12 text-center">
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
            <p className="text-ink-900 mb-4">{error}</p>
            <Button onClick={() => navigate("/exams")}>返回</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="bg-slatebg text-ink-900 antialiased min-h-screen pt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-white p-12 text-center">
            <p className="text-ink-700">考试不存在</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slatebg text-ink-900 antialiased min-h-screen pt-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/exams")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
              考试详情
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => navigate(`/exams/${id}/grading`)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              评分管理
            </Button>
            
            {/* 快速状态切换 */}
            <div className="flex items-center gap-2">
              {exam.status === 'DRAFT' && (
                <Button
                  onClick={() => updateExamField('status', 'PUBLISHED')}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4" />
                  发布考试
                </Button>
              )}
              {exam.status === 'PUBLISHED' && (
                <>
                  <Button
                    onClick={() => updateExamField('status', 'DRAFT')}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Clock className="h-4 w-4" />
                    撤回草稿
                  </Button>
                  <Button
                    onClick={() => updateExamField('status', 'ARCHIVED')}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <BookOpen className="h-4 w-4" />
                    归档考试
                  </Button>
                </>
              )}
              {exam.status === 'ARCHIVED' && (
                <Button
                  onClick={() => updateExamField('status', 'PUBLISHED')}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <CheckCircle className="h-4 w-4" />
                  重新发布
                </Button>
              )}
            </div>
            
            <button
              onClick={handleDeleteExam}
              className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              删除
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-border bg-white p-4 text-center">
            <p className="text-ink-900">{error}</p>
          </div>
        )}

        {/* 快速操作区域 */}
        <div className="mb-8 rounded-3xl border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-white p-8 shadow-lg">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-full bg-purple-500 p-2">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-purple-900">快速操作</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Button 
              onClick={() => navigate(`/exams/${id}/grading`)}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-xl"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              评分管理
            </Button>
            
            <Button 
              onClick={() => navigate(`/exams/${id}/analytics`)}
              className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white p-4 rounded-xl"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              统计分析
            </Button>
            
            <Button 
              onClick={() => window.open(`/exam/${id}/login`, '_blank')}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white p-4 rounded-xl"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              预览考试
            </Button>
            
            <Button 
              variant="outline"
              className="flex items-center gap-2 border-2 border-orange-300 text-orange-600 hover:bg-orange-50 p-4 rounded-xl"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              导出数据
            </Button>
            
            <Button 
              variant="outline"
              className="flex items-center gap-2 border-2 border-red-300 text-red-600 hover:bg-red-50 p-4 rounded-xl"
              onClick={() => handleDeleteExam()}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              删除考试
            </Button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* 基本信息区域 */}
          <div className="rounded-3xl border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white p-8 shadow-lg">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-full bg-blue-500 p-2">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-blue-900">
                考试信息
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-ink-700">
                  考试标题
                </label>
                {editingField === 'title' ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 rounded-xl border border-border bg-white px-3 py-2 text-sm"
                      value={editValues.title || ''}
                      onChange={(e) => setEditValues(prev => ({ ...prev, title: e.target.value }))}
                      autoFocus
                    />
                    <Button onClick={() => saveField('title')} className="px-3">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={cancelEditing} className="px-3">
                      ✕
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-base text-ink-900 flex-1">{exam.title}</p>
                    <Button 
                      variant="outline" 
                      onClick={() => startEditing('title', exam.title)}
                      className="px-3 py-1 text-xs"
                    >
                      编辑
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink-700">
                  考试描述
                </label>
                {editingField === 'description' ? (
                  <div className="flex gap-2">
                    <textarea
                      className="flex-1 rounded-xl border border-border bg-white px-3 py-2 text-sm"
                      rows={3}
                      value={editValues.description || ''}
                      onChange={(e) => setEditValues(prev => ({ ...prev, description: e.target.value }))}
                      autoFocus
                    />
                    <div className="flex flex-col gap-2">
                      <Button onClick={() => saveField('description')} className="px-3">
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" onClick={cancelEditing} className="px-3">
                        ✕
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <p className="text-base text-ink-900 flex-1">{exam.description || '暂无描述'}</p>
                    <Button 
                      variant="outline" 
                      onClick={() => startEditing('description', exam.description || '')}
                      className="px-3 py-1 text-xs"
                    >
                      编辑
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="text-sm font-semibold text-ink-700 whitespace-nowrap">
                    学生账号模式
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { value: 'PERMANENT', label: '固定账号' },
                      { value: 'TEMPORARY_IMPORT', label: '临时导入' },
                      { value: 'TEMPORARY_REGISTER', label: '自主注册' }
                    ].map((mode) => (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={async () => {
                          const currentModes = exam.accountModes || [];
                          const isSelected = currentModes.includes(mode.value);
                          let newModes;
                          if (isSelected) {
                            // 取消选择，但至少保留一个
                            if (currentModes.length > 1) {
                              newModes = currentModes.filter(m => m !== mode.value);
                            } else {
                              return; // 不允许全部取消
                            }
                          } else {
                            // 添加选择
                            newModes = [...currentModes, mode.value];
                          }
                          
                          try {
                            console.log('Updating accountModes:', newModes);
                            console.log('Current exam accountModes:', exam.accountModes);
                            
                            // 确保发送的是有效的枚举值
                            const validModes = newModes.filter(mode => 
                              ['PERMANENT', 'TEMPORARY_IMPORT', 'TEMPORARY_REGISTER'].includes(mode)
                            );
                            
                            if (validModes.length === 0) {
                              setError('至少需要选择一种账号模式');
                              return;
                            }
                            
                            console.log('Valid modes to send:', validModes);
                            await api.put(`/api/exams/${id}`, { accountModes: validModes });
                            await loadExam();
                          } catch (err: any) {
                            console.error('Update error:', err.response?.data);
                            console.error('Error message array:', err.response?.data?.message);
                            console.error('Full error:', err);
                            
                            const errorMsg = Array.isArray(err.response?.data?.message) 
                              ? err.response.data.message.join(', ')
                              : err.response?.data?.message || err.response?.data?.error || '更新失败';
                            
                            setError(errorMsg);
                          }
                        }}
                        className={`px-4 py-2 text-sm rounded-lg border transition-colors whitespace-nowrap ${
                          (exam.accountModes || []).includes(mode.value)
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-blue-400 hover:bg-blue-50'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-xs text-ink-600">
                  已启用 {exam.accountModes?.length || 0} 种登录方式，学生可以选择任意一种方式登录
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink-700">
                    考试时长
                  </label>
                  {editingField === 'duration' ? (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        className="flex-1 rounded-xl border border-border bg-white px-3 py-2 text-sm"
                        value={editValues.duration || ''}
                        onChange={(e) => setEditValues(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                        autoFocus
                      />
                      <span className="flex items-center text-sm text-ink-600">分钟</span>
                      <Button onClick={() => saveField('duration')} className="px-3">
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" onClick={cancelEditing} className="px-3">
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-base text-ink-900 flex-1">{exam.duration} 分钟</p>
                      <Button 
                        variant="outline" 
                        onClick={() => startEditing('duration', exam.duration)}
                        className="px-3 py-1 text-xs"
                      >
                        编辑
                      </Button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink-700">
                    总分
                  </label>
                  {editingField === 'totalScore' ? (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        className="flex-1 rounded-xl border border-border bg-white px-3 py-2 text-sm"
                        value={editValues.totalScore || ''}
                        onChange={(e) => setEditValues(prev => ({ ...prev, totalScore: parseInt(e.target.value) }))}
                        autoFocus
                      />
                      <Button onClick={() => saveField('totalScore')} className="px-3">
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" onClick={cancelEditing} className="px-3">
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-base text-ink-900 flex-1">{exam.totalScore}</p>
                      <Button 
                        variant="outline" 
                        onClick={() => startEditing('totalScore', exam.totalScore)}
                        className="px-3 py-1 text-xs"
                      >
                        编辑
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink-700">
                    开始时间
                  </label>
                  {editingField === 'startTime' ? (
                    <div className="flex gap-2">
                      <input
                        type="datetime-local"
                        className="flex-1 rounded-xl border border-border bg-white px-3 py-2 text-sm"
                        value={editValues.startTime || ''}
                        onChange={(e) => setEditValues(prev => ({ ...prev, startTime: e.target.value }))}
                        autoFocus
                      />
                      <Button onClick={() => saveField('startTime')} className="px-3">
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" onClick={cancelEditing} className="px-3">
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-base text-ink-900 flex-1">
                        {exam.startTime ? new Date(exam.startTime).toLocaleString() : '未设置'}
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => startEditing('startTime', exam.startTime ? new Date(exam.startTime).toISOString().slice(0, 16) : '')}
                        className="px-3 py-1 text-xs"
                      >
                        编辑
                      </Button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink-700">
                    结束时间
                  </label>
                  {editingField === 'endTime' ? (
                    <div className="flex gap-2">
                      <input
                        type="datetime-local"
                        className="flex-1 rounded-xl border border-border bg-white px-3 py-2 text-sm"
                        value={editValues.endTime || ''}
                        onChange={(e) => setEditValues(prev => ({ ...prev, endTime: e.target.value }))}
                        autoFocus
                      />
                      <Button onClick={() => saveField('endTime')} className="px-3">
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" onClick={cancelEditing} className="px-3">
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-base text-ink-900 flex-1">
                        {exam.endTime ? new Date(exam.endTime).toLocaleString() : '未设置'}
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => startEditing('endTime', exam.endTime ? new Date(exam.endTime).toISOString().slice(0, 16) : '')}
                        className="px-3 py-1 text-xs"
                      >
                        编辑
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink-700">
                    状态
                  </label>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-lg px-3 py-1 text-sm font-semibold ${
                        exam.status === "PUBLISHED"
                          ? "bg-green-100 text-green-800"
                          : exam.status === "ARCHIVED"
                          ? "bg-gray-100 text-gray-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {exam.status === "PUBLISHED" ? "已发布" : 
                       exam.status === "ARCHIVED" ? "已归档" : "草稿"}
                      </span>
                    </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink-700">
                    创建时间
                  </label>
                  <p className="text-base text-ink-900">
                    {new Date(exam.createdAt).toLocaleString("zh-CN")}
                  </p>
                </div>
              </div>

              {/* 考试链接 */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-ink-700">
                  考试链接
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    className="flex-1 rounded-xl border border-border bg-slate-50 px-3 py-2 text-sm text-ink-700"
                    value={`${window.location.origin}/exam/${exam.id}`}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/exam/${exam.id}`);
                      alert('链接已复制到剪贴板');
                    }}
                  >
                    复制
                  </Button>
                </div>
                <p className="mt-1 text-xs text-ink-600">
                  学生通过此链接访问考试
                </p>
              </div>
            </div>
          </div>

          {/* 题目管理区域 */}
          <div className="rounded-3xl border-2 border-green-100 bg-gradient-to-br from-green-50 to-white p-8 shadow-lg">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-full bg-green-500 p-2">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-green-900">
                题目管理
              </h2>
            </div>
            
            {/* 标签页切换 */}
            <div className="mb-6 flex border-b-2 border-green-200">
              <button
                onClick={() => setActiveTab('questions')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors rounded-t-lg ${
                  activeTab === 'questions'
                    ? 'border-b-2 border-green-500 text-green-700 bg-green-100'
                    : 'text-gray-600 hover:text-green-700 hover:bg-green-50'
                }`}
              >
                <BookOpen className="h-4 w-4" />
                考试题目 ({exam.examQuestions?.length || 0})
              </button>
              <button
                onClick={() => {
                  setActiveTab('students');
                  if (students.length === 0) loadStudents();
                }}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors rounded-t-lg ${
                  activeTab === 'students'
                    ? 'border-b-2 border-green-500 text-green-700 bg-green-100'
                    : 'text-gray-600 hover:text-green-700 hover:bg-green-50'
                }`}
              >
                <Users className="h-4 w-4" />
                学生管理 ({students.length})
              </button>
            </div>

            {/* 题目管理标签页 */}
            {activeTab === 'questions' && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-ink-900">
                    考试题目 ({exam.examQuestions?.length || 0} 题)
                  </h2>
                  <div className="flex items-center gap-2">
                    {showQuestionBank && selectedQuestions.length > 0 && (
                      <Button
                        onClick={handleAddSelectedQuestions}
                        disabled={addingQuestions}
                        className="inline-flex items-center gap-2"
                      >
                        <Check className="h-4 w-4" />
                        {addingQuestions 
                          ? "添加中..." 
                          : `添加到考试 (${selectedQuestions.length})`
                        }
                      </Button>
                    )}
                    <Button
                      onClick={handleToggleQuestionBank}
                      className="inline-flex items-center gap-2"
                      variant="outline"
                    >
                      <Plus className="h-4 w-4" />
                      {showQuestionBank ? "收起题库" : "从题库添加"}
                    </Button>
                  </div>
                </div>

            {exam.examQuestions && exam.examQuestions.length > 0 ? (
              <div className="space-y-3">
                {exam.examQuestions
                  .sort((a: any, b: any) => a.order - b.order)
                  .map((examQuestion: any) => (
                    <div
                      key={examQuestion.id}
                      className="rounded-2xl border border-border bg-slate-50 p-4"
                    >
                      <div className="mb-3 flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-base font-medium text-ink-900">
                            {examQuestion.question?.content || '题目内容加载失败'}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm("确定要从考试中移除这道题目吗？")) {
                              // TODO: 实现移除功能
                              alert("移除功能开发中");
                              // await removeQuestionFromExam(exam.id, examQuestion.questionId);
                              // loadExam();
                              // setSelectedQuestions((prev) => prev.filter((id) => id !== examQuestion.questionId));
                            }
                          }}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
                        >
                          移除
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-700">
                        <span className="flex items-center gap-1">
                          <span className="font-semibold text-ink-900">分值:</span>
                          <span>{examQuestion.score}</span>
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          examQuestion.question?.type === 'SINGLE_CHOICE' ? 'bg-blue-100 text-blue-700' :
                          examQuestion.question?.type === 'MULTIPLE_CHOICE' ? 'bg-green-100 text-green-700' :
                          examQuestion.question?.type === 'FILL_BLANK' ? 'bg-yellow-100 text-yellow-700' :
                          examQuestion.question?.type === 'SHORT_ANSWER' ? 'bg-purple-100 text-purple-700' :
                          examQuestion.question?.type === 'ESSAY' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {getQuestionTypeName(examQuestion.question?.type || '')}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          examQuestion.question?.difficulty === 1 ? 'bg-green-100 text-green-700' :
                          examQuestion.question?.difficulty === 2 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {examQuestion.question?.difficulty === 1 ? '简单' :
                           examQuestion.question?.difficulty === 2 ? '中等' : '困难'}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="font-semibold text-ink-900">顺序:</span>
                          <span>{examQuestion.order}</span>
                        </span>
                        {examQuestion.question?.knowledgePoint && (
                          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                            {examQuestion.question.knowledgePoint}
                          </span>
                        )}
                        {(() => {
                          try {
                            const images = examQuestion.question?.images;
                            if (!images || images === '[]') return null;
                            const imageArray = JSON.parse(images);
                            const hasImages = Array.isArray(imageArray) && imageArray.length > 0;
                            return hasImages && (
                              <span className="flex items-center gap-1">
                                <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z" />
                                </svg>
                                <span className="text-blue-600 font-medium">有示例图</span>
                              </span>
                            );
                          } catch (e) {
                            return null;
                          }
                        })()}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-slate-50 p-8 text-center">
                <p className="text-ink-700">
                  暂无题目，点击右上角"从题库添加"开始添加题目
                </p>
              </div>
            )}

            {showQuestionBank && (
              <div className="mt-4 border-t border-border pt-4">
                <div className="mb-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-ink-900">
                      题库列表
                    </h3>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowFilters(!showFilters)}
                        className="inline-flex items-center gap-2"
                      >
                        <Filter className="h-4 w-4" />
                        筛选
                      </Button>
                      <input
                        type="text"
                        className="w-64 rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900"
                        placeholder="搜索题目..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* 筛选面板 */}
                  {showFilters && (
                    <div className="rounded-xl border border-border bg-gray-50 p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* 题型筛选 */}
                        <div>
                          <label className="block text-sm font-medium text-ink-700 mb-2">题型</label>
                          <select
                            value={filters.type}
                            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                          >
                            <option value="">全部题型</option>
                            <option value="SINGLE_CHOICE">单选题</option>
                            <option value="MULTIPLE_CHOICE">多选题</option>
                            <option value="FILL_BLANK">填空题</option>
                            <option value="SHORT_ANSWER">简答题</option>
                            <option value="ESSAY">论述题</option>
                          </select>
                        </div>

                        {/* 难度筛选 */}
                        <div>
                          <label className="block text-sm font-medium text-ink-700 mb-2">难度</label>
                          <select
                            value={filters.difficulty}
                            onChange={(e) => setFilters(prev => ({ ...prev, difficulty: e.target.value }))}
                            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                          >
                            <option value="">全部难度</option>
                            <option value="1">简单</option>
                            <option value="2">中等</option>
                            <option value="3">困难</option>
                          </select>
                        </div>

                        {/* 知识点筛选 */}
                        <div>
                          <label className="block text-sm font-medium text-ink-700 mb-2">知识点</label>
                          <input
                            type="text"
                            value={filters.knowledgePoint}
                            onChange={(e) => setFilters(prev => ({ ...prev, knowledgePoint: e.target.value }))}
                            placeholder="输入知识点"
                            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                          />
                        </div>

                        {/* 标签筛选 */}
                        <div>
                          <label className="block text-sm font-medium text-ink-700 mb-2">标签</label>
                          <input
                            type="text"
                            value={filters.tags}
                            onChange={(e) => setFilters(prev => ({ ...prev, tags: e.target.value }))}
                            placeholder="输入标签"
                            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                          />
                        </div>
                      </div>

                      {/* 清除筛选 */}
                      <div className="mt-4 flex justify-between items-center">
                        <span className="text-sm text-ink-600">
                          找到 {filteredQuestions.length} 道题目
                        </span>
                        <Button
                          variant="outline"
                          onClick={() => setFilters({ type: '', difficulty: '', knowledgePoint: '', tags: '' })}
                          className="text-sm"
                        >
                          清除筛选
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {questionsLoading ? (
                  <div className="rounded-2xl border border-border bg-white p-6 text-center">
                    <p className="text-ink-700">加载题库中...</p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {filteredQuestions.map((question) => {
                      const isInExam = questionInExamIds.includes(question.id);
                      const isSelected = selectedQuestions.includes(
                        question.id,
                      );

                      return (
                        <div
                          key={question.id}
                          onClick={() => handleAddQuestion(question.id)}
                          className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                            isInExam
                              ? "border-green-300 bg-green-50 opacity-50 cursor-not-allowed"
                              : isSelected
                                ? "border-accent-600 bg-accent-50"
                                : "border-border bg-white hover:border-accent-600"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-ink-900 line-clamp-2">
                                {question.content}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-700">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  question.type === 'SINGLE_CHOICE' ? 'bg-blue-100 text-blue-700' :
                                  question.type === 'MULTIPLE_CHOICE' ? 'bg-green-100 text-green-700' :
                                  question.type === 'FILL_BLANK' ? 'bg-yellow-100 text-yellow-700' :
                                  question.type === 'SHORT_ANSWER' ? 'bg-purple-100 text-purple-700' :
                                  question.type === 'ESSAY' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {getQuestionTypeName(question.type)}
                                </span>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  question.difficulty === 1 ? 'bg-green-100 text-green-700' :
                                  question.difficulty === 2 ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {question.difficulty === 1 ? '简单' :
                                   question.difficulty === 2 ? '中等' : '困难'}
                                </span>
                                {question.knowledgePoint && (
                                  <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                                    {question.knowledgePoint}
                                  </span>
                                )}
                                {question.tags && (
                                  <span className="text-ink-700">
                                    标签: {question.tags}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {isInExam && (
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                  ✓ 已添加
                                </span>
                              )}
                              {!isInExam && isSelected && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                  已选择
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
              </div>
            )}

            {/* 学生管理标签页 */}
            {activeTab === 'students' && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-ink-900">
                    学生管理 ({students.length} 人)
                  </h2>
                  <div className="flex gap-2">
                    {(exam.accountModes || []).includes('PERMANENT') && (
                      <Button
                        onClick={() => alert('班级导入功能开发中')}
                        variant="outline"
                        className="inline-flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        从班级导入
                      </Button>
                    )}
                    {(exam.accountModes || []).includes('TEMPORARY_IMPORT') && (
                      <>
                        <Button
                          onClick={() => setShowAddStudent(true)}
                          variant="outline"
                          className="inline-flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          添加学生
                        </Button>
                        <Button
                          onClick={handleGenerateStudents}
                          variant="outline"
                        >
                          批量生成
                        </Button>
                        <Button
                          onClick={() => alert('Excel导入功能开发中')}
                          variant="outline"
                        >
                          Excel导入
                        </Button>
                      </>
                    )}
                    {(exam.accountModes || []).includes('TEMPORARY_REGISTER') && (
                      <div className="text-sm text-ink-600">
                        支持学生自主注册
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-4 rounded-2xl border border-border bg-slate-50 p-3">
                  <p className="text-sm text-ink-700">
                    <strong>已启用的登录方式：</strong>
                    {(exam.accountModes || []).map(mode => {
                      const modeNames = {
                        'PERMANENT': '固定账号',
                        'TEMPORARY_IMPORT': '临时账号-导入模式', 
                        'TEMPORARY_REGISTER': '临时账号-自主注册'
                      };
                      return modeNames[mode as keyof typeof modeNames];
                    }).join('、')}
                  </p>
                  {(exam.accountModes || []).includes('TEMPORARY_REGISTER') && (
                    <p className="mt-1 text-xs text-ink-600">
                      学生访问考试页面时可以自主注册账号，用户名格式：{exam.title.substring(0, 2)}_姓名
                    </p>
                  )}
                </div>

                {/* 添加学生表单 */}
                {showAddStudent && (
                  <div className="mb-4 rounded-2xl border border-border bg-slate-50 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-ink-900">添加学生</h3>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <input
                        type="text"
                        placeholder="用户名"
                        className="rounded-xl border border-border bg-white px-3 py-2 text-sm"
                        value={newStudent.username}
                        onChange={(e) => setNewStudent(prev => ({ ...prev, username: e.target.value }))}
                      />
                      <input
                        type="password"
                        placeholder="密码"
                        className="rounded-xl border border-border bg-white px-3 py-2 text-sm"
                        value={newStudent.password}
                        onChange={(e) => setNewStudent(prev => ({ ...prev, password: e.target.value }))}
                      />
                      <input
                        type="text"
                        placeholder="显示名称（可选）"
                        className="rounded-xl border border-border bg-white px-3 py-2 text-sm"
                        value={newStudent.displayName}
                        onChange={(e) => setNewStudent(prev => ({ ...prev, displayName: e.target.value }))}
                      />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button onClick={handleAddStudent}>确认添加</Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowAddStudent(false);
                          setNewStudent({ username: '', password: '', displayName: '' });
                        }}
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                )}

                {/* 学生列表 */}
                {studentsLoading ? (
                  <div className="rounded-2xl border border-border bg-white p-6 text-center">
                    <p className="text-ink-700">加载学生列表中...</p>
                  </div>
                ) : students.length > 0 ? (
                  <div className="space-y-3">
                    {students.map((student) => (
                      <div
                        key={student.id}
                        className="rounded-2xl border border-border bg-slate-50 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-base font-medium text-ink-900">
                              {student.displayName || student.username}
                            </p>
                            <div className="mt-1 flex gap-4 text-sm text-ink-700">
                              <span>用户名: {student.username}</span>
                              <span>提交次数: {student._count.submissions}</span>
                              <span>创建时间: {new Date(student.createdAt).toLocaleString("zh-CN")}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteStudent(student.id)}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-slate-50 p-8 text-center">
                    <p className="text-ink-700">
                      暂无学生，点击右上角"添加学生"或"批量生成"开始添加学生账号
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
