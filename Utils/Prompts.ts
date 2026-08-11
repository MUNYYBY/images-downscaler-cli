import fs from 'fs';
import inquirer from 'inquirer';
import { logger } from './Logging.js';
import { UserInput } from '../Types/index.js';

const isFilePath = (inputPath: string): boolean =>
  fs.existsSync(inputPath) && fs.statSync(inputPath).isFile();

export const promptUser = async (): Promise<UserInput> => {
  logger.info('Prompting user for input...');
  const answers = await inquirer.prompt<UserInput>([
    {
      type: 'input',
      name: 'inputPath',
      message: 'Enter the path to an image file or a folder containing images:',
      validate: (input: string) => {
        if (fs.existsSync(input)) {
          return true;
        } else {
          return 'Please enter a valid file or directory path.';
        }
      },
    },
    {
      type: 'input',
      name: 'outputPath',
      message: (currentAnswers: Partial<UserInput>) =>
        isFilePath(currentAnswers.inputPath as string)
          ? 'Enter the output file path (or an output folder) for the downscaled image:'
          : 'Enter the path to the output folder where processed images will be saved:',
      validate: (input: string) => {
        if (input) {
          return true;
        } else {
          return 'Please enter a valid output path.';
        }
      },
    },
    {
      type: 'list',
      name: 'downscaleOption',
      message: 'How would you like to downscale the images?',
      choices: ['By Size', 'By Resolution'],
    },
    {
      type: 'input',
      name: 'maxSize',
      message: 'Enter the maximum file size in MB (e.g., 1.5 for 1.5 MB):',
      when: (currentAnswers: Partial<UserInput>) =>
        currentAnswers.downscaleOption === 'By Size',
      validate: (input: string) => {
        const size = parseFloat(input);
        if (size > 0) {
          return true;
        } else {
          return 'Please enter a valid size greater than 0.';
        }
      },
    },
    {
      type: 'input',
      name: 'resolution',
      message: 'Enter the maximum resolution as width,height (e.g., 800,600):',
      when: (currentAnswers: Partial<UserInput>) =>
        currentAnswers.downscaleOption === 'By Resolution',
      validate: (input: string) => {
        const parts = input.split(',');
        if (
          parts.length === 2 &&
          !isNaN(Number(parts[0])) &&
          !isNaN(Number(parts[1]))
        ) {
          return true;
        } else {
          return 'Please enter a valid resolution in the format width,height.';
        }
      },
    },
    {
      type: 'list',
      name: 'outputFormat',
      message: 'Output format:',
      choices: [
        { name: 'Keep original format', value: 'original' },
        { name: 'JPEG', value: 'jpeg' },
        { name: 'PNG', value: 'png' },
        { name: 'WebP', value: 'webp' },
        { name: 'AVIF', value: 'avif' },
      ],
      default: 'original',
    },
    {
      type: 'confirm',
      name: 'proceed',
      message: (currentAnswers: Partial<UserInput>) =>
        [
          '',
          'Ready to run with:',
          `  Input:  ${currentAnswers.inputPath}`,
          `  Output: ${currentAnswers.outputPath}`,
          `  Mode:   ${currentAnswers.downscaleOption}` +
            (currentAnswers.downscaleOption === 'By Size'
              ? ` (max ${currentAnswers.maxSize} MB)`
              : ` (max ${currentAnswers.resolution})`),
          `  Format: ${
            currentAnswers.outputFormat === 'original'
              ? 'keep original'
              : currentAnswers.outputFormat
          }`,
          '',
          'Proceed?',
        ].join('\n'),
      default: true,
    },
  ]);

  logger.info('User input received.');
  return answers;
};
