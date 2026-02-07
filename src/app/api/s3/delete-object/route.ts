import { NextRequest, NextResponse } from 'next/server';
import { DeleteObjectCommand, ListObjectVersionsCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { getS3Client, handleS3Error } from '@/lib/s3Client';

export const dynamic = 'force-static';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config, bucketName, key, deleteAllVersions } = body;

    if (!config || !bucketName || !key) {
      return NextResponse.json(
        { error: 'Missing required fields: config, bucketName, or key' },
        { status: 400 }
      );
    }

    const client = getS3Client(config);

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
              Key: key,
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
              Key: key,
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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete object error:', error);
    const { message, statusCode } = handleS3Error(error);
    return NextResponse.json(
      { error: message, name: error.name },
      { status: statusCode }
    );
  }
}
