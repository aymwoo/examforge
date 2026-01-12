import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Upload } from "lucide-react";
import ExamLayout from "@/components/ExamLayout";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { getExamById, type Exam } from "@/services/exams";
import api from "@/services/api";

interface Submission {
  id: string;
  student: {
    id: string;
    username: string;
    displayName?: string;
  };
  submittedAt: string;
  score: number | null;
  isAutoGraded: boolean;
  isReviewed: boolean;
  gradingDetails?: any;
}

interface ExamStudent {
  id: string;
  username: string;
  displayName?: string;
  createdAt: string;
  accountType?: string; // 添加账号类型字段
}

export default function ExamStudentsPage() {
  const { id } = useParams<{ id: string }>();
  const [exam, setExam] = useState<Exam | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [examStudents, setExamStudents] = useState<ExamStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [examData, submissionsResponse, studentsResponse] = await Promise.all([
        getExamById(id),
        api.get(`/api/exams/${id}/submissions`),
        api.get(`/api/exams/${id}/students`)
      ]);
      setExam(examData);
      setSubmissions(submissionsResponse.data);
      setExamStudents(studentsResponse.data);
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImportStudents = async () => {
    if (!importText.trim()) return;
    
    setImporting(true);
    try {
      const lines = importText.trim().split('\n');
      const studentsData = lines.map(line => {
        const name = line.trim();
        return { name };
      }).filter(student => student.name);

      await api.post(`/api/exams/${id}/students/import-temporary`, {
        students: studentsData
      });

      setShowImportModal(false);
      setImportText("");
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || '导入失败');
    } finally {
      setImporting(false);
    }
  };

  // 按登录模式分组学生
  const getStudentsByMode = () => {
    const groups = {
      PERMANENT: examStudents.filter(s => s.accountType === 'PERMANENT'),
      TEMPORARY_IMPORT: examStudents.filter(s => s.accountType === 'TEMPORARY_IMPORT'),
      TEMPORARY_REGISTER: examStudents.filter(s => s.accountType === 'TEMPORARY_REGISTER'),
    };
    return groups;
  };

  const studentGroups = getStudentsByMode();

  const getModeLabel = (mode: string) => {
    const labels = {
      PERMANENT: '固定学生',
      TEMPORARY_IMPORT: '临时导入',
      TEMPORARY_REGISTER: '临时注册'
    };
    return labels[mode as keyof typeof labels] || mode;
  };

  if (loading) {
    return (
      <ExamLayout activeTab="students">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </ExamLayout>
    );
  }

  return (
    <ExamLayout activeTab="students">
      <div className="space-y-8">
        <div className="rounded-3xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-8 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-indigo-900">学生管理</h2>
            <Button
              onClick={() => setShowImportModal(true)}
              className="bg-indigo-500 hover:bg-indigo-600 text-white flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              临时导入学生
            </Button>
          </div>
          
          {/* 统计信息 */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="bg-white rounded-xl p-4 border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">{studentGroups.PERMANENT.length}</div>
              <div className="text-sm text-blue-700">固定学生</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-green-200">
              <div className="text-2xl font-bold text-green-600">{studentGroups.TEMPORARY_IMPORT.length}</div>
              <div className="text-sm text-green-700">临时导入</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-orange-200">
              <div className="text-2xl font-bold text-orange-600">{studentGroups.TEMPORARY_REGISTER.length}</div>
              <div className="text-sm text-orange-700">临时注册</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-indigo-200">
              <div className="text-2xl font-bold text-indigo-600">{submissions.length}</div>
              <div className="text-sm text-indigo-700">已提交</div>
            </div>
          </div>

          {/* 学生列表 */}
          <div className="space-y-6">
            {Object.entries(studentGroups).map(([mode, students]) => (
              students.length > 0 && (
                <div key={mode} className="space-y-4">
                  <h3 className="text-lg font-semibold text-indigo-900 flex items-center gap-2">
                    {getModeLabel(mode)}
                    <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-sm">
                      {students.length}人
                    </span>
                  </h3>
                  {students.map((student) => {
                    const submission = submissions.find(s => s.student.username === student.username);
                    return (
                      <div 
                        key={student.id}
                        className="bg-white rounded-xl p-6 border border-indigo-200 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-indigo-900">
                              {student.displayName || student.username}
                            </div>
                            <div className="text-sm text-gray-600">
                              注册时间: {new Date(student.createdAt).toLocaleString('zh-CN')}
                            </div>
                            {submission && (
                              <div className="text-sm text-gray-600">
                                提交时间: {new Date(submission.submittedAt).toLocaleString('zh-CN')}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            {submission ? (
                              <>
                                {submission.score !== null && (
                                  <div className="text-lg font-bold text-green-600 mb-1">
                                    {submission.score}/{exam?.totalScore}
                                  </div>
                                )}
                                {submission.gradingDetails && (
                                  <div className="text-sm text-blue-600 mb-2">
                                    AI预评分: {submission.gradingDetails.totalScore}/{submission.gradingDetails.maxTotalScore}
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  {submission.isReviewed ? (
                                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                                      已复核
                                    </span>
                                  ) : submission.isAutoGraded ? (
                                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                                      待复核
                                    </span>
                                  ) : (
                                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                                      未评分
                                    </span>
                                  )}
                                </div>
                              </>
                            ) : (
                              <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                                未提交
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ))}
            
            {examStudents.length === 0 && (
              <div className="text-center py-12">
                <p className="text-indigo-700">暂无注册学生</p>
              </div>
            )}
          </div>
        </div>

        {/* 临时导入学生模态框 */}
        <Modal
          isOpen={showImportModal}
          onClose={() => {
            setShowImportModal(false);
            setImportText("");
          }}
          title="临时导入学生名册"
          onConfirm={handleImportStudents}
          confirmText={importing ? "导入中..." : "确认导入"}
          confirmDisabled={importing || !importText.trim()}
        >
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>注意：</strong>此功能仅为当前考试临时导入学生，不会添加到系统数据库中。
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                学生姓名列表（每行一个姓名）
              </label>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="张三&#10;李四&#10;王五"
                className="w-full h-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>
            <div className="text-sm text-gray-600">
              系统将自动为每个学生生成临时账号，仅在此次考试中有效。
            </div>
          </div>
        </Modal>
      </div>
    </ExamLayout>
  );
}
