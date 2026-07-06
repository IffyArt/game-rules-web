import path from 'path';

export function getPublicFilePath(filename: string): string {
  return path.join(process.cwd(), 'public', filename);
}
