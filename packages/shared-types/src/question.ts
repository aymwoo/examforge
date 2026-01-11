export enum QuestionType {
  SINGLE_CHOICE = 'SINGLE_CHOICE',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  FILL_BLANK = 'FILL_BLANK',
  ESSAY = 'ESSAY',
}

export enum QuestionStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
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
