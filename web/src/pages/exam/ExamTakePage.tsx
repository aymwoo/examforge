import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Clock, FileText } from "lucide-react";
import Button from "@/components/ui/Button";
import api from "@/services/api";

interface ExamInfo {
  id: string;
  title: string;
  description?: string;
  duration: number;
  totalScore: number;
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
      const response = await api.get(`/api/exams/${examId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('examToken')}`
        }
      });
      setExam(response.data);
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

  const handleLogout = () => {
    localStorage.removeItem('examToken');
    localStorage.removeItem('examStudent');
    navigate(`/exam/${examId}/login`);
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
          <p className="text-ink-900 mb-4">{error}</p>
          <Button onClick={() => navigate(`/exam/${examId}/login`)}>重新登录</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slatebg text-ink-900 antialiased min-h-screen">
      {/* 顶部导航 */}
      <div className="border-b border-border bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <FileText className="h-6 w-6 text-accent-600" />
              <div>
                <h1 className="text-lg font-semibold text-ink-900">{exam?.title}</h1>
                <p className="text-sm text-ink-600">
                  欢迎，{student?.displayName || student?.username}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-ink-600">
                <Clock className="h-4 w-4" />
                <span>考试时长：{exam?.duration} 分钟</span>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                退出登录
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 考试内容 */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-3xl border border-border bg-white p-8 shadow-soft">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-ink-900 mb-4">
              考试准备中
            </h2>
            <p className="text-ink-700 mb-6">
              考试功能正在开发中，敬请期待...
            </p>
            <div className="space-y-2 text-sm text-ink-600">
              <p>考试名称：{exam?.title}</p>
              {exam?.description && <p>考试说明：{exam.description}</p>}
              <p>考试时长：{exam?.duration} 分钟</p>
              <p>总分：{exam?.totalScore} 分</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
