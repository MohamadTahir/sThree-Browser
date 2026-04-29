import { NextRequest, NextResponse } from 'next/server';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getS3Client, handleS3Error } from '@/lib/s3Client';
import { S3Object } from '@/models/types';
import { ListObjectsRequest, validateListObjectsRequest } from '@/models/dto/requests/ListObjectsRequest';
import { ListObjectsResponse } from '@/models/dto/responses/ListObjectResponse';

export const dynamic = 'force-static';

export async function POST(request: NextRequest) {
  try {
    const listObjectsRequest = await request.json() as ListObjectsRequest;

    const error = validateListObjectsRequest(listObjectsRequest);
    if (error) {
      return NextResponse.json(error, { status: error.statusCode });
    }

    const client = await getS3Client(listObjectsRequest);

    const command = new ListObjectsV2Command({
      Bucket: listObjectsRequest.bucketName,
      Prefix: listObjectsRequest.prefix || undefined,
      Delimiter: '/',
      MaxKeys: listObjectsRequest.maxKeys || 100,
      ContinuationToken: listObjectsRequest.continuationToken || undefined,
    });

    const response = await client.send(command);

    const objects: Array<S3Object> = [];

    // Process common prefixes (folders)
    if (response.CommonPrefixes) {
      for (const prefixObj of response.CommonPrefixes) {
        if (prefixObj.Prefix) {
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

    let listObjectsResponse: ListObjectsResponse = {
      objects,
      nextContinuationToken: response.NextContinuationToken || null,
      isTruncated: response.IsTruncated || false,
      error: undefined,
      statusCode: undefined
    }

    return NextResponse.json(listObjectsResponse);

  } catch (error: any) {
    console.error('List objects error:', error);
    const { message, statusCode } = handleS3Error(error);
    const listObjectsResponse = {error: message, statusCode: statusCode} as ListObjectsResponse;
    return NextResponse.json(listObjectsResponse, { status: statusCode });
  }
}
