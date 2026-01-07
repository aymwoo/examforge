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
  status: string;
  knowledgePoint?: string;
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
