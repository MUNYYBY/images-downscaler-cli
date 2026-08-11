import fs from 'fs/promises';
import fssync from 'fs';
import path from 'path';
import os from 'os';
import pLimit from 'p-limit';
import cliProgress from 'cli-progress';
import { UserInput, ProcessStats } from '../Types/index.js';
import { logger } from './Logging.js';
import { downscaleBySize } from './DownscaleBySize.js';
import { downscaleByResolution } from './DownscaleByResolution.js';
import {
  isSupportedImage,
  extensionForFormat,
  SharpFormat,
} from './Formats.js';

interface FileTask {
  srcPath: string;
  destPath: string;
}

interface CollectResult {
  files: string[];
  skipped: number;
}

const looksLikeDirectory = (targetPath: string): boolean => {
  if (fssync.existsSync(targetPath)) {
    return fssync.statSync(targetPath).isDirectory();
  }
  return path.extname(targetPath) === '' || targetPath.endsWith(path.sep);
};

const collectSourceFiles = async (srcPath: string): Promise<CollectResult> => {
  const stats = await fs.stat(srcPath);
  if (stats.isFile()) {
    return isSupportedImage(srcPath)
      ? { files: [srcPath], skipped: 0 }
      : { files: [], skipped: 1 };
  }

  const entries = await fs.readdir(srcPath, { withFileTypes: true });
  const files: string[] = [];
  let skipped = 0;
  for (const entry of entries) {
    const entryPath = path.join(srcPath, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectSourceFiles(entryPath);
      files.push(...nested.files);
      skipped += nested.skipped;
    } else if (entry.isFile()) {
      if (isSupportedImage(entryPath)) {
        files.push(entryPath);
      } else {
        skipped += 1;
      }
    }
  }
  return { files, skipped };
};

const withExtension = (filePath: string, extension: string): string =>
  path.join(
    path.dirname(filePath),
    `${path.basename(filePath, path.extname(filePath))}${extension}`,
  );

const resolveDestPath = (
  srcRoot: string,
  srcFile: string,
  outputPath: string,
  isSingleFile: boolean,
  outputExtension?: string,
): string => {
  const destPath = isSingleFile
    ? looksLikeDirectory(outputPath)
      ? path.join(outputPath, path.basename(srcFile))
      : outputPath
    : path.join(outputPath, path.relative(srcRoot, srcFile));

  return outputExtension ? withExtension(destPath, outputExtension) : destPath;
};

export const processImages = async (
  srcRoot: string,
  outputPath: string,
  options: UserInput,
): Promise<ProcessStats> => {
  const stats: ProcessStats = {
    processed: 0,
    skipped: 0,
    failed: 0,
    originalBytes: 0,
    outputBytes: 0,
  };

  const rootStat = await fs.stat(srcRoot).catch(() => undefined);
  if (!rootStat) {
    throw new Error(`Input path does not exist: ${srcRoot}`);
  }
  const isSingleFile = rootStat.isFile();

  logger.info(`Scanning ${isSingleFile ? 'file' : 'directory'}: ${srcRoot}`);
  const { files: sourceFiles, skipped } = await collectSourceFiles(srcRoot);
  stats.skipped = skipped;

  if (sourceFiles.length === 0) {
    logger.warn('No supported image files found.');
    return stats;
  }

  const forcedFormat: SharpFormat | undefined =
    options.outputFormat && options.outputFormat !== 'original'
      ? (options.outputFormat as SharpFormat)
      : undefined;
  const outputExtension = forcedFormat
    ? extensionForFormat(forcedFormat)
    : undefined;

  const tasks: FileTask[] = sourceFiles.map((srcPath) => ({
    srcPath,
    destPath: resolveDestPath(
      srcRoot,
      srcPath,
      outputPath,
      isSingleFile,
      outputExtension,
    ),
  }));

  const maxSizeInBytes =
    options.downscaleOption === 'By Size'
      ? (options.maxSize as number) * 1024 * 1024
      : 0;
  const [maxWidth, maxHeight] =
    options.downscaleOption === 'By Resolution'
      ? (options.resolution as string).split(',').map(Number)
      : [0, 0];

  const progress = new cliProgress.SingleBar(
    {
      format: 'Downscaling |{bar}| {percentage}% | {value}/{total} files',
      clearOnComplete: false,
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic,
  );
  progress.start(tasks.length, 0);

  const limit = pLimit(Math.max(1, os.cpus().length));
  const createdDirs = new Set<string>();
  const ensureDir = async (dir: string): Promise<void> => {
    if (createdDirs.has(dir)) return;
    await fs.mkdir(dir, { recursive: true });
    createdDirs.add(dir);
  };

  await Promise.all(
    tasks.map((task) =>
      limit(async () => {
        try {
          await ensureDir(path.dirname(task.destPath));

          const result =
            options.downscaleOption === 'By Size'
              ? await downscaleBySize(
                  task.srcPath,
                  task.destPath,
                  maxSizeInBytes,
                  forcedFormat,
                )
              : await downscaleByResolution(
                  task.srcPath,
                  task.destPath,
                  maxWidth,
                  maxHeight,
                  forcedFormat,
                );

          stats.processed += 1;
          stats.originalBytes += result.originalBytes;
          stats.outputBytes += result.outputBytes;
        } catch (err) {
          stats.failed += 1;
          logger.error(
            `Error processing ${task.srcPath}: ${(err as Error).message}`,
          );
        } finally {
          progress.increment();
        }
      }),
    ),
  );

  progress.stop();
  return stats;
};
