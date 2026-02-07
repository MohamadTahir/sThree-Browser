/**
 * Stub for @aws-sdk/client-s3 when building for Tauri.
 * The desktop app uses the Rust backend for S3; this avoids bundling the Node AWS SDK.
 */

export class S3Client {
  constructor(_config?: unknown) {}
}

export class ListBucketsCommand {
  constructor(_input?: unknown) {}
}

export class ListObjectsV2Command {
  constructor(_input?: unknown) {}
}

export class GetObjectCommand {
  constructor(_input?: unknown) {}
}

export class DeleteObjectCommand {
  constructor(_input?: unknown) {}
}

export class ListObjectVersionsCommand {
  constructor(_input?: unknown) {}
}

export class DeleteObjectsCommand {
  constructor(_input?: unknown) {}
}
