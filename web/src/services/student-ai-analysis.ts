import api from "./api";

export interface StudentAiAnalysisReport {
  id: string;
  submissionId: string;
  examId: string;
  examStudentId?: string | null;
  studentId?: string | null;
  status: string;
  progress: number;
  providerId?: string | null;
  model?: string | null;
  promptUsed?: string | null;
  report?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const getStudentAiAnalysisBySubmission = async (
  submissionId: string,
) => {
  const response = await api.get<StudentAiAnalysisReport | null>(
    `/api/student-ai-analysis/by-submission/${submissionId}`,
  );
  return response.data;
};

export const getStudentAiAnalysisByExamStudent = async (
  examId: string,
  examStudentId: string,
) => {
  const response = await api.get<StudentAiAnalysisReport | null>(
    "/api/student-ai-analysis/by-exam-student",
    { params: { examId, examStudentId } },
  );
  return response.data;
};

export const buildStudentAiAnalysisStreamUrl = (params: {
  examId: string;
  submissionId: string;
  force?: boolean;
}) => {
  const search = new URLSearchParams();
  search.set("examId", params.examId);
  search.set("submissionId", params.submissionId);
  if (params.force) {
    search.set("force", "true");
  }
  // EventSource should use relative URL so it respects Vite proxy.
  return `/api/student-ai-analysis/stream?${search.toString()}`;
};
