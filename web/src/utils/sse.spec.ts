import { describe, it, expect, vi, beforeEach } from "vitest";
import { streamSse } from "./sse";

describe("streamSse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Connection Establishment", () => {
    it("should establish SSE connection with correct headers", async () => {
      const mockResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode('data: {"type":"connected"}\n\n'),
            );
            controller.close();
          },
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const onMessage = vi.fn();
      const onError = vi.fn();

      await streamSse({
        url: "/api/test",
        onMessage,
        onError,
      });

      expect(global.fetch).toHaveBeenCalledWith("/api/test", {
        headers: {
          Accept: "text/event-stream",
        },
        credentials: "include",
        signal: expect.any(AbortSignal),
      });
    });

    it("should merge custom headers with default headers", async () => {
      const mockResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.close();
          },
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await streamSse({
        url: "/api/test",
        headers: { Authorization: "Bearer token" },
        onMessage: vi.fn(),
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          headers: {
            Accept: "text/event-stream",
            Authorization: "Bearer token",
          },
        }),
      );
    });
  });

  describe("Message Parsing", () => {
    it("should parse single SSE event", async () => {
      const mockResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"type":"progress","current":1}\n\n',
              ),
            );
            controller.close();
          },
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const onMessage = vi.fn();

      await streamSse({
        url: "/api/test",
        onMessage,
      });

      expect(onMessage).toHaveBeenCalledWith('{"type":"progress","current":1}');
    });

    it("should parse multiple SSE events in single chunk", async () => {
      const mockResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"type":"progress","current":1}\n\n' +
                  'data: {"type":"progress","current":2}\n\n' +
                  'data: {"type":"complete"}\n\n',
              ),
            );
            controller.close();
          },
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const onMessage = vi.fn();

      await streamSse({
        url: "/api/test",
        onMessage,
      });

      expect(onMessage).toHaveBeenCalledTimes(3);
      expect(onMessage).toHaveBeenNthCalledWith(
        1,
        '{"type":"progress","current":1}',
      );
      expect(onMessage).toHaveBeenNthCalledWith(
        2,
        '{"type":"progress","current":2}',
      );
      expect(onMessage).toHaveBeenNthCalledWith(3, '{"type":"complete"}');
    });

    it("should handle events split across multiple chunks", async () => {
      const chunks = [
        'data: {"type":"pro',
        'gress","current":1}\n\ndata: {"ty',
        'pe":"complete"}\n\n',
      ];

      let chunkIndex = 0;
      const mockResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            const sendNext = () => {
              if (chunkIndex < chunks.length) {
                controller.enqueue(
                  new TextEncoder().encode(chunks[chunkIndex++]),
                );
                setTimeout(sendNext, 10);
              } else {
                controller.close();
              }
            };
            sendNext();
          },
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const onMessage = vi.fn();

      await streamSse({
        url: "/api/test",
        onMessage,
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(onMessage).toHaveBeenCalledTimes(2);
      expect(onMessage).toHaveBeenNthCalledWith(
        1,
        '{"type":"progress","current":1}',
      );
      expect(onMessage).toHaveBeenNthCalledWith(2, '{"type":"complete"}');
    });

    it("should ignore empty data lines", async () => {
      const mockResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                "data: \n\n" + 'data: {"type":"valid"}\n\n' + "data:    \n\n",
              ),
            );
            controller.close();
          },
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const onMessage = vi.fn();

      await streamSse({
        url: "/api/test",
        onMessage,
      });

      expect(onMessage).toHaveBeenCalledTimes(1);
      expect(onMessage).toHaveBeenCalledWith('{"type":"valid"}');
    });

    it("should handle data with leading whitespace", async () => {
      const mockResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode('data:   {"type":"test"}\n\n'),
            );
            controller.close();
          },
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const onMessage = vi.fn();

      await streamSse({
        url: "/api/test",
        onMessage,
      });

      expect(onMessage).toHaveBeenCalledWith('{"type":"test"}');
    });
  });

  describe("Error Handling", () => {
    it("should call onError when fetch fails", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const onMessage = vi.fn();
      const onError = vi.fn();

      await streamSse({
        url: "/api/test",
        onMessage,
        onError,
      });

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it("should call onError when response is not ok", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const onMessage = vi.fn();
      const onError = vi.fn();

      await streamSse({
        url: "/api/test",
        onMessage,
        onError,
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "SSE request failed: 404",
        }),
      );
    });

    it("should call onError when response has no body", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: null,
      });

      const onMessage = vi.fn();
      const onError = vi.fn();

      await streamSse({
        url: "/api/test",
        onMessage,
        onError,
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "SSE request failed: undefined",
        }),
      );
    });

    it("should not call onError when aborted", async () => {
      const mockResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.close();
          },
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const onMessage = vi.fn();
      const onError = vi.fn();

      const controller = await streamSse({
        url: "/api/test",
        onMessage,
        onError,
      });

      controller.abort();

      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe("Controller Return", () => {
    it("should return AbortController", async () => {
      const mockResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.close();
          },
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const controller = await streamSse({
        url: "/api/test",
        onMessage: vi.fn(),
      });

      expect(controller).toHaveProperty("abort");
      expect(controller).toHaveProperty("signal");
    });
  });

  describe("Buffer Processing", () => {
    it("should process remaining buffer when stream ends", async () => {
      const mockResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode('data: {"type":"final"}'),
            );
            controller.close();
          },
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const onMessage = vi.fn();

      await streamSse({
        url: "/api/test",
        onMessage,
      });

      expect(onMessage).toHaveBeenCalledWith('{"type":"final"}');
    });

    it("should handle incomplete data at end of stream", async () => {
      const mockResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("data: incomplete"));
            controller.close();
          },
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const onMessage = vi.fn();

      await streamSse({
        url: "/api/test",
        onMessage,
      });

      expect(onMessage).toHaveBeenCalledWith("incomplete");
    });
  });
});
