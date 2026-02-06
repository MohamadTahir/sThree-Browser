import { NextRequest, NextResponse } from 'next/server';
import { ListBucketsCommand } from '@aws-sdk/client-s3';
import { getS3Client, handleS3Error } from '@/lib/s3Client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const config = body.config;

    if (!config) {
      return NextResponse.json(
        { error: 'Missing config in request body' },
        { status: 400 }
      );
    }

    const client = getS3Client(config);
    const command = new ListBucketsCommand({});
    const response = await client.send(command);

    const buckets = (response.Buckets || [])
      .map(bucket => bucket.Name || '')
      .filter(Boolean);

    return NextResponse.json({ buckets });
  } catch (error: any) {
    console.error('List buckets error:', error);
    const { message, statusCode } = handleS3Error(error);
    return NextResponse.json(
      { error: message, name: error.name },
      { status: statusCode }
    );
  }
}
