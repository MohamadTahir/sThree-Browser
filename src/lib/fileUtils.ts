/**
 * Utility functions for file type detection and preview handling
 */
const canPreviewExtensions = [
  // Images
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico',
  // Text files (excluding txt and json)
  'md', 'xml', 'yaml', 'yml', 'csv', 'log',
  // Code files
  'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'scss', 'sass',
  'py', 'java', 'cpp', 'c', 'h', 'hpp', 'go', 'rs', 'rb',
  'php', 'sh', 'bash', 'zsh', 'fish', 'ps1',
  // Other
  'pdf'
];
const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];

const textExtensions = [
  // Excluding txt and json from preview
  'md', 'xml', 'yaml', 'yml', 'csv', 'log',
  'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'scss', 'sass',
  'py', 'java', 'cpp', 'c', 'h', 'hpp', 'go', 'rs', 'rb',
  'php', 'sh', 'bash', 'zsh', 'fish', 'ps1'
];


export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

export function canPreviewFile(filename: string): boolean {
  const extension = getFileExtension(filename);
  return canPreviewExtensions.includes(extension);
}

export function getFileType(filename: string): 'image' | 'text' | 'pdf' | 'unknown' {
  const extension = getFileExtension(filename);
  if (imageExtensions.includes(extension)) return 'image';
  if (textExtensions.includes(extension)) return 'text';
  if (extension === 'pdf') return 'pdf';
  return 'unknown';
}

export function getMimeType(filename: string): string {
  const extension = getFileExtension(filename);
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'bmp': 'image/bmp',
    'ico': 'image/x-icon',
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'json': 'application/json',
    'xml': 'application/xml',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'text/javascript',
    'ts': 'text/typescript',
  };
  return mimeTypes[extension] || 'application/octet-stream';
}
