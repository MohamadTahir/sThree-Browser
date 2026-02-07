/**
 * Stub for @/lib/s3Client when building for Tauri.
 * The desktop app uses the Rust backend for S3; this avoids bundling the Node AWS SDK.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getS3Client(_config: any): { send: () => Promise<Record<string, unknown>> } {
  return {
    send: async () => ({}),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleS3Error(error: any): { message: string; statusCode: number } {
  return {
    message: error?.message ?? 'Internal server error',
    statusCode: 500,
  };
}
