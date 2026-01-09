import { QuestionType } from '@/common/enums/question.enum';
export declare class OptionDto {
    label: string;
    content: string;
}
export declare class CreateQuestionDto {
    content: string;
    type: QuestionType;
    options?: OptionDto[];
    answer?: string;
    explanation?: string;
    tags?: string[];
    difficulty?: number;
    knowledgePoint?: string;
    isPublic?: boolean;
}
