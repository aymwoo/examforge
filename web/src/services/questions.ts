import api from "./api";

export interface Question {
  id: string;
  content: string;
  type: string;
  difficulty: number;
  tags: string[];
  options?: Array<{ label: string; content: string }>;
  answer?: string;
  explanation?: string;
  illustration?: string;
  images?: string[];
  status: string;
  knowledgePoint?: string;
  isPublic?: boolean;
  createdBy?: string;
  creator?: {
    id: string;
    name: string;
    username: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface QuestionListResponse {
  data: Question[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ListQuestionsParams {
  page?: number;
  limit?: number;
  type?: string;
  difficulty?: number;
  tags?: string | string[];
}

export const listQuestions = async (
  params: ListQuestionsParams = {},
): Promise<QuestionListResponse> => {
  const response = await api.get<QuestionListResponse>("/api/questions", {
    params,
  });
  return response.data;
};

export const getQuestionById = async (id: string): Promise<Question> => {
  const response = await api.get<Question>(`/api/questions/${id}`);
  return response.data;
};

export const createQuestion = async (
  data: Partial<Question>,
): Promise<Question> => {
  const response = await api.post<Question>("/api/questions", data);
  return response.data;
};

export const updateQuestion = async (
  id: string,
  data: Partial<Question>,
): Promise<Question> => {
  const response = await api.put<Question>(`/api/questions/${id}`, data);
  return response.data;
};

export const deleteQuestion = async (id: string): Promise<void> => {
  await api.delete(`/api/questions/${id}`);
};

export const deleteQuestions = async (
  ids: string[],
): Promise<{ deleted: number }> => {
  const response = await api.post<{ deleted: number }>(
    "/api/questions/batch-delete",
    { ids },
  );
  return response.data;
};

export const batchUpdateTags = async (
  ids: string[],
  tags: string[],
): Promise<{ updated: number }> => {
  const response = await api.post<{ updated: number }>(
    "/api/questions/batch-update-tags",
    { ids, tags },
  );
  return response.data;
};

export const uploadQuestionImage = async (
  questionId: string,
  file: File,
): Promise<{ imagePath: string }> => {
  const formData = new FormData();
  formData.append('image', file);
  const response = await api.post<{ imagePath: string }>(
    `/api/questions/${questionId}/images`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
};

export const addClipboardImage = async (
  questionId: string,
  imageData: string,
): Promise<{ imagePath: string }> => {
  const response = await api.post<{ imagePath: string }>(
    `/api/questions/${questionId}/images/clipboard`,
    { imageData }
  );
  return response.data;
};

export const deleteQuestionImage = async (
  questionId: string,
  imageIndex: number,
): Promise<{ success: boolean }> => {
  const response = await api.delete<{ success: boolean }>(
    `/api/questions/${questionId}/images/${imageIndex}`
  );
  return response.data;
};

export const getQuestionImportRecord = async (questionId: string) => {
  const response = await api.get(`/api/import/question/${questionId}/import-record`);
  return response.data;
};

export const getImportRecordImages = async (jobId: string) => {
  const response = await api.get(`/api/import/history/${jobId}/pdf-images`);
  return response.data;
};
