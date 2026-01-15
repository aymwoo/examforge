export type AiGenerationStage =
  | 'initiated'
  | 'processing'
  | 'generating_questions'
  | 'validating_questions'
  | 'formatting_output'
  | 'completed'
  | 'error';

export interface AiGenerationProgressEvent {
  time: number;
  stage: AiGenerationStage;
  message: string;
  current?: number;
  total?: number;
  meta?: Record<string, unknown>;
  result?: {
    questions: any[];
  };
}

export class AiProgressStore {
  private readonly jobEvents = new Map<string, AiGenerationProgressEvent[]>();

  createJob(jobId: string) {
    if (!this.jobEvents.has(jobId)) {
      this.jobEvents.set(jobId, []);
    }
  }

  append(jobId: string, event: Omit<AiGenerationProgressEvent, 'time'>) {
    const events = this.jobEvents.get(jobId);
    if (!events) return;

    events.push({ ...event, time: Date.now() });

    // prevent unbounded memory growth
    if (events.length > 100) {
      events.splice(0, events.length - 100);
    }
  }

  getEventsSince(jobId: string, sinceTime?: number): AiGenerationProgressEvent[] {
    const events = this.jobEvents.get(jobId) || [];
    if (!sinceTime) return events;
    return events.filter((e) => e.time > sinceTime);
  }

  delete(jobId: string) {
    this.jobEvents.delete(jobId);
  }
}