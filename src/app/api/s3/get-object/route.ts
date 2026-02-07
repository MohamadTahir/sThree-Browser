import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client, handleS3Error } from '@/lib/s3Client';

export const dynamic = 'force-static';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config, bucketName, key } = body;

    if (!config || !bucketName || !key) {
      return NextResponse.json(
        { error: 'Missing required fields: config, bucketName, or key' },
        { status: 400 }
      );
    }

    const client = getS3Client(config);

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const response = await client.send(command);

    if (!response.Body) {
      return NextResponse.json(
        { error: 'Object not found' },
        { status: 404 }
      );
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

    return NextResponse.json({
      data: base64,
      size: result.length,
    });
  } catch (error: any) {
    console.error('Get object error:', error);
    const { message, statusCode } = handleS3Error(error);
    return NextResponse.json(
      { error: message, name: error.name },
      { status: statusCode }
    );
  }
}
