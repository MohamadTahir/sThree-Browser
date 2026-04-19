import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client, handleS3Error } from '@/lib/s3Client';
import { APIPreSignUrlRequest } from '@/models/dto/requests/PreSignUrl';

export const dynamic = 'force-static';

export async function POST(request: NextRequest) {
  try {
    const body: APIPreSignUrlRequest = await request.json();

    if (!body.bucket || !body.key || !body.expiresIn) {
      return NextResponse.json(
        { error: 'Missing required fields: bucket, key, or expiresIn' },
        { status: 400 }
      );
    }

    const client = getS3Client(body.bucket);

    const command = new GetObjectCommand({
      Bucket: body.bucket.bucketName,
      Key: body.key,
    });

    const url = await getSignedUrl(client, command, {
      expiresIn: body.expiresIn || 3600,
    });

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('Presigned URL error:', error);
    const { message, statusCode } = handleS3Error(error);
    return NextResponse.json(
      { error: message, name: error.name },
      { status: statusCode }
    );
  }
}
