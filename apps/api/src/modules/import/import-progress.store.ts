export type PdfImportStage =
  | 'received'
  | 'extracting_text'
  | 'converting_pdf_to_images'
  | 'chunked_text'
  | 'calling_ai'
  | 'ai_response_received'
  | 'parsing_ai_response'
  | 'merging_questions'
  | 'saving_questions'
  | 'done'
  | 'error';

export interface PdfImportProgressEvent {
  time: number;
  stage: PdfImportStage;
  message: string;
  current?: number;
  total?: number;
  meta?: Record<string, unknown>;
  result?: {
    success: number;
    failed: number;
    errors: { row: number; message: string }[];
    questionIds?: string[];
  };
  questionIds?: string[];
}

export class ImportProgressStore {
  private readonly jobEvents = new Map<string, PdfImportProgressEvent[]>();

  createJob(jobId: string) {
    if (!this.jobEvents.has(jobId)) {
      this.jobEvents.set(jobId, []);
    }
  }

  append(jobId: string, event: Omit<PdfImportProgressEvent, 'time'>) {
    const events = this.jobEvents.get(jobId);
    if (!events) return;

    events.push({ ...event, time: Date.now() });

    // prevent unbounded memory growth
    if (events.length > 200) {
      events.splice(0, events.length - 200);
    }
  }

  getEventsSince(jobId: string, sinceTime?: number): PdfImportProgressEvent[] {
    const events = this.jobEvents.get(jobId) || [];
    if (!sinceTime) return events;
    return events.filter((e) => e.time > sinceTime);
  }

  delete(jobId: string) {
    this.jobEvents.delete(jobId);
  }
}
