type StreamOptions = {
  url: string;
  headers?: Record<string, string>;
  onMessage: (data: string) => void;
  onError?: (error: unknown) => void;
};

export const streamSse = async ({
  url,
  headers,
  onMessage,
  onError,
}: StreamOptions) => {
  const controller = new AbortController();

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/event-stream",
        ...headers,
      },
      credentials: "include",
      signal: controller.signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`SSE request failed: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = "";

    const processBuffer = () => {
      let delimiterIdx = sseBuffer.indexOf("\n\n");
      while (delimiterIdx !== -1) {
        const chunk = sseBuffer.slice(0, delimiterIdx);
        sseBuffer = sseBuffer.slice(delimiterIdx + 2);

        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data:")) {
            const data = line.slice(5).trimStart();
            if (data) {
              onMessage(data);
            }
          }
        }

        delimiterIdx = sseBuffer.indexOf("\n\n");
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        if (sseBuffer.trim()) {
          sseBuffer += "\n\n";
          processBuffer();
        }
        break;
      }
      sseBuffer += decoder.decode(value, { stream: true });
      processBuffer();
    }
  } catch (error) {
    if (!controller.signal.aborted) {
      onError?.(error);
    }
  }

  return controller;
};
