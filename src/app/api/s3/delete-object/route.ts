import { NextRequest, NextResponse } from 'next/server';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client, handleS3Error } from '@/lib/s3Client';
import { APIDeleteObjectRequest } from '@/models/dto/requests/DeleteObjectRequest';

export const dynamic = 'force-static';

export async function POST(request: NextRequest) {
  try {
    const body: APIDeleteObjectRequest = await request.json();

    if (!body.bucket || !body.key) {
      return NextResponse.json(
        { error: 'Missing required fields: bucket or key' },
        { status: 400 }
      );
    }

    const command = new DeleteObjectCommand({
      Bucket: body.bucket.bucketName,
      Key: body.key,
    });

    await getS3Client(body.bucket).send(command);
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
