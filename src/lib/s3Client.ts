import { S3Client, ListBucketsCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand, ListObjectVersionsCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

interface BucketConfig {
  nickname: string;
  bucket_name: string;
  access_key: string;
  secret_key: string;
  region: string;
  endpoint?: string;
}

// Cache S3 clients by bucket nickname
const clientCache = new Map<string, S3Client>();

function createS3Client(config: BucketConfig): S3Client {
  const credentials = async () => ({
    accessKeyId: config.access_key,
    secretAccessKey: config.secret_key,
  });

  const clientConfig: any = {
    region: config.region,
    credentials,
  };

  // Handle custom endpoint (for S3-compatible storage)
  if (config.endpoint && config.endpoint.trim()) {
    let endpoint = config.endpoint.trim();

    // Add protocol if not present
    if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
      endpoint = `https://${endpoint}`;
    }

    // Remove trailing slash
    endpoint = endpoint.replace(/\/$/, '');

    clientConfig.endpoint = endpoint;
    clientConfig.forcePathStyle = true; // Required for S3-compatible storage
  }

  return new S3Client(clientConfig);
}

export function getS3Client(config: BucketConfig): S3Client {
  const cacheKey = config.nickname;

  if (!clientCache.has(cacheKey)) {
    clientCache.set(cacheKey, createS3Client(config));
  }

  return clientCache.get(cacheKey)!;
}

export function handleS3Error(error: any): { message: string; statusCode: number } {
  let errorMessage = error.message || 'Internal server error';
  let statusCode = 500;

  if (error.name === 'InvalidAccessKeyId' || error.message?.includes('InvalidAccessKeyId')) {
    errorMessage = 'Invalid access key. Please check your credentials.';
    statusCode = 401;
  } else if (error.name === 'SignatureDoesNotMatch' || error.message?.includes('SignatureDoesNotMatch')) {
    errorMessage = 'Invalid secret key. Please check your credentials.';
    statusCode = 401;
  } else if (error.name === 'UnknownEndpoint' || error.message?.includes('UnknownEndpoint')) {
    errorMessage = `Invalid endpoint: ${error.config?.endpoint || 'unknown'}. Please check your endpoint URL.`;
    statusCode = 400;
  } else if (error.name === 'NoSuchBucket' || error.message?.includes('NoSuchBucket')) {
    errorMessage = `Bucket not found: ${error.bucketName || 'unknown'}`;
    statusCode = 404;
  }

  return { message: errorMessage, statusCode };
}
