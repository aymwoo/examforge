import { QuestionType } from '../enums/question.enum';
export declare class PaginationDto {
    page?: number;
    limit?: number;
    type?: QuestionType;
    difficulty?: number;
    tags?: string | string[];
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}
