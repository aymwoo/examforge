export enum ExamStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  ARCHIVED = "ARCHIVED",
}

export interface Exam {
  id: string;
  title: string;
  description?: string;
  duration: number; // minutes
  totalScore: number;
  status: ExamStatus;
  startTime?: Date;
  endTime?: Date;
  createdAt: Date;
  updatedAt: Date;
  questions?: ExamQuestion[];
}

export interface CreateExamDto {
  title: string;
  description?: string;
  duration: number;
  totalScore: number;
}

export interface UpdateExamDto {
  title?: string;
  description?: string;
  duration?: number;
  totalScore?: number;
  status?: ExamStatus;
  startTime?: Date;
  endTime?: Date;
}

export interface ExamQuestion {
  id: string;
  examId: string;
  questionId: string;
  order: number;
  score: number;
  question?: any;
}

export interface AddQuestionToExamDto {
  questionId: string;
  order: number;
  score: number;
}

export interface UpdateExamQuestionDto {
  order?: number;
  score?: number;
}
