import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, Save, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { getQuestionById, updateQuestion, deleteQuestion, type Question } from '@/services/questions';

const typeLabels: Record<string, string> = {
  SINGLE_CHOICE: '单选题',
  MULTIPLE_CHOICE: '多选题',
  TRUE_FALSE: '判断题',
  FILL_BLANK: '填空题',
  ESSAY: '简答题',
};

export default function QuestionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Question>>({});

  const loadQuestion = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getQuestionById(id);
      setQuestion(data);
      setEditForm({
        content: data.content,
        type: data.type,
        answer: data.answer,
        explanation: data.explanation,
        tags: data.tags,
        difficulty: data.difficulty,
        knowledgePoint: data.knowledgePoint,
        options: data.options,
      });
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
      setError(axiosError.response?.data?.message || axiosError.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestion();
  }, [id]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (question) {
      setEditForm({
        content: question.content,
        type: question.type,
        answer: question.answer,
        explanation: question.explanation,
        tags: question.tags,
        difficulty: question.difficulty,
        knowledgePoint: question.knowledgePoint,
        options: question.options,
      });
    }
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateQuestion(id, editForm);
      setQuestion(updated);
      setIsEditing(false);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
      setError(axiosError.response?.data?.message || axiosError.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('确定要删除这道题目吗？此操作不可恢复。')) return;

    try {
      await deleteQuestion(id);
      navigate('/questions');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
      setError(axiosError.response?.data?.message || axiosError.message || '删除失败');
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleTagsChange = (value: string) => {
    const tags = value.split(',').map((t) => t.trim()).filter(Boolean);
    setEditForm((prev) => ({ ...prev, tags }));
  };

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
            <Button onClick={() => navigate('/questions')}>返回</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="bg-slatebg text-ink-900 antialiased min-h-screen pt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-white p-12 text-center">
            <p className="text-ink-700">题目不存在</p>
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
            <Button variant="outline" onClick={() => navigate('/questions')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
              {isEditing ? '编辑题目' : '题目详情'}
            </h1>
          </div>
          <div className="flex gap-2">
            {!isEditing && (
              <>
                <Button variant="outline" onClick={handleEdit}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  编辑
                </Button>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  删除
                </button>
              </>
            )}
            {isEditing && (
              <>
                <Button variant="outline" onClick={handleCancel} disabled={saving}>
                  <X className="h-4 w-4 mr-2" />
                  取消
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? '保存中...' : '保存'}
                </Button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-border bg-white p-4 text-center">
            <p className="text-ink-900">{error}</p>
          </div>
        )}

        <div className="rounded-3xl border border-border bg-white p-6 shadow-soft">
          {isEditing ? (
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-ink-900">题型</label>
                <select
                  className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900"
                  value={editForm.type || ''}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                >
                  <option value="SINGLE_CHOICE">单选题</option>
                  <option value="MULTIPLE_CHOICE">多选题</option>
                  <option value="TRUE_FALSE">判断题</option>
                  <option value="FILL_BLANK">填空题</option>
                  <option value="ESSAY">简答题</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink-900">题干</label>
                <textarea
                  className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900 min-h-[120px]"
                  value={editForm.content || ''}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  placeholder="请输入题目内容"
                />
              </div>

              {(editForm.type === 'SINGLE_CHOICE' || editForm.type === 'MULTIPLE_CHOICE') && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink-900">选项（每行一个）</label>
                  <textarea
                    className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900 min-h-[120px]"
                    value={
                      editForm.options
                        ? editForm.options.map((o) => `${o.label}. ${o.content}`).join('\n')
                        : ''
                    }
                    onChange={(e) => {
                      const lines = e.target.value.split('\n').filter(Boolean);
                      const options = lines.map((line, idx) => ({
                        label: String.fromCharCode(65 + idx),
                        content: line.replace(/^[A-Z]\.\s*/, ''),
                      }));
                      handleInputChange('options', options);
                    }}
                    placeholder="A. 选项1&#10;B. 选项2&#10;C. 选项3&#10;D. 选项4"
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink-900">答案</label>
                <textarea
                  className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900 min-h-[80px]"
                  value={editForm.answer || ''}
                  onChange={(e) => handleInputChange('answer', e.target.value)}
                  placeholder={
                    editForm.type === 'TRUE_FALSE'
                      ? '正确 或 错误'
                      : '请输入正确答案'
                  }
                />
                <p className="mt-1 text-xs text-ink-700">
                  {editForm.type === 'MULTIPLE_CHOICE'
                    ? '多个答案用逗号或分号分隔'
                    : ''}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink-900">解析</label>
                <textarea
                  className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900 min-h-[80px]"
                  value={editForm.explanation || ''}
                  onChange={(e) => handleInputChange('explanation', e.target.value)}
                  placeholder="请输入题目解析（可选）"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink-900">标签</label>
                <input
                  type="text"
                  className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900"
                  value={editForm.tags ? editForm.tags.join(', ') : ''}
                  onChange={(e) => handleTagsChange(e.target.value)}
                  placeholder="多个标签用逗号分隔"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink-900">难度</label>
                <select
                  className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900"
                  value={editForm.difficulty || 1}
                  onChange={(e) => handleInputChange('difficulty', parseInt(e.target.value))}
                >
                  {[1, 2, 3, 4, 5].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink-900">知识点</label>
                <input
                  type="text"
                  className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900"
                  value={editForm.knowledgePoint || ''}
                  onChange={(e) => handleInputChange('knowledgePoint', e.target.value)}
                  placeholder="请输入知识点（可选）"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <span className="shrink-0 rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-semibold text-ink-900">
                  {typeLabels[question.type] || question.type}
                </span>
                <div>
                  <p className="text-lg font-medium text-ink-900">{question.content}</p>
                </div>
              </div>

              {question.options && question.options.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-ink-900">选项</h3>
                  <div className="space-y-2">
                    {question.options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="font-semibold text-ink-900 w-6">{opt.label}.</span>
                        <span className="text-ink-700">{opt.content}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-ink-900">答案</h3>
                  <p className="rounded-xl border border-border bg-slate-50 px-3 py-2 text-ink-900">
                    {question.answer || '-'}
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold text-ink-900">难度</h3>
                  <p className="rounded-xl border border-border bg-slate-50 px-3 py-2 text-ink-900">
                    {question.difficulty}
                  </p>
                </div>
              </div>

              {question.explanation && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-ink-900">解析</h3>
                  <p className="rounded-xl border border-border bg-slate-50 px-3 py-2 text-ink-900">
                    {question.explanation}
                  </p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {question.tags.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-ink-900">标签</h3>
                    <div className="flex flex-wrap gap-2">
                      {question.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="rounded-lg bg-slate-50 px-2 py-1 text-sm text-ink-900"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {question.knowledgePoint && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-ink-900">知识点</h3>
                    <p className="rounded-xl border border-border bg-slate-50 px-3 py-2 text-ink-900">
                      {question.knowledgePoint}
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-xs text-ink-700">
                  创建于 {new Date(question.createdAt).toLocaleString('zh-CN')}
                  {question.updatedAt !== question.createdAt &&
                    ` · 更新于 ${new Date(question.updatedAt).toLocaleString('zh-CN')}`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
