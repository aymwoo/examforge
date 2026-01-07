// Use legacy build for Node.js environment (no DOM dependencies)
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const data = new Uint8Array(buffer);
  const pdf = await getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
  }).promise;

  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    // Extract text items and join with space
    const pageText = textContent.items
      .filter((item): item is TextItem => 'str' in item)
      .map((item) => item.str)
      .join(' ');

    if (pageText.trim()) {
      pages.push(`--- Page ${i} ---\n${pageText}`);
    }
  }

  return pages.join('\n\n');
}
