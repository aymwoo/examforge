import { PdfReader } from 'pdfreader';

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const items: Array<{ page: number; x: number; y: number; text: string }> = [];

    new PdfReader().parseBuffer(buffer, (err, item) => {
      if (err) {
        reject(err);
        return;
      }

      if (!item) {
        const text = items
          .sort((a, b) => {
            if (a.page !== b.page) return a.page - b.page;
            if (a.y !== b.y) return a.y - b.y;
            return a.x - b.x;
          })
          .map((i) => i.text)
          .join(' ');
        resolve(text);
        return;
      }

      if (typeof item.text === 'string') {
        items.push({
          page: typeof item.page === 'number' ? item.page : 0,
          x: typeof item.x === 'number' ? item.x : 0,
          y: typeof item.y === 'number' ? item.y : 0,
          text: item.text,
        });
      }
    });
  });
}
