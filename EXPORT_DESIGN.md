# Exam Data Export Feature Design

## Objective
Implement a robust data export functionality for the **Exam Details Page** (`ExamDetailPage.tsx`). This feature will allow users (teachers/admins) to export the exam content (questions, answers, settings) for offline usage, backup, or printing.

---

## Scope & Features

### 1. Backend Export (Zip + PDF + SSE)
Since the requirement now includes generating PDF reports and packaging everything into a specific ZIP file, we will move the export logic to the **Backend**.

#### A. New API Endpoints
- `GET /api/exams/:id/export/progress`: initiates the export process and returns an SSE stream.
  - **Events**:
    - `progress`: `{ percentage: number, message: string }`
    - `complete`: `{ downloadUrl: string }`
    - `error`: `{ message: string }`
- `GET /api/exams/download-export/:filename`: endpoint to download the generated temporary zip file.

#### B. Content Generation
1.  **Data Files**:
    - `exam_data.xlsx`: Using `xlsx` library on the server.
    - `exam_data.json`: Raw JSON dump.
2.  **Report Files (PDF)**:
    - **Library**: Use `pdfkit` to generate PDFs from text content.
    - `exam_report.pdf`: Generated from `Exam.aiAnalysisReport`.
    - `students/`: Directory containing individual reports.
      - `StudentName_Number.pdf`: Generated from `StudentAiAnalysisReport`.
3.  **Packaging**:
    - **Library**: `archiver` for creating ZIP files.

### 2. UI Changes (`ExamDetailPage.tsx`)
- Update the "Export" button logic.
- When clicked, show a **Modal** with a progress bar.
- Connect to SSE endpoint.
- On completion, trigger the download automatically and close the modal.

---

## Technical Implementation

### 1. Dependencies (Backend)
- `archiver`: For zip compression.
- `pdfkit`: For PDF generation.
- `xlsx`: For Excel generation on key.

### 2. Backend Logic (`ExamService`)
1.  **Process Step 1**: Fetch full Exam data with Questions and Students.
2.  **Process Step 2**: Generate `exam_info.xlsx` and `exam_info.json`.
3.  **Process Step 3**: Check `aiAnalysisReport`. If exists, generate `Report_Exam.pdf`.
4.  **Process Step 4**: Fetch all `StudentAiAnalysisReport`. Loop through and generate PDFs in a stream.
5.  **Process Step 5**: Finalize ZIP file using `archiver`.
6.  **Progress**: Emit SSE events after each major step or batch of students.

### 3. Frontend Logic
- Use `EventSource` to listen to `/api/exams/${id}/export/progress`.
- Handle `downloadUrl` to trigger file save.

---

## Usage Flow
1. User navigates to Exam Details Page.
2. Clicks the "Export" button in the top right.
3. Selects "Export to Excel".
4. System processes the current exam data.
5. Browser downloads `Exam_Title_Date.xlsx`.

## Questions for User
- Do you also need to export **Student Grades** from this page? (Note: Usually this fits better in the *Analytics* or *Student Management* tab, but we can add a shortcut here).
- Do you need a specific "Paper View" for printing directly?
