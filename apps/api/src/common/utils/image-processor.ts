import sharp from 'sharp';

export interface CropOptions {
  topPercent?: number; // 顶部裁剪百分比 (0-100)
  bottomPercent?: number; // 底部裁剪百分比 (0-100)
}

export interface StitchOptions {
  spacing?: number; // 图片间距，默认0
}

/**
 * 裁剪图片的页眉页脚
 */
export async function cropHeaderFooter(
  imageBuffer: Buffer,
  options: CropOptions = {}
): Promise<Buffer> {
  const { topPercent = 0, bottomPercent = 0 } = options;

  const image = sharp(imageBuffer);
  const { width, height } = await image.metadata();

  if (!width || !height) {
    throw new Error('Unable to get image dimensions');
  }

  const topCrop = Math.floor((height * topPercent) / 100);
  const bottomCrop = Math.floor((height * bottomPercent) / 100);
  const newHeight = height - topCrop - bottomCrop;

  if (newHeight <= 0) {
    throw new Error('Crop parameters would result in zero or negative height');
  }

  return image
    .extract({
      left: 0,
      top: topCrop,
      width,
      height: newHeight,
    })
    .png()
    .toBuffer();
}

/**
 * 垂直拼接多张图片
 */
export async function stitchImagesVertically(
  imageBuffers: Buffer[],
  options: StitchOptions = {}
): Promise<Buffer> {
  if (imageBuffers.length === 0) {
    throw new Error('No images to stitch');
  }

  if (imageBuffers.length === 1) {
    return imageBuffers[0];
  }

  const { spacing = 0 } = options;

  // 获取所有图片的尺寸
  const images = await Promise.all(
    imageBuffers.map(async (buffer) => {
      const image = sharp(buffer);
      const metadata = await image.metadata();
      return { image, width: metadata.width!, height: metadata.height! };
    })
  );

  // 计算最大宽度和总高度
  const maxWidth = Math.max(...images.map((img) => img.width));
  const totalHeight =
    images.reduce((sum, img) => sum + img.height, 0) + spacing * (images.length - 1);

  // 创建空白画布
  const canvas = sharp({
    create: {
      width: maxWidth,
      height: totalHeight,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  });

  // 准备合成操作
  const composite: any[] = [];
  let currentTop = 0;

  for (const { image, width, height } of images) {
    // 居中对齐
    const left = Math.floor((maxWidth - width) / 2);

    composite.push({
      input: await image.png().toBuffer(),
      top: currentTop,
      left: left,
    });

    currentTop += height + spacing;
  }

  return canvas.composite(composite).png().toBuffer();
}

/**
 * 处理PDF转换的图片：裁剪页眉页脚并拼接
 */
export async function processPdfImages(
  imageBuffers: Buffer[],
  cropOptions: CropOptions = {},
  stitchOptions: StitchOptions = {}
): Promise<Buffer[]> {
  // 如果没有启用裁剪和拼接，直接返回原图
  const shouldCrop = cropOptions.topPercent || cropOptions.bottomPercent;
  const shouldStitch = imageBuffers.length > 1;

  if (!shouldCrop && !shouldStitch) {
    return imageBuffers;
  }

  // 裁剪图片
  let processedImages = imageBuffers;
  if (shouldCrop) {
    processedImages = await Promise.all(
      imageBuffers.map((buffer) => cropHeaderFooter(buffer, cropOptions))
    );
  }

  // 拼接图片
  if (shouldStitch) {
    const stitchedImage = await stitchImagesVertically(processedImages, stitchOptions);
    return [stitchedImage];
  }

  return processedImages;
}
