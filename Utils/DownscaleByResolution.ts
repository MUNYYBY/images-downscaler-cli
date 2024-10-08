import sharp from 'sharp';
import { logger } from './Logging.js';

export const downscaleByResolution = async (
  srcPath: string,
  destPath: string,
  maxWidth: number,
  maxHeight: number,
): Promise<void> => {
  try {
    logger.info(`Downscaling by resolution: ${srcPath}`);
    await sharp(srcPath)
      .resize(maxWidth, maxHeight, {
        fit: sharp.fit.inside,
        withoutEnlargement: true,
      })
      .toFile(destPath);
    logger.info(`Processed and saved: ${destPath}`);
  } catch (err) {
    logger.error(`Error processing file ${srcPath}: ${(err as Error).message}`);
  }
};
