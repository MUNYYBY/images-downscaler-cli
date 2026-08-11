import fs from 'fs/promises';
import sharp from 'sharp';
import { logger } from './Logging.js';
import {
  QUALITY_CAPABLE_FORMATS,
  SharpFormat,
  formatFromExtension,
} from './Formats.js';
import { EncodeResult } from '../Types/index.js';

const MIN_QUALITY = 10;
const QUALITY_STEP = 10;
const SCALE_STEP = 0.9;
const MIN_DIMENSION = 64;
const MAX_SCALE_ITERATIONS = 20;

const encodeAtQuality = (
  pipeline: sharp.Sharp,
  format: SharpFormat,
  quality: number,
): sharp.Sharp => {
  switch (format) {
    case 'jpeg':
      return pipeline.jpeg({ quality, mozjpeg: true });
    case 'webp':
      return pipeline.webp({ quality });
    case 'avif':
      return pipeline.avif({ quality });
    case 'tiff':
      return pipeline.tiff({ quality });
    case 'png':
      return pipeline.png({ quality, palette: true, compressionLevel: 9 });
    case 'gif':
      return pipeline.gif();
  }
};

/**
 * Downscales an image to fit under maxSizeInBytes, preserving its format
 * (or an explicitly requested one). Tries quality reduction first for
 * formats that support it, then falls back to shrinking dimensions -
 * the only lever available for formats like gif with no quality knob, and
 * a safety net if quality reduction alone can't hit the target.
 */
export const downscaleBySize = async (
  srcPath: string,
  destPath: string,
  maxSizeInBytes: number,
  forcedFormat?: SharpFormat,
): Promise<EncodeResult> => {
  const format = forcedFormat ?? formatFromExtension(destPath);
  if (!format) {
    throw new Error(`Unsupported output format for ${destPath}`);
  }

  const originalBytes = (await fs.stat(srcPath)).size;
  const metadata = await sharp(srcPath).metadata();
  let width = metadata.width;
  let height = metadata.height;

  let best: Buffer | undefined;

  if (QUALITY_CAPABLE_FORMATS.has(format)) {
    for (let quality = 80; quality >= MIN_QUALITY; quality -= QUALITY_STEP) {
      const data = await encodeAtQuality(
        sharp(srcPath),
        format,
        quality,
      ).toBuffer();
      best = data;
      if (data.length <= maxSizeInBytes) {
        await fs.writeFile(destPath, data);
        logSuccess(destPath, data.length);
        return { originalBytes, outputBytes: data.length };
      }
    }
    logger.warn(
      `${srcPath}: quality reduction alone could not reach ${formatBytes(
        maxSizeInBytes,
      )}, falling back to shrinking dimensions.`,
    );
  }

  for (let i = 0; i < MAX_SCALE_ITERATIONS; i += 1) {
    if (!width || !height) break;
    width = Math.max(MIN_DIMENSION, Math.round(width * SCALE_STEP));
    height = Math.max(MIN_DIMENSION, Math.round(height * SCALE_STEP));

    const pipeline = sharp(srcPath).resize(width, height, {
      fit: sharp.fit.inside,
      withoutEnlargement: true,
    });
    const data = await (
      QUALITY_CAPABLE_FORMATS.has(format)
        ? encodeAtQuality(pipeline, format, MIN_QUALITY)
        : pipeline.toFormat(format)
    ).toBuffer();
    best = data;

    if (
      data.length <= maxSizeInBytes ||
      width <= MIN_DIMENSION ||
      height <= MIN_DIMENSION
    ) {
      break;
    }
  }

  if (!best) {
    throw new Error(`Failed to encode ${srcPath}`);
  }
  if (best.length > maxSizeInBytes) {
    logger.warn(
      `${srcPath}: could not reach ${formatBytes(
        maxSizeInBytes,
      )} even at minimum dimensions; saving best effort (${formatBytes(
        best.length,
      )}).`,
    );
  }
  await fs.writeFile(destPath, best);
  logSuccess(destPath, best.length);
  return { originalBytes, outputBytes: best.length };
};

const formatBytes = (bytes: number): string =>
  `${(bytes / 1024 / 1024).toFixed(2)} MB`;

const logSuccess = (destPath: string, bytes: number): void => {
  logger.info(`Processed and saved: ${destPath} (Size: ${formatBytes(bytes)})`);
};
