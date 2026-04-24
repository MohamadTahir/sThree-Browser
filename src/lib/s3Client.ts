import { BucketWithCredentials } from '@/types';
import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';

// Cache S3 clients by bucket nickname
const clientCache = new Map<string, S3Client>();


export function getS3Client(config: BucketWithCredentials): S3Client {
  const cacheKey = config.nickname;

  if (!clientCache.has(cacheKey)) {
    clientCache.set(cacheKey, createS3Client(config));
  }

  return clientCache.get(cacheKey)!;
}

function createS3Client(config: BucketWithCredentials): S3Client {
  const clientConfig: S3ClientConfig = {
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
  };

  return new S3Client(clientConfig);
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
