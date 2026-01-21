import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Users, FileText, BookOpen, Award } from "lucide-react";
import Button from "@/components/ui/Button";
import api from "@/services/api";

interface StudentExam {
  id: string;
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  duration: number;
  totalScore: number;
  status: string;
  submission?: {
    id: string;
    score: number;
    submittedAt: string;
  };
}

interface StudentClass {
  id: string;
  name: string;
  description?: string;
  studentCount: number;
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [classInfo, setClassInfo] = useState<StudentClass | null>(null);
  const [exams, setExams] = useState<StudentExam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudentData();
  }, []);

  const loadStudentData = async () => {
    try {
      // 获取学生信息
      const studentResponse = await api.get('/api/students/profile');
      setStudentInfo(studentResponse.data);

      // 获取班级信息
      if (studentResponse.data.classId) {
        const classResponse = await api.get(`/api/classes/${studentResponse.data.classId}`);
        setClassInfo(classResponse.data);
      }

      // 获取历史考试
      const examsResponse = await api.get('/api/students/exams');
      setExams(examsResponse.data);
    } catch (error) {
      console.error('加载学生数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getExamStatus = (exam: StudentExam) => {
    if (exam.submission) {
      return { text: '已完成', color: 'text-green-600 bg-green-50' };
    }
    
    if (exam.status !== 'PUBLISHED') {
      return { text: '未发布', color: 'text-gray-600 bg-gray-50' };
    }

    const now = new Date();
    if (exam.endTime && now > new Date(exam.endTime)) {
      return { text: '已结束', color: 'text-red-600 bg-red-50' };
    }

    if (exam.startTime && now < new Date(exam.startTime)) {
      return { text: '未开始', color: 'text-blue-600 bg-blue-50' };
    }

    return { text: '进行中', color: 'text-orange-600 bg-orange-50' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">学生中心</h1>
              <p className="text-gray-600">欢迎回来，{studentInfo?.name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">学号</p>
              <p className="font-medium">{studentInfo?.studentId}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 班级信息卡片 */}
        {classInfo && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <div className="flex items-center mb-4">
              <Users className="h-6 w-6 text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">班级信息</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">班级名称</p>
                <p className="font-medium text-gray-900">{classInfo.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">班级人数</p>
                <p className="font-medium text-gray-900">{classInfo.studentCount} 人</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">班级描述</p>
                <p className="font-medium text-gray-900">{classInfo.description || '暂无描述'}</p>
              </div>
            </div>
          </div>
        )}

        {/* 考试历史 */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <BookOpen className="h-6 w-6 text-green-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">考试记录</h2>
              </div>
              <div className="text-sm text-gray-500">
                共 {exams.length} 场考试
              </div>
            </div>
          </div>

          <div className="p-6">
            {exams.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无考试记录</h3>
                <p className="text-gray-500">还没有参加过任何考试</p>
              </div>
            ) : (
              <div className="space-y-4">
                {exams.map((exam) => {
                  const status = getExamStatus(exam);
                  return (
                    <div key={exam.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <h3 className="text-lg font-medium text-gray-900 mr-3">{exam.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            {status.text}
                          </span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="h-4 w-4 mr-1" />
                          {exam.duration} 分钟
                        </div>
                      </div>

                      {exam.description && (
                        <p className="text-gray-600 mb-3">{exam.description}</p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">总分</p>
                          <p className="font-medium">{exam.totalScore} 分</p>
                        </div>
                        {exam.startTime && (
                          <div>
                            <p className="text-gray-500">开始时间</p>
                            <p className="font-medium">{formatDate(exam.startTime)}</p>
                          </div>
                        )}
                        {exam.endTime && (
                          <div>
                            <p className="text-gray-500">结束时间</p>
                            <p className="font-medium">{formatDate(exam.endTime)}</p>
                          </div>
                        )}
                        {exam.submission && (
                          <div>
                            <p className="text-gray-500">我的得分</p>
                            <div className="flex items-center">
                              <Award className="h-4 w-4 text-yellow-500 mr-1" />
                              <p className="font-medium text-green-600">
                                {exam.submission.score} / {exam.totalScore}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {exam.submission && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm text-gray-500">
                            提交时间: {formatDate(exam.submission.submittedAt)}
                          </p>
                        </div>
                      )}

                      {status.text === '进行中' && !exam.submission && (
                        <div className="mt-4">
                          <Button
                            onClick={() => navigate(`/exam/${exam.id}`)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            开始考试
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
