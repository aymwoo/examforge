import api from "./api";

export interface Exam {
  id: string;
  title: string;
  description?: string;
  duration: number;
  totalScore: number;
  status: string;
  accountModes: ExamAccountMode[];
  feedbackVisibility?: "FINAL_SCORE" | "ANSWERS" | "FULL_DETAILS";
  startTime?: string;
  endTime?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;

  createdBy?: string;
  creator?: {
    id: string;
    name?: string | null;
    username?: string | null;
    role?: string;
  } | null;

  examQuestions?: ExamQuestion[];
  submissionCount?: number;
  totalStudents?: number;
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
  accountModes?: ExamAccountMode[];
  feedbackVisibility?: "FINAL_SCORE" | "ANSWERS" | "FULL_DETAILS";
}

export const examAccountModes = [
  "PERMANENT",
  "TEMPORARY_IMPORT",
  "TEMPORARY_REGISTER",
  "CLASS_IMPORT",
  "GENERATE_ACCOUNTS",
] as const;
export type ExamAccountMode = (typeof examAccountModes)[number];

export interface UpdateExamDto {
  title?: string;
  description?: string;
  duration?: number;
  totalScore?: number;
  status?: string;
  accountModes?: ExamAccountMode[];
  feedbackVisibility?: "FINAL_SCORE" | "ANSWERS" | "FULL_DETAILS";
}

export interface AddQuestionDto {
  questionId: string;
  order: number;
  score?: number;
}

export const listExams = async (
  params: {
    page?: number;
    limit?: number;
    includeDeleted?: boolean;
    onlyDeleted?: boolean;
  } = {},
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

export const restoreExam = async (id: string): Promise<void> => {
  await api.post(`/api/exams/${id}/restore`);
};

export const hardDeleteExam = async (
  id: string,
  name: string,
): Promise<void> => {
  await api.delete(`/api/exams/${id}/hard`, { data: { name } });
};

export const copyExam = async (id: string): Promise<Exam> => {
  const response = await api.post<Exam>(`/api/exams/${id}/copy`);
  return response.data;
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

// 学生管理API
export interface ExamStudent {
  id: string;
  username: string;
  displayName?: string;
  createdAt: string;
  _count: {
    submissions: number;
  };
}

export interface CreateExamStudentDto {
  username: string;
  password: string;
  displayName?: string;
}

export const getExamStudents = async (
  examId: string,
): Promise<ExamStudent[]> => {
  const response = await api.get<ExamStudent[]>(
    `/api/exams/${examId}/students`,
  );
  return response.data;
};

export const addExamStudent = async (
  examId: string,
  data: CreateExamStudentDto,
): Promise<ExamStudent> => {
  const response = await api.post<ExamStudent>(
    `/api/exams/${examId}/students`,
    data,
  );
  return response.data;
};

export const generateExamStudents = async (
  examId: string,
  count: number,
  prefix?: string,
): Promise<{ success: number; failed: number; results: any[] }> => {
  const response = await api.post(`/api/exams/${examId}/students/generate`, {
    count,
    prefix,
  });
  return response.data;
};

export const deleteExamStudent = async (
  examId: string,
  studentId: string,
): Promise<void> => {
  await api.delete(`/api/exams/${examId}/students/${studentId}`);
};

export const updateQuestionInExam = async (
  examId: string,
  questionId: string,
  data: { order: number; score?: number },
): Promise<void> => {
  await api.put(`/api/exams/${examId}/questions/${questionId}`, data);
};
