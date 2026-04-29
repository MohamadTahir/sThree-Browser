import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import { S3Request } from '@/models/S3';


export async function getS3Client(s3Request: S3Request): Promise<S3Client> {
  const clientConfig: S3ClientConfig = {
    region: s3Request.region,
    endpoint: s3Request.endpoint,
    forcePathStyle: s3Request.forcePathStyle,
    credentials: {
      accessKeyId: s3Request.accessKey,
      secretAccessKey: s3Request.secretKey,
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
