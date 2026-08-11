import fs from 'fs/promises';
import sharp from 'sharp';
import { logger } from './Logging.js';
import { SharpFormat } from './Formats.js';
import { EncodeResult } from '../Types/index.js';

export const downscaleByResolution = async (
  srcPath: string,
  destPath: string,
  maxWidth: number,
  maxHeight: number,
  forcedFormat?: SharpFormat,
): Promise<EncodeResult> => {
  const originalBytes = (await fs.stat(srcPath)).size;

  let pipeline = sharp(srcPath).resize(maxWidth, maxHeight, {
    fit: sharp.fit.inside,
    withoutEnlargement: true,
  });
  if (forcedFormat) {
    pipeline = pipeline.toFormat(forcedFormat);
  }

  const data = await pipeline.toBuffer();
  await fs.writeFile(destPath, data);
  logger.info(`Processed and saved: ${destPath}`);
  return { originalBytes, outputBytes: data.length };
};
