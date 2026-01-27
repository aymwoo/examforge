import { useCallback, useEffect, useRef, useState } from "react";
import { streamSse } from "@/utils/sse";

export type ExamExportOptions = {
  includeGrades?: boolean;
  includeExamAiPdf?: boolean;
  includeStudentAiPdfs?: boolean;
  includeRawJson?: boolean;
  includeQuestions?: boolean;
};

export function useExamExport(examId?: string, options?: ExamExportOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<string | null>(null);
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<AbortController | null>(null);

  const close = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.abort();
      eventSourceRef.current = null;
    }
    setIsExporting(false);
    setIsOpen(false);
  }, []);

  const progressRef = useRef(0);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const startExport = useCallback(() => {
    if (!examId) return;

    // Reset completion marker for this run.
    hasCompletedRef.current = false;

    setIsOpen(true);
    setIsExporting(true);
    setProgress(0);
    setStep(null);
    setMeta(null);
    setMessage("准备导出...");
    setError(null);
    hasCompletedRef.current = false;

    if (eventSourceRef.current) {
      eventSourceRef.current.abort();
      eventSourceRef.current = null;
    }

    const params = new URLSearchParams();
    if (options) {
      if (options.includeGrades !== undefined) {
        params.set("includeGrades", String(options.includeGrades));
      }
      if (options.includeExamAiPdf !== undefined) {
        params.set("includeExamAiPdf", String(options.includeExamAiPdf));
      }
      if (options.includeStudentAiPdfs !== undefined) {
        params.set(
          "includeStudentAiPdfs",
          String(options.includeStudentAiPdfs),
        );
      }
      if (options.includeRawJson !== undefined) {
        params.set("includeRawJson", String(options.includeRawJson));
      }
      if (options.includeQuestions !== undefined) {
        params.set("includeQuestions", String(options.includeQuestions));
      }
    }

    const url = `/api/exams/${examId}/export/progress${params.toString() ? `?${params.toString()}` : ""}`;
    void (async () => {
      const controller = await streamSse({
        url,
        onMessage: (payload) => {
          try {
            const data = JSON.parse(payload);

            if (data.type === "progress") {
              setProgress(data.percentage ?? 0);
              setStep(data.step ?? null);
              setMessage(data.message ?? "");
              setMeta(data.meta ?? null);
              return;
            }

            if (data.type === "complete") {
              hasCompletedRef.current = true;
              setProgress(100);
              setStep("complete");
              setMessage("导出完成，正在下载...");
              window.location.href = data.downloadUrl;
              setTimeout(() => {
                close();
              }, 1000);
              controller.abort();
              return;
            }

            if (data.type === "error") {
              setError(data.message);
              setIsExporting(false);
              setStep("error");
              controller.abort();
            }
          } catch {
            // ignore parse errors
          }
        },
        onError: () => {
          // 许多浏览器在服务端正常结束 SSE 时也会触发 onerror。
          // 只要我们已经收到 complete 事件，就把后续 close/error 当成正常收尾。
          if (hasCompletedRef.current) {
            return;
          }

          setError("连接中断，请重试");
          setIsExporting(false);
        },
      });

      eventSourceRef.current = controller;
    })();
  }, [close, examId, options]);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.abort();
        eventSourceRef.current = null;
      }
    };
  }, []);

  return {
    startExport,
    close,
    modal: {
      isOpen,
      isExporting,
      progress,
      step,
      message,
      meta,
      error,
    },
  };
}
