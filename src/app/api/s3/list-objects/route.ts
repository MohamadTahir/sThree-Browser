import { NextRequest, NextResponse } from 'next/server';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getS3Client, handleS3Error } from '@/lib/s3Client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config, bucketName, prefix, maxKeys, continuationToken } = body;

    if (!config) {
      return NextResponse.json(
        { error: 'Missing config in request body' },
        { status: 400 }
      );
    }

    if (!bucketName) {
      return NextResponse.json(
        { error: 'Missing bucketName in request body' },
        { status: 400 }
      );
    }

    const client = getS3Client(config);

    const command = new ListObjectsV2Command({
      Bucket: bucketName,
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

    return NextResponse.json({
      objects,
      commonPrefixes,
      nextContinuationToken: response.NextContinuationToken || null,
      isTruncated: response.IsTruncated || false,
    });
  } catch (error: any) {
    console.error('List objects error:', error);
    const { message, statusCode } = handleS3Error(error);
    return NextResponse.json(
      { error: message, name: error.name },
      { status: statusCode }
    );
  }
}
