import { CreateQuestionDto } from './create-question.dto';
import { QuestionStatus } from '@/common/enums/question.enum';
declare const UpdateQuestionDto_base: import("@nestjs/common").Type<Partial<CreateQuestionDto>>;
export declare class UpdateQuestionDto extends UpdateQuestionDto_base {
    status?: QuestionStatus;
}
export {};
