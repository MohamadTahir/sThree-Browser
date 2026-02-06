import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { S3Client, ListBucketsCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand, ListObjectVersionsCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const app = express();
const PORT = process.env.PROXY_PORT ? parseInt(process.env.PROXY_PORT) : 3001;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:1420',
  credentials: true,
}));
app.use(express.json({ limit: '100mb' })); // Support large file uploads/downloads

// Cache S3 clients by bucket nickname
const clientCache = new Map<string, S3Client>();

interface BucketConfig {
  nickname: string;
  bucket_name: string;
  access_key: string;
  secret_key: string;
  region: string;
  endpoint?: string;
}

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

function getS3Client(config: BucketConfig): S3Client {
  const cacheKey = config.nickname;

  if (!clientCache.has(cacheKey)) {
    clientCache.set(cacheKey, createS3Client(config));
  }

  return clientCache.get(cacheKey)!;
}

// Error handling middleware (must be after routes)
const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Proxy server error:', err);

  // Provide helpful error messages for common S3 errors
  let errorMessage = err.message || 'Internal server error';
  let statusCode = 500;

  if (err.name === 'InvalidAccessKeyId' || err.message?.includes('InvalidAccessKeyId')) {
    errorMessage = 'Invalid access key. Please check your credentials.';
    statusCode = 401;
  } else if (err.name === 'SignatureDoesNotMatch' || err.message?.includes('SignatureDoesNotMatch')) {
    errorMessage = 'Invalid secret key. Please check your credentials.';
    statusCode = 401;
  } else if (err.name === 'UnknownEndpoint' || err.message?.includes('UnknownEndpoint')) {
    errorMessage = `Invalid endpoint: ${req.body?.config?.endpoint || 'unknown'}. Please check your endpoint URL.`;
    statusCode = 400;
  } else if (err.name === 'NoSuchBucket' || err.message?.includes('NoSuchBucket')) {
    errorMessage = `Bucket not found: ${req.body?.bucketName || 'unknown'}`;
    statusCode = 404;
  }

  res.status(statusCode).json({
    error: errorMessage,
    name: err.name,
  });
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// List buckets
app.post('/api/s3/list-buckets', async (req, res, next) => {
  try {
    const config: BucketConfig = req.body.config;

    if (!config) {
      return res.status(400).json({
        error: 'Missing config in request body',
      });
    }

    const client = getS3Client(config);
    const command = new ListBucketsCommand({});

    const response = await client.send(command);

    const buckets = (response.Buckets || [])
      .map(bucket => bucket.Name || '')
      .filter(Boolean);

    res.json({ buckets });
  } catch (error: any) {
    console.error('List buckets error:', error);
    next(error); // Pass to error handler
  }
});

// List objects
app.post('/api/s3/list-objects', async (req, res, next) => {
  try {
    const { config, bucketName, prefix, maxKeys, continuationToken } = req.body;

    // Log the request for debugging
    console.log('List objects request:', {
      nickname: config?.nickname,
      bucketName,
      prefix,
      configBucketName: config?.bucket_name,
    });

    if (!config) {
      return res.status(400).json({
        error: 'Missing config in request body',
      });
    }

    if (!bucketName) {
      return res.status(400).json({
        error: 'Missing bucketName in request body',
      });
    }

    const s3Config: BucketConfig = config;
    const client = getS3Client(s3Config);

    // Use the bucketName from the request, not from config
    const actualBucketName = bucketName;

    console.log(`Listing objects in bucket: ${actualBucketName} (config bucket: ${config.bucket_name})`);

    const command = new ListObjectsV2Command({
      Bucket: actualBucketName,
      Prefix: prefix || undefined,
      Delimiter: '/',
      MaxKeys: maxKeys || 100,
      ContinuationToken: continuationToken || undefined,
    });

    const response = await client.send(command);

    const objects: Array<{
      key: string;
      size: number;
      lastModified: string | null;
      isFolder: boolean;
    }> = [];
    const commonPrefixes: string[] = [];

    // Process common prefixes (folders)
    if (response.CommonPrefixes) {
      for (const prefixObj of response.CommonPrefixes) {
        if (prefixObj.Prefix) {
          commonPrefixes.push(prefixObj.Prefix);
          objects.push({
            key: prefixObj.Prefix,
            size: 0,
            lastModified: null,
            isFolder: true,
          });
        }
      }
    }

    // Process objects
    if (response.Contents) {
      for (const obj of response.Contents) {
        if (obj.Key && !obj.Key.endsWith('/')) {
          objects.push({
            key: obj.Key,
            size: obj.Size || 0,
            lastModified: obj.LastModified?.toISOString() || null,
            isFolder: false,
          });
        }
      }
    }

    res.json({
      objects,
      commonPrefixes,
      nextContinuationToken: response.NextContinuationToken || null,
      isTruncated: response.IsTruncated || false,
    });
  } catch (error: any) {
    console.error('List objects error:', error);
    next(error); // Pass to error handler
  }
});

// Get object content
app.post('/api/s3/get-object', async (req, res, next) => {
  try {
    const { config, bucketName, key } = req.body;

    if (!config || !bucketName || !key) {
      return res.status(400).json({
        error: 'Missing required fields: config, bucketName, or key',
      });
    }

    const s3Config: BucketConfig = config;
    const client = getS3Client(s3Config);

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const response = await client.send(command);

    if (!response.Body) {
      return res.status(404).json({ error: 'Object not found' });
    }

    // Collect the body stream
    const chunks: Uint8Array[] = [];
    const reader = response.Body.transformToWebStream().getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    // Combine chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    // Convert to base64 for transmission
    const base64 = Buffer.from(result).toString('base64');

    res.json({
      data: base64,
      size: result.length,
    });
  } catch (error: any) {
    console.error('Get object error:', error);
    next(error); // Pass to error handler
  }
});

// Get presigned URL
app.post('/api/s3/presigned-url', async (req, res, next) => {
  try {
    const { config, bucketName, key, expiresIn } = req.body;

    if (!config || !bucketName || !key) {
      return res.status(400).json({
        error: 'Missing required fields: config, bucketName, or key',
      });
    }

    const s3Config: BucketConfig = config;
    const client = getS3Client(s3Config);

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const url = await getSignedUrl(client, command, {
      expiresIn: expiresIn || 3600,
    });

    res.json({ url });
  } catch (error: any) {
    console.error('Presigned URL error:', error);
    next(error); // Pass to error handler
  }
});

// Delete object
app.post('/api/s3/delete-object', async (req, res, next) => {
  try {
    const { config, bucketName, key, deleteAllVersions } = req.body;

    if (!config || !bucketName || !key) {
      return res.status(400).json({
        error: 'Missing required fields: config, bucketName, or key',
      });
    }

    const s3Config: BucketConfig = config;
    const client = getS3Client(s3Config);

    if (deleteAllVersions) {
      // List all versions
      const listVersionsCommand = new ListObjectVersionsCommand({
        Bucket: bucketName,
        Prefix: key,
      });

      const versionsResponse = await client.send(listVersionsCommand);
      const versionsToDelete: Array<{ Key: string; VersionId?: string }> = [];

      // Add all versions
      if (versionsResponse.Versions) {
        for (const version of versionsResponse.Versions) {
          if (version.Key === key) {
            versionsToDelete.push({
              Key: version.Key,
              VersionId: version.VersionId,
            });
          }
        }
      }

      // Add delete markers
      if (versionsResponse.DeleteMarkers) {
        for (const marker of versionsResponse.DeleteMarkers) {
          if (marker.Key === key) {
            versionsToDelete.push({
              Key: marker.Key,
              VersionId: marker.VersionId,
            });
          }
        }
      }

      // Delete in batches (S3 allows up to 1000 objects per request)
      if (versionsToDelete.length > 0) {
        const batchSize = 1000;
        for (let i = 0; i < versionsToDelete.length; i += batchSize) {
          const batch = versionsToDelete.slice(i, i + batchSize);
          const deleteCommand = new DeleteObjectsCommand({
            Bucket: bucketName,
            Delete: {
              Objects: batch,
              Quiet: false,
            },
          });
          await client.send(deleteCommand);
        }
      }
    } else {
      // Delete only current version
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      await client.send(command);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete object error:', error);
    next(error); // Pass to error handler
  }
});

// 404 handler for API routes (must be after all routes)
app.use('/api', (req, res) => {
  res.status(404).json({
    error: `API endpoint not found: ${req.method} ${req.path}`,
  });
});

// Apply error handler after all routes
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`S3 Proxy Server running on http://localhost:${PORT}`);
  console.log(`Allowed origin: ${process.env.ALLOWED_ORIGIN || 'http://localhost:1420'}`);
});
