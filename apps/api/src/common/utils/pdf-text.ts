import { PdfReader, type DataEntry, type Error as PdfReaderError } from 'pdfreader';

interface TextItem {
  text: string;
  y: number;
  page: number;
}

type PdfReaderItem = DataEntry;

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const items: TextItem[] = [];
    let currentPage = 0;

    new PdfReader().parseBuffer(buffer, (err: PdfReaderError, item: PdfReaderItem) => {
      if (err) {
        reject(new globalThis.Error(err));
        return;
      }

      if (!item) {
        // End of parsing
        const result = processTextItems(items);
        resolve(result);
        return;
      }

      if (item.page) {
        currentPage = item.page;
      }

      if (item.text) {
        items.push({
          text: item.text,
          y: 'y' in item && typeof item.y === 'number' ? item.y : 0,

          page: currentPage,
        });
      }
    });
  });
}

function processTextItems(items: TextItem[]): string {
  const pageGroups = new Map<number, TextItem[]>();

  // Group items by page
  items.forEach((item) => {
    if (!pageGroups.has(item.page)) {
      pageGroups.set(item.page, []);
    }
    pageGroups.get(item.page)!.push(item);
  });

  const pages: string[] = [];

  pageGroups.forEach((pageItems, pageNum) => {
    // Sort by y position (top to bottom)
    pageItems.sort((a, b) => b.y - a.y);

    // Remove header/footer (top 10% and bottom 10% of page)
    const yPositions = pageItems.map((item) => item.y);
    const minY = Math.min(...yPositions);
    const maxY = Math.max(...yPositions);
    const yRange = maxY - minY;

    const headerThreshold = maxY - yRange * 0.1;
    const footerThreshold = minY + yRange * 0.1;

    const filteredItems = pageItems.filter(
      (item) => item.y <= headerThreshold && item.y >= footerThreshold
    );

    // Join text items
    const pageText = filteredItems
      .map((item) => item.text.trim())
      .filter((text) => text.length > 0)
      .join(' ');

    if (pageText.trim()) {
      pages.push(`--- Page ${pageNum} ---\n${pageText}`);
    }
  });

  return pages.join('\n\n');
}
