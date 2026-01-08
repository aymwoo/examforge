import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit2, Trash2, Plus, Check, Users, BookOpen } from "lucide-react";
import Button from "@/components/ui/Button";
import { getExamById, deleteExam, addQuestionToExam, getExamStudents, addExamStudent, generateExamStudents, deleteExamStudent, type Exam, type ExamStudent, type CreateExamStudentDto } from "@/services/exams";
import { listQuestions, type Question } from "@/services/questions";
import api from "@/services/api";

export default function ExamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
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

  useEffect(() => {
    loadExam();
  }, [id]);

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
        const nextOrder = (exam?.questions?.length || 0) + 1;
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

  const filteredQuestions = searchTerm
    ? questions.filter((q) =>
        q.content.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : questions;

  const questionInExamIds = exam?.questions?.map((eq) => eq.question?.id || eq.questionId) || [];

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
              variant="outline"
              onClick={() => navigate(`/exams/${id}/edit`)}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              编辑
            </Button>
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

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-border bg-white p-6 shadow-soft">
            <h2 className="mb-4 text-lg font-semibold text-ink-900">
              考试信息
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-ink-700">
                  考试标题
                </label>
                <p className="text-base text-ink-900">{exam.title}</p>
              </div>

              {exam.description && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink-700">
                    考试描述
                  </label>
                  <p className="text-base text-ink-900">{exam.description}</p>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink-700">
                  学生账号模式
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'PERMANENT', label: '固定账号', desc: '使用学生学号登录' },
                    { value: 'TEMPORARY_IMPORT', label: '临时账号-导入模式', desc: '导入学生名单' },
                    { value: 'TEMPORARY_REGISTER', label: '临时账号-自主注册', desc: '学生自主注册' }
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
                          await api.put(`/api/exams/${id}`, { accountModes: newModes });
                          await loadExam();
                        } catch (err: any) {
                          setError(err.response?.data?.message || '更新失败');
                        }
                      }}
                      className={`w-full rounded-xl border p-3 text-left transition-colors ${
                        (exam.accountModes || []).includes(mode.value)
                          ? 'border-accent-600 bg-accent-50'
                          : 'border-border bg-white hover:border-accent-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-ink-900">{mode.label}</p>
                          <p className="text-sm text-ink-600">{mode.desc}</p>
                        </div>
                        <div className={`h-4 w-4 rounded border-2 ${
                          (exam.accountModes || []).includes(mode.value)
                            ? 'border-accent-600 bg-accent-600'
                            : 'border-border'
                        }`}>
                          {(exam.accountModes || []).includes(mode.value) && (
                            <svg className="h-full w-full text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
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
                  <p className="text-base text-ink-900">{exam.duration} 分钟</p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink-700">
                    总分
                  </label>
                  <p className="text-base text-ink-900">{exam.totalScore}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink-700">
                    状态
                  </label>
                  <span
                    className={`rounded-lg px-3 py-1 text-sm font-semibold ${
                      exam.status === "PUBLISHED"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {exam.status === "PUBLISHED" ? "已发布" : "草稿"}
                  </span>
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
                    value={`${window.location.origin}/exam/${exam.id}/login`}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/exam/${exam.id}/login`);
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

          <div className="rounded-3xl border border-border bg-white p-6 shadow-soft">
            {/* 标签页切换 */}
            <div className="mb-4 flex border-b border-border">
              <button
                onClick={() => setActiveTab('questions')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === 'questions'
                    ? 'border-b-2 border-accent-600 text-accent-600'
                    : 'text-ink-700 hover:text-ink-900'
                }`}
              >
                <BookOpen className="h-4 w-4" />
                考试题目 ({exam.questions?.length || 0})
              </button>
              <button
                onClick={() => {
                  setActiveTab('students');
                  if (students.length === 0) loadStudents();
                }}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === 'students'
                    ? 'border-b-2 border-accent-600 text-accent-600'
                    : 'text-ink-700 hover:text-ink-900'
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
                    考试题目 ({exam.questions?.length || 0} 题)
                  </h2>
                  <Button
                    onClick={handleToggleQuestionBank}
                    className="inline-flex items-center gap-2"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4" />
                    {showQuestionBank ? "收起题库" : "从题库添加"}
                  </Button>
                </div>

            {exam.questions && exam.questions.length > 0 ? (
              <div className="space-y-3">
                {exam.questions
                  .sort((a, b) => a.order - b.order)
                  .map((examQuestion) => (
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
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink-700">
                        <span className="flex items-center gap-1">
                          <span className="font-semibold text-ink-900">
                            分值:
                          </span>
                          <span>{examQuestion.score}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="font-semibold text-ink-900">
                            难度:
                          </span>
                          <span>{examQuestion.question?.difficulty || 'N/A'}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="font-semibold text-ink-900">
                            题型:
                          </span>
                          <span>{examQuestion.question?.type || 'N/A'}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="font-semibold text-ink-900">
                            顺序:
                          </span>
                          <span>{examQuestion.order}</span>
                        </span>
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
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-ink-900">
                    题库列表
                  </h3>
                  <div className="flex items-center gap-3">
                    {selectedQuestions.length > 0 && (
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
                    <input
                      type="text"
                      className="w-64 rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900"
                      placeholder="搜索题目..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
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
                                <span className="text-ink-700">
                                  {question.type}
                                </span>
                                {question.tags.length > 0 && (
                                  <span className="text-ink-700">
                                    标签: {question.tags.join(", ")}
                                  </span>
                                )}
                                <span className="text-ink-700">
                                  难度: {question.difficulty}
                                </span>
                              </div>
                            </div>
                            <span className="text-xs">
                              {isInExam && "已添加"}
                            </span>
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
