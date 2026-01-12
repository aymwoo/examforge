import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button";
import ExamLayout from "@/components/ExamLayout";
import { getExamById, type Exam } from "@/services/exams";
import { QuestionType, QuestionTypeLabels } from "@examforge/shared-types";

export default function ExamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (id) {
      loadExam();
    }
  }, [id]);

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
            <h2 className="text-2xl font-bold text-blue-900">考试题目</h2>
            <Button 
              onClick={() => navigate(`/exams/${id}/add-questions`)}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              添加题目
            </Button>
          </div>
          {exam.examQuestions && exam.examQuestions.length > 0 ? (
            <div className="space-y-4">
              {exam.examQuestions.map((examQuestion: any, index: number) => (
                <div 
                  key={examQuestion.id} 
                  className="bg-white border border-blue-200 rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedQuestion(examQuestion.question)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                          第 {index + 1} 题
                        </span>
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                          {QuestionTypeLabels[examQuestion.question?.type as keyof typeof QuestionTypeLabels] || examQuestion.question?.type || '未知类型'}
                        </span>
                        {hasImages(examQuestion.question) && (
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedQuestion(examQuestion.question);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm underline"
                        >
                          查看详情
                        </button>
                        {hasImages(examQuestion.question) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const images = getImages(examQuestion.question);
                              if (images.length > 0) {
                                setSelectedImage(images[0]);
                                setShowImageModal(true);
                              }
                            }}
                            className="text-green-600 hover:text-green-800 text-sm underline"
                          >
                            查看图片
                          </button>
                        )}
                        {canEdit(examQuestion.question) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/questions/${examQuestion.question.id}/edit`);
                            }}
                            className="text-orange-600 hover:text-orange-800 text-sm underline"
                          >
                            编辑
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
    </ExamLayout>
  );
}
