import chalk from 'chalk';
import { ProcessStats } from '../Types/index.js';

const formatMB = (bytes: number): string =>
  `${(bytes / 1024 / 1024).toFixed(2)} MB`;

const formatDuration = (ms: number): string => {
  const seconds = ms / 1000;
  return seconds < 60
    ? `${seconds.toFixed(1)}s`
    : `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
};

export const printSummary = (stats: ProcessStats, elapsedMs: number): void => {
  const saved = stats.originalBytes - stats.outputBytes;
  const savedPct =
    stats.originalBytes > 0 ? (saved / stats.originalBytes) * 100 : 0;

  console.log('');
  console.log(chalk.bold.underline('Downscale summary'));
  console.log(`  ${chalk.green('Processed')}: ${stats.processed}`);
  console.log(`  ${chalk.yellow('Skipped')}:   ${stats.skipped}`);
  console.log(`  ${chalk.red('Failed')}:    ${stats.failed}`);
  if (stats.processed > 0) {
    console.log(
      `  Size: ${formatMB(stats.originalBytes)} -> ${formatMB(
        stats.outputBytes,
      )} (${chalk.cyan(`${savedPct.toFixed(1)}% saved`)})`,
    );
  }
  console.log(`  Time: ${formatDuration(elapsedMs)}`);
  console.log('');
};
