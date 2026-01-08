export declare enum ExamAccountMode {
    PERMANENT = "PERMANENT",
    TEMPORARY_IMPORT = "TEMPORARY_IMPORT",
    TEMPORARY_REGISTER = "TEMPORARY_REGISTER"
}
export declare class CreateExamDto {
    title: string;
    description?: string;
    duration: number;
    totalScore?: number;
    accountModes?: ExamAccountMode[];
    startTime?: string;
    endTime?: string;
}
