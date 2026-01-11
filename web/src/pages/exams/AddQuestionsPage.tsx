import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Check } from "lucide-react";
import Button from "@/components/ui/Button";
import { getExamById, type Exam } from "@/services/exams";
import api from "@/services/api";

interface Question {
  id: string;
  content: string;
  type: string;
  difficulty: number;
  knowledgePoint?: string;
}

export default function AddQuestionsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [examData, questionsResponse] = await Promise.all([
        getExamById(id),
        api.get('/api/questions')
      ]);
      setExam(examData);
      
      // 过滤掉已经在考试中的题目
      const existingQuestionIds = new Set(examData.examQuestions?.map((eq: any) => eq.questionId) || []);
      const availableQuestions = questionsResponse.data.questions.filter(
        (q: Question) => !existingQuestionIds.has(q.id)
      );
      setQuestions(availableQuestions);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionToggle = (questionId: string) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else {
      newSelected.add(questionId);
    }
    setSelectedQuestions(newSelected);
  };

  const handleAddQuestions = async () => {
    if (selectedQuestions.size === 0) {
      alert('请选择要添加的题目');
      return;
    }

    setSaving(true);
    try {
      const promises = Array.from(selectedQuestions).map((questionId, index) => 
        api.post(`/api/exams/${id}/questions`, {
          questionId,
          order: (exam?.examQuestions?.length || 0) + index + 1,
          score: 10 // 默认分值
        })
      );
      
      await Promise.all(promises);
      alert('题目添加成功');
      navigate(`/exams/${id}`);
    } catch (error) {
      console.error('添加题目失败:', error);
      alert('添加题目失败，请重试');
    } finally {
      setSaving(false);
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* 页面头部 */}
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => navigate(`/exams/${id}`)}
            className="flex items-center gap-2 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            返回考试详情
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">添加题目到考试</h1>
          <p className="text-gray-600 mt-2">
            为 "{exam?.title}" 选择要添加的题目
          </p>
        </div>

        {/* 操作栏 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-700">
                已选择 <span className="font-semibold text-blue-600">{selectedQuestions.size}</span> 道题目
              </p>
            </div>
            <Button
              onClick={handleAddQuestions}
              disabled={selectedQuestions.size === 0 || saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4" />
              {saving ? '添加中...' : '添加选中题目'}
            </Button>
          </div>
        </div>

        {/* 题目列表 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">可选题目</h2>
          
          {questions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">没有可添加的题目</p>
              <Button onClick={() => navigate('/questions')}>
                前往题库管理
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((question) => (
                <div
                  key={question.id}
                  className={`border rounded-xl p-6 cursor-pointer transition-all ${
                    selectedQuestions.has(question.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleQuestionToggle(question.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          selectedQuestions.has(question.id)
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedQuestions.has(question.id) && (
                            <Check className="h-4 w-4 text-white" />
                          )}
                        </div>
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                          {getQuestionTypeName(question.type)}
                        </span>
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                          难度: {question.difficulty}
                        </span>
                        {question.knowledgePoint && (
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                            {question.knowledgePoint}
                          </span>
                        )}
                      </div>
                      <div className="text-gray-800">
                        {question.content}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
