/**
 * Stub for @aws-sdk/s3-request-presigner when building for Tauri.
 * The desktop app uses the Rust backend for S3; this avoids bundling the Node AWS SDK.
 */

export function getSignedUrl(
  _client: unknown,
  _command: unknown,
  _options?: { expiresIn?: number }
): Promise<string> {
  return Promise.resolve('');
}
