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

export function handleS3Error(error: unknown): { message: string; statusCode: number } {
  const err = error as {
    name?: string;
    message?: string;
    bucketName?: string;
    config?: { endpoint?: string };
  };

  let errorMessage = err?.message || "Internal server error";
  let statusCode = 500;

  if (err?.name === "InvalidAccessKeyId" || err?.message?.includes("InvalidAccessKeyId")) {
    errorMessage = "Invalid access key. Please check your credentials.";
    statusCode = 401;
  } else if (err?.name === "SignatureDoesNotMatch" || err?.message?.includes("SignatureDoesNotMatch")) {
    errorMessage = "Invalid secret key. Please check your credentials.";
    statusCode = 401;
  } else if (err?.name === "UnknownEndpoint" || err?.message?.includes("UnknownEndpoint")) {
    errorMessage = `Invalid endpoint: ${err.config?.endpoint || "unknown"}. Please check your endpoint URL.`;
    statusCode = 400;
  } else if (err?.name === "NoSuchBucket" || err?.message?.includes("NoSuchBucket")) {
    errorMessage = `Bucket not found: ${err.bucketName || "unknown"}`;
    statusCode = 404;
  }

  return { message: errorMessage, statusCode };
}
