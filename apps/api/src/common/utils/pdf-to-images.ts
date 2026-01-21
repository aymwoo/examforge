import { spawn } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { processPdfImages, CropOptions, StitchOptions } from './image-processor';

export interface PdfToImagesOptions {
  resolutionDpi?: number;
  cropOptions?: CropOptions;
  stitchOptions?: StitchOptions;
  enableProcessing?: boolean;
}

export async function convertPdfToPngBuffers(
  pdfBuffer: Buffer,
  opts: PdfToImagesOptions = {}
): Promise<Buffer[]> {
  const resolutionDpi = opts.resolutionDpi ?? 200;
  const { cropOptions, stitchOptions, enableProcessing = false } = opts;

  const dir = await mkdtemp(join(tmpdir(), 'examforge-pdf-'));
  const pdfPath = join(dir, 'input.pdf');
  const outPrefix = join(dir, 'page');

  try {
    await writeFile(pdfPath, pdfBuffer);

    await new Promise<void>((resolve, reject) => {
      const child = spawn('pdftoppm', ['-png', '-r', String(resolutionDpi), pdfPath, outPrefix], {
        stdio: ['ignore', 'ignore', 'pipe'],
      });

      let stderr = '';
      child.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(new Error(`pdftoppm failed with code ${code}: ${stderr}`));
      });
    });

    const files = (await readdir(dir))
      .filter((f) => f.startsWith('page-') && f.endsWith('.png'))
      .sort((a, b) => {
        const aNum = Number(a.match(/page-(\d+)\.png$/)?.[1] || 0);
        const bNum = Number(b.match(/page-(\d+)\.png$/)?.[1] || 0);
        return aNum - bNum;
      });

    const buffers: Buffer[] = [];
    for (const f of files) {
      buffers.push(await readFile(join(dir, f)));
    }

    // 处理图片（裁剪和拼接）
    if (enableProcessing) {
      return await processPdfImages(buffers, cropOptions, stitchOptions);
    }

    return buffers;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
