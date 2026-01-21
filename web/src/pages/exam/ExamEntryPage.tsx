import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import api from "@/services/api";

export default function ExamEntryPage() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkExamAccess();
  }, [examId]);

  const checkExamAccess = async () => {
    if (!examId) {
      navigate("/");
      return;
    }

    try {
      // 检查是否有考试登录token
      const examToken = localStorage.getItem("examToken");

      if (examToken) {
        // 验证token是否有效且属于当前考试
        try {
          const response = await api.get(`/api/auth/exam-profile`, {
            headers: { Authorization: `Bearer ${examToken}` },
          });

          // 如果token有效且属于当前考试，直接进入考试
          if (response.data.examId === examId) {
            navigate(`/exam/${examId}/take`);
            return;
          }
        } catch (error) {
          // token无效，清除并继续登录流程
          localStorage.removeItem("examToken");
        }
      }

      // 需要登录，跳转到登录页面
      navigate(`/exam/${examId}/login`);
    } catch (error) {
      console.error("检查考试访问权限失败:", error);
      navigate(`/exam/${examId}/login`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">正在检查考试访问权限...</p>
        </div>
      </div>
    );
  }

  return null;
}
