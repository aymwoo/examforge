import api from "./api";

export interface Exam {
  id: string;
  title: string;
  description?: string;
  duration: number;
  totalScore: number;
  status: string;
  startTime?: string;
  endTime?: string;
  createdAt: string;
  updatedAt: string;
  questions?: ExamQuestion[];
}

export interface ExamQuestion {
  id: string;
  examId: string;
  questionId: string;
  order: number;
  score: number;
  question: {
    id: string;
    content: string;
    type: string;
    options?: Array<{ label: string; content: string }>;
    answer?: string;
    explanation?: string;
    tags: string[];
    difficulty: number;
  };
}

export interface ExamListResponse {
  data: Exam[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateExamDto {
  title: string;
  description?: string;
  duration: number;
  totalScore?: number;
}

export interface UpdateExamDto {
  title?: string;
  description?: string;
  duration?: number;
  totalScore?: number;
  status?: string;
}

export interface AddQuestionDto {
  questionId: string;
  order: number;
  score?: number;
}

export const listExams = async (
  params: { page?: number; limit?: number } = {},
): Promise<ExamListResponse> => {
  const response = await api.get<ExamListResponse>("/api/exams", { params });
  return response.data;
};

export const getExamById = async (id: string): Promise<Exam> => {
  const response = await api.get<Exam>(`/api/exams/${id}`);
  return response.data;
};

export const createExam = async (data: CreateExamDto): Promise<Exam> => {
  const response = await api.post<Exam>("/api/exams", data);
  return response.data;
};

export const updateExam = async (
  id: string,
  data: UpdateExamDto,
): Promise<Exam> => {
  const response = await api.put<Exam>(`/api/exams/${id}`, data);
  return response.data;
};

export const deleteExam = async (id: string): Promise<void> => {
  await api.delete(`/api/exams/${id}`);
};

export const addQuestionToExam = async (
  examId: string,
  data: AddQuestionDto,
): Promise<void> => {
  await api.post(`/api/exams/${examId}/questions`, data);
};

export const removeQuestionFromExam = async (
  examId: string,
  questionId: string,
): Promise<void> => {
  await api.delete(`/api/exams/${examId}/questions/${questionId}`);
};

export const updateQuestionInExam = async (
  examId: string,
  questionId: string,
  data: { order: number; score?: number },
): Promise<void> => {
  await api.put(`/api/exams/${examId}/questions/${questionId}`, data);
};
