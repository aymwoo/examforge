# Exam Data Export Feature Design

## Objective

Implement a robust data export functionality for the **Exam Details Page** (`ExamDetailPage.tsx`). This feature allows users (teachers/admins) to export the exam content (questions, answers, settings, AI reports) for offline usage, backup, or printing.

---

## Scope & Features

### 1. Backend Export (Zip + PDF + SSE)

The export logic is implemented on the **Backend**.

#### A. API Endpoints

- `GET /api/exams/:id/export`: Initiates the export process and returns an SSE stream.
  - **Events**:
    - `start`: `{ message: string }`
    - `progress`: `{ percentage: number, message: string }`
    - `stream`: `{ content: string }` - For incremental content
    - `complete`: `{ downloadUrl: string }`
    - `error`: `{ message: string }`
- `GET /api/exams/download-export/:filename`: Download the generated temporary zip file.

#### B. Content Generation

1.  **Data Files**:
    - `exam_data.xlsx`: Using `xlsx` library on the server.
    - `exam_data.json`: Raw JSON dump.
2.  **Report Files (PDF)**:
    - **Library**: `pdfkit` for PDF generation.
    - `exam_report.pdf`: Generated from `Exam.aiAnalysisReport`.
    - `students/`: Directory containing individual reports.
      - `StudentName_Number.pdf`: Generated from `StudentAiAnalysisReport`.
3.  **Packaging**:
    - **Library**: `archiver` for creating ZIP files.

#### C. Cleanup

- Generated ZIP files are stored in `temp/downloads/`
- Automatic cleanup runs every 10 minutes (configurable via `EXAM_EXPORT_ZIP_RETENTION_MINUTES`)
- Files older than retention period are deleted

### 2. Frontend Implementation (`ExamDetailPage.tsx`)

- Export button opens a modal with progress display
- Connects to SSE endpoint for real-time progress
- On completion, triggers automatic file download
- Handles errors and allows retry

---

## Technical Implementation

### 1. Dependencies (Backend)

- `archiver`: For zip compression.
- `pdfkit`: For PDF generation.
- `xlsx`: For Excel generation.

### 2. Backend Logic (`ExamService`)

1.  **Step 1**: Fetch full Exam data with Questions and Students.
2.  **Step 2**: Generate `exam_data.xlsx` and `exam_data.json`.
3.  **Step 3**: Check `aiAnalysisReport`. If exists, generate `Report_Exam.pdf`.
4.  **Step 4**: Fetch all `StudentAiAnalysisReport`. Generate individual PDFs.
5.  **Step 5**: Finalize ZIP file using `archiver`.
6.  **Progress**: Emit SSE events after each major step.

### 3. Frontend Logic

- Use `EventSource` to listen to `/api/exams/${id}/export`.
- Handle `downloadUrl` to trigger file save via hidden anchor tag.

---

## Usage Flow

1. User navigates to Exam Details Page.
2. Clicks the "Export" button in the top right.
3. Selects export options (if any).
4. Modal shows real-time progress via SSE.
5. On completion, browser automatically downloads `Exam_Title_Timestamp.zip`.

---

## Implementation Status

✅ Backend SSE export endpoint implemented
✅ ZIP file generation with archiver
✅ PDF generation with pdfkit
✅ Excel/JSON data export
✅ Automatic cleanup of old exports
✅ Frontend progress modal

## Notes

- Export files are temporary and auto-cleaned
- Large exams may take longer to export
- Progress events include percentage and message
