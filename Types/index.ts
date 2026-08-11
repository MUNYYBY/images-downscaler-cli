export type DownscaleOption = 'By Size' | 'By Resolution';

export type OutputFormat = 'original' | 'jpeg' | 'png' | 'webp' | 'avif';

export interface UserInput {
  inputPath: string;
  outputPath: string;
  downscaleOption: DownscaleOption;
  maxSize?: number;
  resolution?: string;
  outputFormat?: OutputFormat;
  proceed?: boolean;
}

export interface ProcessStats {
  processed: number;
  skipped: number;
  failed: number;
  originalBytes: number;
  outputBytes: number;
}

export interface EncodeResult {
  originalBytes: number;
  outputBytes: number;
}
