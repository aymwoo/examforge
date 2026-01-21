import api from "./api";

export interface PromptManagementStudent {
  id: string;
  studentId: string;
  name: string;
  gender?: string | null;
  classId?: string | null;
  aiAnalysisPrompt?: string | null;
  class?: { id: string; name: string } | null;
}

export interface PromptManagementStudentList {
  data: PromptManagementStudent[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export const listStudentsForPromptManagement = async (params: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<PromptManagementStudentList> => {
  const response = await api.get<PromptManagementStudentList>(
    "/api/students/prompt-management",
    { params },
  );
  return response.data;
};

export const updateStudentAiAnalysisPrompt = async (
  studentId: string,
  prompt: string,
) => {
  const response = await api.patch(
    `/api/students/${studentId}/ai-analysis-prompt`,
    { prompt },
  );
  return response.data;
};
