import path from 'path';

// Limited to formats this build of sharp/libvips can both decode and encode
// (notably excludes .bmp: libvips has no bmp encoder/decoder here).
export const SUPPORTED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.avif',
  '.tiff',
  '.tif',
  '.gif',
];

export type SharpFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'tiff' | 'gif';

// Formats where a numeric 0-100 "quality" knob meaningfully trades size for
// fidelity. gif has no such knob (only palette size), so it skips straight
// to the dimension-scaling fallback in downscaleBySize.
export const QUALITY_CAPABLE_FORMATS: ReadonlySet<SharpFormat> = new Set([
  'jpeg',
  'png',
  'webp',
  'avif',
  'tiff',
]);

const EXTENSION_TO_FORMAT: Record<string, SharpFormat | undefined> = {
  '.jpg': 'jpeg',
  '.jpeg': 'jpeg',
  '.png': 'png',
  '.webp': 'webp',
  '.avif': 'avif',
  '.tiff': 'tiff',
  '.tif': 'tiff',
  '.gif': 'gif',
};

export const isSupportedImage = (filename: string): boolean =>
  SUPPORTED_EXTENSIONS.includes(path.extname(filename).toLowerCase());

export const formatFromExtension = (
  filename: string,
): SharpFormat | undefined =>
  EXTENSION_TO_FORMAT[path.extname(filename).toLowerCase()];

export const extensionForFormat = (format: SharpFormat): string =>
  format === 'jpeg' ? '.jpg' : `.${format}`;
