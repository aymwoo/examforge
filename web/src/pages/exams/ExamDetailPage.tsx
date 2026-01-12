import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ExamLayout from "@/components/ExamLayout";
import { getExamById, type Exam } from "@/services/exams";
import { QuestionTypeLabels } from "@examforge/shared-types";
import { CheckSquare, Square, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import api from "@/services/api";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// 可拖拽的题型区块组件
function SortableTypeBlock({ type, questions, selectedQuestions, handleQuestionSelect, setSelectedQuestion, setSelectedImage, setShowImageModal, navigate, hasImages, getImages, canEdit, handleBatchSetTypeScore, setBatchScoreType, setBatchScore, setShowBatchScoreModal, collapsedTypes, setCollapsedTypes }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `type-${type}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isCollapsed = collapsedTypes.has(type);

  const toggleCollapse = () => {
    const newCollapsed = new Set(collapsedTypes);
    if (isCollapsed) {
      newCollapsed.delete(type);
    } else {
      newCollapsed.add(type);
    }
    setCollapsedTypes(newCollapsed);
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-white rounded-xl border border-blue-200 overflow-hidden">
      <div 
        className="bg-blue-50 px-6 py-3 border-b border-blue-200 flex items-center justify-between"
      >
        <div 
          {...attributes}
          {...listeners}
          className="cursor-move hover:bg-blue-100 transition-colors flex items-center gap-2 flex-1 py-2 -my-2"
        >
          <GripVertical className="w-4 h-4" />
          <h3 className="font-semibold text-blue-900">
            {QuestionTypeLabels[type as keyof typeof QuestionTypeLabels] || type} ({questions.length} 题)
            <span className="ml-4 text-sm font-normal">
              总分: {questions.reduce((sum: number, q: any) => sum + q.score, 0)} 分
            </span>
          </h3>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('批量设分按钮被点击', type);
            setBatchScoreType(type);
            setBatchScore(10);
            setShowBatchScoreModal(true);
            console.log('模态框状态已设置为true');
          }}
          className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
        >
          批量设分
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleCollapse();
          }}
          className="ml-2 p-1 text-blue-600 hover:text-blue-800"
        >
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>
      {!isCollapsed && (
        <SortableContext items={questions.map((q: any) => q.id)} strategy={verticalListSortingStrategy}>
          <div className="divide-y divide-gray-200">
            {questions.map((examQuestion: any) => (
              <SortableQuestion
                key={examQuestion.id}
                examQuestion={examQuestion}
                isSelected={selectedQuestions.has(examQuestion.question.id)}
                onSelect={handleQuestionSelect}
                onDetailClick={setSelectedQuestion}
                onImageClick={(question: any) => {
                  const images = getImages(question);
                  if (images.length > 0) {
                    setSelectedImage(images[0]);
                    setShowImageModal(true);
                  }
                }}
                onEditClick={(questionId: string) => navigate(`/questions/${questionId}/edit`)}
                hasImages={hasImages}
                getImages={getImages}
                canEdit={canEdit}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
}

// 可拖拽的题目组件
function SortableQuestion({ examQuestion, index, onSelect, isSelected, onDetailClick, onImageClick, onEditClick, hasImages, getImages, canEdit }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: examQuestion.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="p-6 hover:bg-gray-50 transition-colors border-b border-gray-200 last:border-b-0">
      <div className="flex items-start gap-4">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mt-1">
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
        <button
          onClick={() => onSelect(examQuestion.question.id)}
          className="mt-1 text-blue-600 hover:text-blue-800"
        >
          {isSelected ? (
            <CheckSquare className="h-4 w-4" />
          ) : (
            <Square className="h-4 w-4" />
          )}
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
              第 {examQuestion.order} 题
            </span>
            {hasImages(examQuestion.question) && (
              <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                有图片
              </span>
            )}
          </div>
          <div className="text-gray-800 mb-2">
            {examQuestion.question?.content}
          </div>
          {examQuestion.question?.options && Array.isArray(examQuestion.question.options) && examQuestion.question.options.length > 0 && (
            <div className="text-sm text-gray-600 space-y-1">
              {examQuestion.question.options.map((option: any, optIndex: number) => (
                <div key={optIndex}>
                  {option.label}: {option.content}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 ml-4">
          <div className="text-lg font-bold text-blue-600">
            {examQuestion.score} 分
          </div>
          {examQuestion.question?.difficulty && (
            <div className="text-sm text-gray-500">
              难度: {examQuestion.question.difficulty}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => onDetailClick(examQuestion.question)}
              className="text-blue-600 hover:text-blue-800 text-sm underline"
            >
              查看详情
            </button>
            {hasImages(examQuestion.question) && (
              <button
                onClick={() => onImageClick(examQuestion.question)}
                className="text-green-600 hover:text-green-800 text-sm underline"
              >
                查看图片
              </button>
            )}
            {canEdit(examQuestion.question) && (
              <button
                onClick={() => onEditClick(examQuestion.question.id)}
                className="text-orange-600 hover:text-orange-800 text-sm underline"
              >
                编辑
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [showBatchScoreModal, setShowBatchScoreModal] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [batchScore, setBatchScore] = useState<number>(10);
  const [batchScoreType, setBatchScoreType] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [hasOrderChanged, setHasOrderChanged] = useState(false);
  const [typeOrder, setTypeOrder] = useState<string[]>([]);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [collapsedTypes, setCollapsedTypes] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (id) {
      loadExam();
    }
  }, [id]);

  useEffect(() => {
    if (exam?.examQuestions) {
      const types = [...new Set(exam.examQuestions.map(eq => eq.question?.type).filter(Boolean))];
      setTypeOrder(types);
    }
  }, [exam]);

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

  const hasImages = (question: any) => {
    return question?.illustration || (question?.images && question.images !== '[]');
  };

  const getImages = (question: any) => {
    const images = [];
    if (question?.illustration) {
      // 确保图片路径指向后端服务器
      const imagePath = question.illustration.startsWith('http') 
        ? question.illustration 
        : `http://localhost:3000/${question.illustration.startsWith('/') ? question.illustration.slice(1) : question.illustration}`;
      images.push(imagePath);
    }
    if (question?.images && question.images !== '[]') {
      try {
        const parsedImages = JSON.parse(question.images);
        const processedImages = parsedImages.map((img: string) => 
          img.startsWith('http') 
            ? img 
            : `http://localhost:3000/${img.startsWith('/') ? img.slice(1) : img}`
        );
        images.push(...processedImages);
      } catch (e) {
        // ignore parse error
      }
    }
    return images;
  };

  const canEdit = (question: any) => {
    return currentUser.id && question?.createdBy === currentUser.id;
  };

  const handleQuestionSelect = (questionId: string) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else {
      newSelected.add(questionId);
    }
    setSelectedQuestions(newSelected);
  };

  const handleSelectAll = () => {
    if (!exam?.examQuestions) return;
    const filteredQuestions = getFilteredQuestions();
    if (selectedQuestions.size === filteredQuestions.length) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(filteredQuestions.map(eq => eq.question.id)));
    }
  };

  const handleBatchUpdateScores = async () => {
    if (!id || selectedQuestions.size === 0) return;
    try {
      const updates = Array.from(selectedQuestions).map(questionId => ({
        questionId,
        score: batchScore
      }));
      
      await api.patch(`/api/exams/${id}/questions/batch-scores`, { updates });
      setShowBatchScoreModal(false);
      setSelectedQuestions(new Set());
      loadExam();
    } catch (err: any) {
      setWarningMessage(err.response?.data?.message || '批量设置分值失败');
      setShowWarningModal(true);
    }
  };

  const getFilteredQuestions = () => {
    if (!exam?.examQuestions) return [];
    return exam.examQuestions.filter(eq => {
      if (typeFilter && eq.question?.type !== typeFilter) return false;
      return true;
    });
  };

  const getQuestionsByType = () => {
    const filtered = getFilteredQuestions();
    const grouped: Record<string, any[]> = {};
    
    filtered.forEach(eq => {
      const type = eq.question?.type || 'UNKNOWN';
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(eq);
    });
    
    // 按order排序每个组内的题目
    Object.keys(grouped).forEach(type => {
      grouped[type].sort((a, b) => a.order - b.order);
    });
    
    return grouped;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    // 处理题型区块拖拽
    if (String(active.id).startsWith('type-') && String(over.id).startsWith('type-')) {
      const activeType = String(active.id).replace('type-', '');
      const overType = String(over.id).replace('type-', '');
      
      const oldIndex = typeOrder.indexOf(activeType);
      const newIndex = typeOrder.indexOf(overType);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newTypeOrder = arrayMove(typeOrder, oldIndex, newIndex);
        setTypeOrder(newTypeOrder);
        setHasOrderChanged(true);
      }
      return;
    }

    // 处理题目内部拖拽（保持原有逻辑）
    if (!exam?.examQuestions) return;

    const activeQuestion = exam.examQuestions.find(eq => eq.id === active.id);
    const overQuestion = exam.examQuestions.find(eq => eq.id === over.id);

    if (!activeQuestion || !overQuestion) return;

    if (activeQuestion.question?.type !== overQuestion.question?.type) {
      alert('只能在相同题型内调整顺序');
      return;
    }

    setHasOrderChanged(true);
  };

  const handleSaveOrder = async () => {
    if (!id || !exam?.examQuestions) return;

    try {
      // 根据新的题型顺序重新计算所有题目的order
      const updates: { questionId: string, order: number }[] = [];
      let globalOrder = 1;

      typeOrder.forEach(type => {
        const typeQuestions = exam.examQuestions
          .filter(eq => eq.question?.type === type)
          .sort((a, b) => a.order - b.order);

        typeQuestions.forEach(eq => {
          updates.push({
            questionId: eq.questionId,
            order: globalOrder++
          });
        });
      });

      await api.patch(`/api/exams/${id}/questions/batch-orders`, { updates });
      setHasOrderChanged(false);
      loadExam();
    } catch (err: any) {
      setWarningMessage(err.response?.data?.message || '保存排序失败');
      setShowWarningModal(true);
    }
  };

  const handleBatchSetTypeScore = async (type: string, score: number) => {
    if (!id || !exam?.examQuestions) return;

    try {
      const typeQuestions = exam.examQuestions.filter(eq => eq.question?.type === type);
      const updates = typeQuestions.map(eq => ({
        questionId: eq.questionId,
        score: score
      }));

      await api.patch(`/api/exams/${id}/questions/batch-scores`, { updates });
      
      // 检查总分
      const newTotal = exam.examQuestions.reduce((sum, eq) => {
        const isTypeQuestion = typeQuestions.some(tq => tq.questionId === eq.questionId);
        return sum + (isTypeQuestion ? score : eq.score);
      }, 0);

      if (newTotal !== exam.totalScore) {
        setWarningMessage(`试卷总分已变为 ${newTotal} 分，与设置的总分 ${exam.totalScore} 分不一致`);
        setShowWarningModal(true);
      }

      setShowBatchScoreModal(false);
      loadExam();
    } catch (err: any) {
      setWarningMessage(err.response?.data?.message || '批量设置分值失败');
      setShowWarningModal(true);
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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-blue-900">考试题目</h2>
              <div className="text-sm text-gray-600 mt-1">
                当前总分: {exam?.examQuestions?.reduce((sum, eq) => sum + eq.score, 0) || 0} 分 
                / 设置总分: {exam?.totalScore || 0} 分
                {exam?.examQuestions && exam?.totalScore && 
                 exam.examQuestions.reduce((sum, eq) => sum + eq.score, 0) !== exam.totalScore && (
                  <span className="ml-2 text-red-600 font-medium">⚠️ 分值不匹配</span>
                )}
              </div>
            </div>
            <Button 
              onClick={() => navigate(`/exams/${id}/add-questions`)}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              添加题目
            </Button>
          </div>
          
          {hasOrderChanged && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
              <span className="text-yellow-800">题目顺序已修改</span>
              <button
                onClick={handleSaveOrder}
                className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                保存排序
              </button>
            </div>
          )}
          {exam?.examQuestions && exam.examQuestions.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={typeOrder.map(type => `type-${type}`)} strategy={verticalListSortingStrategy}>
                <div className="space-y-6">
                  {typeOrder.map(type => {
                    const questions = getQuestionsByType()[type];
                    if (!questions) return null;
                    
                    return (
                      <SortableTypeBlock 
                        key={type} 
                        type={type} 
                        questions={questions}
                        selectedQuestions={selectedQuestions}
                        handleQuestionSelect={handleQuestionSelect}
                        setSelectedQuestion={setSelectedQuestion}
                        setSelectedImage={setSelectedImage}
                        setShowImageModal={setShowImageModal}
                        navigate={navigate}
                        hasImages={hasImages}
                        getImages={getImages}
                        canEdit={canEdit}
                        handleBatchSetTypeScore={handleBatchSetTypeScore}
                        setBatchScoreType={setBatchScoreType}
                        setBatchScore={setBatchScore}
                        setShowBatchScoreModal={setShowBatchScoreModal}
                        collapsedTypes={collapsedTypes}
                        setCollapsedTypes={setCollapsedTypes}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="text-center py-12">
              <p className="text-blue-700 mb-4">暂无题目，请添加题目</p>
            </div>
          )}
        </div>
      </div>

      {/* 题目详情模态框 */}
      {selectedQuestion && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedQuestion(null)}
        >
          <div 
            className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">题目详情</h3>
                <button
                  onClick={() => setSelectedQuestion(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">题目类型</label>
                  <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm">
                    {QuestionTypeLabels[selectedQuestion.type as keyof typeof QuestionTypeLabels] || selectedQuestion.type}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">题目内容</label>
                  <div className="bg-gray-50 p-3 rounded border text-gray-800">
                    {selectedQuestion.content}
                  </div>
                </div>

                {selectedQuestion.options && Array.isArray(selectedQuestion.options) && selectedQuestion.options.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">选项</label>
                    <div className="space-y-2">
                      {selectedQuestion.options.map((option: any, index: number) => (
                        <div key={index} className="bg-gray-50 p-2 rounded border">
                          <span className="font-medium">{option.label}:</span> {option.content}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">答案</label>
                  <div className="bg-green-50 p-3 rounded border text-gray-800">
                    {selectedQuestion.answer}
                  </div>
                </div>

                {selectedQuestion.explanation && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">解析</label>
                    <div className="bg-blue-50 p-3 rounded border text-gray-800">
                      {selectedQuestion.explanation}
                    </div>
                  </div>
                )}

                {hasImages(selectedQuestion) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">图片</label>
                    <div className="flex flex-wrap gap-2">
                      {getImages(selectedQuestion).map((image: string, index: number) => (
                        <img
                          key={index}
                          src={image}
                          alt={`题目图片 ${index + 1}`}
                          className="max-w-full h-auto rounded border cursor-pointer hover:opacity-80"
                          onClick={() => {
                            setSelectedImage(image);
                            setShowImageModal(true);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>难度: {selectedQuestion.difficulty}</span>
                  {selectedQuestion.knowledgePoint && (
                    <span>知识点: {selectedQuestion.knowledgePoint}</span>
                  )}
                </div>

                {canEdit(selectedQuestion) && (
                  <div className="pt-4 border-t">
                    <Button
                      onClick={() => {
                        setSelectedQuestion(null);
                        navigate(`/questions/${selectedQuestion.id}/edit`);
                      }}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      编辑题目
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 批量设置分值模态框 */}
      <Modal
        isOpen={showBatchScoreModal}
        onClose={() => {
          setShowBatchScoreModal(false);
          setSelectedQuestions(new Set());
          setBatchScoreType("");
        }}
        title="批量设置分值"
        onConfirm={() => {
          if (batchScoreType) {
            handleBatchSetTypeScore(batchScoreType, batchScore);
          } else {
            handleBatchUpdateScores();
          }
        }}
        confirmText="确定设置"
      >
        <div className="space-y-4">
          {batchScoreType ? (
            <p>将为所有 <strong>{QuestionTypeLabels[batchScoreType as keyof typeof QuestionTypeLabels] || batchScoreType}</strong> 题目设置分值：</p>
          ) : (
            <p>将为 {selectedQuestions.size} 道题目设置分值：</p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              分值
            </label>
            <input
              type="number"
              value={batchScore}
              onChange={(e) => setBatchScore(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="1"
              max="100"
            />
          </div>
        </div>
      </Modal>

      {/* 图片查看模态框 */}
      {showImageModal && selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-full max-h-full">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={selectedImage}
              alt="题目图片"
              className="max-w-full max-h-full object-contain rounded"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* 警告模态框 */}
      <Modal
        isOpen={showWarningModal}
        onClose={() => setShowWarningModal(false)}
        title="提示"
        confirmText="确定"
        onConfirm={() => setShowWarningModal(false)}
      >
        <p>{warningMessage}</p>
      </Modal>
    </ExamLayout>
  );
}
