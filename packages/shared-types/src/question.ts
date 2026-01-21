export enum QuestionType {
  SINGLE_CHOICE = "SINGLE_CHOICE",
  MULTIPLE_CHOICE = "MULTIPLE_CHOICE",
  TRUE_FALSE = "TRUE_FALSE",
  FILL_BLANK = "FILL_BLANK",
  ESSAY = "ESSAY",
}

export const QuestionTypeLabels: Record<QuestionType, string> = {
  [QuestionType.SINGLE_CHOICE]: "单选题",
  [QuestionType.MULTIPLE_CHOICE]: "多选题",
  [QuestionType.TRUE_FALSE]: "判断题",
  [QuestionType.FILL_BLANK]: "填空题",
  [QuestionType.ESSAY]: "简答题",
};

export enum QuestionStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  ARCHIVED = "ARCHIVED",
}

export interface QuestionOption {
  label: string;
  content: string;
}

export interface Question {
  id: string;
  content: string;
  type: QuestionType;
  options?: QuestionOption[];
  answer: string;
  explanation?: string;
  illustration?: string;
  images?: string;
  tags: string[];
  difficulty: number;
  status: QuestionStatus;
  knowledgePoint?: string;
  importOrder?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateQuestionDto {
  content: string;
  type: QuestionType;
  options?: QuestionOption[];
  answer: string;
  explanation?: string;
  tags?: string[];
  difficulty?: number;
  knowledgePoint?: string;
}

export interface UpdateQuestionDto {
  content?: string;
  type?: QuestionType;
  options?: QuestionOption[];
  answer?: string;
  explanation?: string;
  tags?: string[];
  difficulty?: number;
  status?: QuestionStatus;
  knowledgePoint?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  type?: QuestionType;
  difficulty?: number;
  tags?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
