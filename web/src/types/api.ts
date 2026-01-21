import type {
  Question,
  CreateQuestionDto,
  UpdateQuestionDto,
  PaginatedResponse,
  Exam,
  CreateExamDto,
} from "@examforge/shared-types";

export interface QuestionListParams {
  page?: number;
  limit?: number;
  type?: string;
  difficulty?: number;
  tags?: string[];
}

export interface ExamListParams {
  page?: number;
  limit?: number;
  status?: string;
}

export type {
  Question,
  CreateQuestionDto,
  UpdateQuestionDto,
  PaginatedResponse,
  Exam,
  CreateExamDto,
};
