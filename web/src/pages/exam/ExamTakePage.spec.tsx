import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ExamTakePage from "./ExamTakePage";
import api from "@/services/api";
import { streamSse } from "@/utils/sse";

// Mock dependencies
vi.mock("@/services/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("@/utils/sse", () => ({
  streamSse: vi.fn(),
}));

vi.mock("@/utils/url", () => ({
  resolveAssetUrl: vi.fn((url: string) => url),
}));

vi.mock("@/components/exam/FillBlankQuestion", () => ({
  FillBlankQuestion: vi.fn(({ id, content, value, onChange }) => (
    <div data-testid="fill-blank-question" data-question-id={id}>
      <p>{content}</p>
      <textarea
        data-testid="fill-blank-input"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )),
}));

vi.mock("@/components/exam/MatchingQuestion", () => ({
  MatchingQuestion: vi.fn(
    ({
      content,
      onChange,
    }: {
      content: string;
      onChange: (val: unknown) => void;
    }) => (
      <div data-testid="matching-question">
        <p>{content}</p>
        <button
          data-testid="matching-button"
          onClick={() => onChange([{ left: "A", right: "B" }])}
        >
          Select Match
        </button>
      </div>
    ),
  ),
}));

vi.mock("@uiw/react-md-editor", () => ({
  default: vi.fn(
    ({
      value,
      onChange,
    }: {
      value: string;
      onChange: (val: string) => void;
    }) => (
      <textarea
        data-testid="md-editor"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    ),
  ),
}));

// Mock window.confirm
const mockConfirm = vi.fn();
Object.defineProperty(window, "confirm", {
  value: mockConfirm,
});

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
});

// Mock console methods
vi.spyOn(console, "error").mockImplementation(() => {});
vi.spyOn(console, "log").mockImplementation(() => {});

const mockExamData = {
  id: "exam-1",
  title: "Test Exam",
  description: "Test Description",
  duration: 60,
  totalScore: 100,
  feedbackVisibility: "FULL_DETAILS",
  questions: [
    {
      id: "q1",
      content: "What is the capital of France?",
      type: "SINGLE_CHOICE",
      options: ["London", "Paris", "Berlin", "Madrid"],
      score: 10,
      order: 1,
      images: [],
    },
    {
      id: "q2",
      content: "Which are programming languages?",
      type: "MULTIPLE_CHOICE",
      options: ["JavaScript", "HTML", "Python", "CSS"],
      score: 10,
      order: 2,
      images: [],
    },
    {
      id: "q3",
      content: "The Earth is flat.",
      type: "TRUE_FALSE",
      score: 5,
      order: 3,
      images: [],
    },
    {
      id: "q4",
      content: "Fill in the blank: _____ is the largest planet.",
      type: "FILL_BLANK",
      score: 10,
      order: 4,
      images: [],
    },
    {
      id: "q5",
      content: "Match the countries with their capitals",
      type: "MATCHING",
      score: 15,
      order: 5,
      matching: {
        leftItems: ["USA", "UK", "France"],
        rightItems: ["Washington", "London", "Paris"],
        matches: {},
      },
      images: [],
    },
    {
      id: "q6",
      content: "Explain the theory of relativity.",
      type: "ESSAY",
      score: 50,
      order: 6,
      images: [],
    },
  ],
};

const mockStudent = {
  id: "student-1",
  username: "testuser",
  displayName: "Test User",
};

const renderWithRouter = (examId: string = "exam-1") => {
  return render(
    <MemoryRouter initialEntries={[`/exam/${examId}/take`]}>
      <Routes>
        <Route path="/exam/:examId/take" element={<ExamTakePage />} />
        <Route path="/exam/:examId/login" element={<div>Login Page</div>} />
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
};

describe("ExamTakePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup localStorage mock to return valid student data by default
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === "examStudent") {
        return JSON.stringify(mockStudent);
      }
      return null;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Rendering", () => {
    it("should show loading state initially", () => {
      // Use fake timers for this synchronous test
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.mocked(api.get).mockImplementation(() => new Promise(() => {}));
      renderWithRouter();
      expect(screen.getByText("加载中...")).toBeInTheDocument();
    });

    it("should render exam after loading", async () => {
      // Mock API to return exam data and submission status
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url.includes("/submission-status/")) {
          return Promise.resolve({ data: { hasSubmitted: false } });
        }
        return Promise.resolve({ data: mockExamData });
      });

      renderWithRouter();

      // Wait for the exam title to appear
      await waitFor(
        () => {
          expect(screen.getByText("Test Exam")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Verify student name and question are displayed
      expect(screen.getByText("Test User")).toBeInTheDocument();
      expect(screen.getByText(/第 1 题/)).toBeInTheDocument();
    });

    it("should show error state when API fails", async () => {
      // Mock API to reject with error message
      vi.mocked(api.get).mockRejectedValue({
        response: { data: { message: "Failed to load exam" } },
      });

      renderWithRouter();

      // Wait for error message to appear
      await waitFor(
        () => {
          expect(screen.getByText("Failed to load exam")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });

    it("should show error state with default message when no error message provided", async () => {
      vi.mocked(api.get).mockRejectedValue(new Error("Network error"));

      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText("加载考试信息失败")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });
  });

  describe("Authentication", () => {
    it("should redirect to login when student is not in localStorage", async () => {
      // Mock localStorage to return null (no student data)
      mockLocalStorage.getItem.mockReturnValue(null);

      // Mock API calls
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url.includes("/submission-status/")) {
          return Promise.resolve({ data: { hasSubmitted: false } });
        }
        return Promise.resolve({ data: mockExamData });
      });

      renderWithRouter();

      // Should redirect to login page when no student data
      await waitFor(
        () => {
          expect(screen.getByText("Login Page")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });

    it("should redirect to login on 401 error", async () => {
      vi.mocked(api.get).mockRejectedValue({
        response: { status: 401 },
      });

      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText("Login Page")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("examToken");
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("examStudent");
    });

    it("should handle invalid student data in localStorage", async () => {
      mockLocalStorage.getItem.mockReturnValue("invalid-json");

      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url.includes("/submission-status/")) {
          return Promise.resolve({ data: { hasSubmitted: false } });
        }
        return Promise.resolve({ data: mockExamData });
      });

      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText("Test Exam")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("examStudent");
    });
  });

  describe("Question Navigation", () => {
    beforeEach(() => {
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url.includes("/submission-status/")) {
          return Promise.resolve({ data: { hasSubmitted: false } });
        }
        return Promise.resolve({ data: mockExamData });
      });
    });

    it("should navigate to next question", async () => {
      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText("Test Exam")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      expect(screen.getByText(/第 1 题/)).toBeInTheDocument();

      const nextButton = screen.getByText("下一题");
      fireEvent.click(nextButton);

      expect(screen.getByText(/第 2 题/)).toBeInTheDocument();
    });

    it("should navigate to previous question", async () => {
      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText("Test Exam")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Go to question 2 first
      const nextButton = screen.getByText("下一题");
      fireEvent.click(nextButton);
      expect(screen.getByText(/第 2 题/)).toBeInTheDocument();

      // Go back to question 1
      const prevButton = screen.getByText("上一题");
      fireEvent.click(prevButton);
      expect(screen.getByText(/第 1 题/)).toBeInTheDocument();
    });

    it("should disable previous button on first question", async () => {
      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText("Test Exam")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      const prevButton = screen.getByText("上一题");
      expect(prevButton).toBeDisabled();
    });

    it("should show submit button on last question", async () => {
      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText("Test Exam")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Navigate to last question (question 6)
      for (let i = 0; i < 5; i++) {
        const nextButton = screen.getByText("下一题");
        fireEvent.click(nextButton);
      }

      expect(screen.getByText(/第 6 题/)).toBeInTheDocument();
      expect(screen.getByText("提交试卷")).toBeInTheDocument();
    });

    it("should navigate using question grid buttons", async () => {
      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText("Test Exam")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      const questionButtons = screen
        .getAllByRole("button")
        .filter((btn) => btn.className.includes("w-8 h-8"));

      // Click on question 3
      fireEvent.click(questionButtons[2]);
      expect(screen.getByText(/第 3 题/)).toBeInTheDocument();
    });
  });

  describe("Answer Selection", () => {
    beforeEach(() => {
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url.includes("/submission-status/")) {
          return Promise.resolve({ data: { hasSubmitted: false } });
        }
        return Promise.resolve({ data: mockExamData });
      });
    });

    it("should select single choice answer", async () => {
      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText("Test Exam")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      const radioButtons = screen.getAllByRole("radio");
      fireEvent.click(radioButtons[1]); // Select "Paris"

      expect(radioButtons[1]).toBeChecked();
    });

    it("should select multiple choice answers", async () => {
      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText("Test Exam")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Navigate to question 2 (multiple choice)
      const nextButton = screen.getByText("下一题");
      fireEvent.click(nextButton);

      const checkboxes = screen.getAllByRole("checkbox");
      fireEvent.click(checkboxes[0]); // Select "JavaScript"
      fireEvent.click(checkboxes[2]); // Select "Python"

      expect(checkboxes[0]).toBeChecked();
      expect(checkboxes[2]).toBeChecked();
      expect(checkboxes[1]).not.toBeChecked();
      expect(checkboxes[3]).not.toBeChecked();
    });

    it("should select true/false answer", async () => {
      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText("Test Exam")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Navigate to question 3 (true/false)
      const nextButton = screen.getByText("下一题");
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);

      const radioButtons = screen.getAllByRole("radio");
      fireEvent.click(radioButtons[1]); // Select "错误" (false)

      expect(radioButtons[1]).toBeChecked();
    });

    it("should render fill blank question", async () => {
      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText("Test Exam")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Navigate to question 4 (fill blank)
      const nextButton = screen.getByText("下一题");
      for (let i = 0; i < 3; i++) {
        fireEvent.click(nextButton);
      }

      expect(screen.getByTestId("fill-blank-question")).toBeInTheDocument();
    });

    it("should render matching question", async () => {
      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText("Test Exam")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Navigate to question 5 (matching)
      const nextButton = screen.getByText("下一题");
      for (let i = 0; i < 4; i++) {
        fireEvent.click(nextButton);
      }

      expect(screen.getByTestId("matching-question")).toBeInTheDocument();
    });

    it("should render essay question with MDEditor", async () => {
      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText("Test Exam")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Navigate to question 6 (essay)
      const nextButton = screen.getByText("下一题");
      for (let i = 0; i < 5; i++) {
        fireEvent.click(nextButton);
      }

      expect(screen.getByTestId("md-editor")).toBeInTheDocument();
    });
  });

  describe("Timer", () => {
    beforeEach(() => {
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url.includes("/submission-status/")) {
          return Promise.resolve({ data: { hasSubmitted: false } });
        }
        return Promise.resolve({ data: mockExamData });
      });
    });

    it("should display timer", async () => {
      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText("Test Exam")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Timer should show 01:00:00 (60 minutes)
      expect(screen.getByText("01:00:00")).toBeInTheDocument();
    });

    it("should countdown timer", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText("Test Exam")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Advance timer by 5 seconds
      vi.advanceTimersByTime(5000);

      expect(screen.getByText("00:59:55")).toBeInTheDocument();
    });

    it("should show red text when time is less than 5 minutes", async () => {
      const shortDurationExam = {
        ...mockExamData,
        duration: 4, // 4 minutes
      };

      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url.includes("/submission-status/")) {
          return Promise.resolve({ data: { hasSubmitted: false } });
        }
        return Promise.resolve({ data: shortDurationExam });
      });

      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText("Test Exam")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      const timerElement = screen.getByText("00:04:00");
      expect(timerElement).toHaveClass("text-red-600");
    });
  });

  describe("Auto-save", () => {
    beforeEach(() => {
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url.includes("/submission-status/")) {
          return Promise.resolve({ data: { hasSubmitted: false } });
        }
        return Promise.resolve({ data: mockExamData });
      });

      vi.mocked(api.post).mockResolvedValue({ data: {} });
    });

    it("should auto-save answers periodically", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText("Test Exam")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Select an answer first
      const radioButtons = screen.getAllByRole("radio");
      fireEvent.click(radioButtons[0]);

      // Advance timer by 30 seconds (auto-save interval)
      vi.advanceTimersByTime(30000);

      await waitFor(
        () => {
          expect(api.post).toHaveBeenCalledWith(
            "/api/exams/exam-1/save-answers",
            expect.any(Object),
            expect.any(Object),
          );
        },
        { timeout: 3000 },
      );
    });

    it("should show auto-saving indicator", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      vi.mocked(api.post).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ data: {} }), 100);
        });
      });

      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText("Test Exam")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Click manual save button
      const saveButton = screen.getByText("保存答案");
      fireEvent.click(saveButton);

      expect(screen.getByText("保存中...")).toBeInTheDocument();
    });
  });

  describe("Exam Submission", () => {
    beforeEach(() => {
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url.includes("/submission-status/")) {
          return Promise.resolve({ data: { hasSubmitted: false } });
        }
        return Promise.resolve({ data: mockExamData });
      });

      vi.mocked(api.post).mockResolvedValue({ data: {} });
    });

    it("should show submit confirmation modal", async () => {
      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText("Test Exam")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Click submit button in sidebar
      const submitButton = screen.getByText("提交考试");
      fireEvent.click(submitButton);

      expect(screen.getByText("确认提交")).toBeInTheDocument();
      expect(
        screen.getByText("提交后将无法修改答案，是否确认提交？"),
      ).toBeInTheDocument();
    });

    it("should cancel submission when clicking cancel", async () => {
      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText("Test Exam")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      const submitButton = screen.getByText("提交考试");
      fireEvent.click(submitButton);

      const cancelButton = screen.getByText("取消");
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText("确认提交")).not.toBeInTheDocument();
      });

      expect(api.post).not.toHaveBeenCalledWith(
        "/api/exams/exam-1/submit",
        expect.any(Object),
        expect.any(Object),
      );
    });

    it("should submit exam when confirming", async () => {
      const mockSseController = {
        abort: vi.fn(),
        signal: new AbortController().signal,
      };
      vi.mocked(streamSse).mockResolvedValue(mockSseController);

      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText("Test Exam")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      const submitButton = screen.getByText("提交考试");
      fireEvent.click(submitButton);

      const confirmButton = screen.getByText("确认提交");
      fireEvent.click(confirmButton);

      await waitFor(
        () => {
          expect(api.post).toHaveBeenCalledWith(
            "/api/exams/exam-1/submit",
            { answers: {} },
            expect.any(Object),
          );
        },
        { timeout: 3000 },
      );
    });

    it("should show progress modal during submission", async () => {
      const mockSseController = {
        abort: vi.fn(),
        signal: new AbortController().signal,
      };
      vi.mocked(streamSse).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(mockSseController), 100);
        });
      });

      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText("Test Exam")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      const submitButton = screen.getByText("提交考试");
      fireEvent.click(submitButton);

      const confirmButton = screen.getByText("确认提交");
      fireEvent.click(confirmButton);

      await waitFor(
        () => {
          expect(screen.getByText("提交中")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });

    it("should handle SSE progress updates", async () => {
      const mockSseController = {
        abort: vi.fn(),
        signal: new AbortController().signal,
      };
      let messageHandler: ((data: string) => void) | null = null;

      vi.mocked(streamSse).mockImplementation(({ onMessage }) => {
        messageHandler = onMessage;
        return Promise.resolve(mockSseController);
      });

      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText("Test Exam")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      const submitButton = screen.getByText("提交考试");
      fireEvent.click(submitButton);

      const confirmButton = screen.getByText("确认提交");
      fireEvent.click(confirmButton);

      await waitFor(
        () => {
          expect(messageHandler).toBeTruthy();
        },
        { timeout: 3000 },
      );

      // Simulate progress message
      messageHandler!(
        JSON.stringify({
          type: "progress",
          current: 5,
          total: 10,
          message: "Grading question 5 of 10",
        }),
      );

      expect(screen.getByText("Grading question 5 of 10")).toBeInTheDocument();
    });

    it("should show submitted state after completion", async () => {
      const mockSubmission = {
        id: "sub-1",
        score: 85,
        submittedAt: new Date().toISOString(),
        answers: {},
      };

      const mockSseController = {
        abort: vi.fn(),
        signal: new AbortController().signal,
      };
      let messageHandler: ((data: string) => void) | null = null;

      vi.mocked(streamSse).mockImplementation(({ onMessage }) => {
        messageHandler = onMessage;
        return Promise.resolve(mockSseController);
      });

      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url.includes("/submission-status/")) {
          return Promise.resolve({
            data: {
              hasSubmitted: false,
              submission: null,
            },
          });
        }
        return Promise.resolve({ data: mockExamData });
      });

      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText("Test Exam")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      const submitButton = screen.getByText("提交考试");
      fireEvent.click(submitButton);

      const confirmButton = screen.getByText("确认提交");
      fireEvent.click(confirmButton);

      await waitFor(
        () => {
          expect(messageHandler).toBeTruthy();
        },
        { timeout: 3000 },
      );

      // Simulate completion message
      messageHandler!(
        JSON.stringify({
          type: "complete",
          submission: mockSubmission,
        }),
      );

      await waitFor(
        () => {
          expect(screen.getByText("考试已提交")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      expect(screen.getByText("85分")).toBeInTheDocument();
    });
  });

  describe("Submitted State", () => {
    it("should show already submitted view if exam was submitted", async () => {
      const mockSubmission = {
        id: "sub-1",
        score: 90,
        submittedAt: new Date().toISOString(),
        answers: { q1: "Paris" },
        gradingDetails: JSON.stringify({
          totalScore: 90,
          maxTotalScore: 100,
          details: {
            q1: {
              score: 10,
              maxScore: 10,
              correctAnswer: "Paris",
              studentAnswer: "Paris",
            },
          },
        }),
      };

      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url.includes("/submission-status/")) {
          return Promise.resolve({
            data: {
              hasSubmitted: true,
              submission: mockSubmission,
            },
          });
        }
        return Promise.resolve({ data: mockExamData });
      });

      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText("考试已提交")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      expect(screen.getByText("90分")).toBeInTheDocument();
      expect(screen.getByText("返回首页")).toBeInTheDocument();
    });

    it("should show warning for exams with essay questions", async () => {
      const mockSubmission = {
        id: "sub-1",
        score: 85,
        submittedAt: new Date().toISOString(),
        answers: {},
      };

      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url.includes("/submission-status/")) {
          return Promise.resolve({
            data: {
              hasSubmitted: true,
              submission: mockSubmission,
            },
          });
        }
        return Promise.resolve({ data: mockExamData });
      });

      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText("考试已提交")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      expect(screen.getByText(/试卷中包含主观题/)).toBeInTheDocument();
    });

    it("should show detailed results when clicking details button", async () => {
      const mockSubmission = {
        id: "sub-1",
        score: 90,
        submittedAt: new Date().toISOString(),
        answers: { q1: "Paris" },
        gradingDetails: {
          totalScore: 90,
          maxTotalScore: 100,
          details: {
            q1: {
              score: 10,
              maxScore: 10,
              correctAnswer: "Paris",
              studentAnswer: "Paris",
              feedback: "Correct!",
            },
          },
        },
      };

      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url.includes("/submission-status/")) {
          return Promise.resolve({
            data: {
              hasSubmitted: true,
              submission: mockSubmission,
            },
          });
        }
        return Promise.resolve({ data: mockExamData });
      });

      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText("考试已提交")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      const detailsButton = screen.getByText("评分详情");
      fireEvent.click(detailsButton);

      await waitFor(
        () => {
          expect(screen.getByText("评分详情")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });
  });

  describe("Logout", () => {
    beforeEach(() => {
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url.includes("/submission-status/")) {
          return Promise.resolve({ data: { hasSubmitted: false } });
        }
        return Promise.resolve({ data: mockExamData });
      });

      vi.mocked(api.post).mockResolvedValue({ data: {} });
    });

    it("should handle logout when confirmed", async () => {
      mockConfirm.mockReturnValue(true);

      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText("Test Exam")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      const logoutButton = screen.getByText("退出考试");
      fireEvent.click(logoutButton);

      expect(mockConfirm).toHaveBeenCalledWith(
        "确定要退出考试吗？未保存的答案将丢失。",
      );

      await waitFor(
        () => {
          expect(screen.getByText("Login Page")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("examStudent");
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("examToken");
    });

    it("should not logout when cancelled", async () => {
      mockConfirm.mockReturnValue(false);

      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText("Test Exam")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      const logoutButton = screen.getByText("退出考试");
      fireEvent.click(logoutButton);

      expect(mockConfirm).toHaveBeenCalled();
      expect(screen.getByText("Test Exam")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle exam with no questions", async () => {
      const emptyExam = {
        ...mockExamData,
        questions: [],
      };

      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url.includes("/submission-status/")) {
          return Promise.resolve({ data: { hasSubmitted: false } });
        }
        return Promise.resolve({ data: emptyExam });
      });

      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText("Test Exam")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Should not crash with empty questions
      expect(screen.getByText("题目导航")).toBeInTheDocument();
    });

    it("should handle questions with images", async () => {
      const examWithImages = {
        ...mockExamData,
        questions: [
          {
            ...mockExamData.questions[0],
            images: ["/uploads/image1.jpg", "/uploads/image2.jpg"],
          },
        ],
      };

      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url.includes("/submission-status/")) {
          return Promise.resolve({ data: { hasSubmitted: false } });
        }
        return Promise.resolve({ data: examWithImages });
      });

      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText("Test Exam")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      const images = screen.getAllByRole("img");
      expect(images.length).toBeGreaterThan(0);
    });

    it("should handle API errors during submission gracefully", async () => {
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url.includes("/submission-status/")) {
          return Promise.resolve({ data: { hasSubmitted: false } });
        }
        return Promise.resolve({ data: mockExamData });
      });

      vi.mocked(api.post).mockRejectedValue({
        response: { data: { message: "Submission failed" } },
      });

      renderWithRouter();

      await waitFor(
        () => {
          expect(screen.getByText("Test Exam")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      const submitButton = screen.getByText("提交考试");
      fireEvent.click(submitButton);

      const confirmButton = screen.getByText("确认提交");
      fireEvent.click(confirmButton);

      await waitFor(
        () => {
          expect(screen.getByText("Submission failed")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });

    it("should handle missing examId param", () => {
      render(
        <MemoryRouter initialEntries={["/exam//take"]}>
          <Routes>
            <Route path="/exam/:examId/take" element={<ExamTakePage />} />
          </Routes>
        </MemoryRouter>,
      );

      // Should not crash
      expect(screen.getByText("加载中...")).toBeInTheDocument();
    });
  });
});
