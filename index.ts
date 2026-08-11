#!/usr/bin/env node
import { logger } from './Utils/Logging.js';
import { processImages } from './Utils/Process.js';
import { promptUser } from './Utils/Prompts.js';
import { printSummary } from './Utils/Summary.js';

const main = async (): Promise<void> => {
  logger.info('Starting the image downscaling process...');
  const options = await promptUser();

  if (options.proceed === false) {
    logger.info('Cancelled.');
    return;
  }

  const startedAt = Date.now();
  const stats = await processImages(
    options.inputPath,
    options.outputPath,
    options,
  );
  printSummary(stats, Date.now() - startedAt);

  if (stats.failed > 0) {
    process.exitCode = 1;
  }
};

main().catch((err) => {
  logger.error(`Fatal error: ${(err as Error).message}`);
  process.exitCode = 1;
});
