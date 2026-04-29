import { NextRequest, NextResponse } from 'next/server';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client, handleS3Error } from '@/lib/s3Client';
import { DeleteObjectRequest, validateDeleteObjectRequest } from '@/models/dto/requests/DeleteObjectRequest';
import { DeleteObjectResponse } from '@/models/dto/responses/DeleteObjectResponse';

export const dynamic = 'force-static';

export async function POST(request: NextRequest) {
  try {
    const body: DeleteObjectRequest = await request.json();
    const error = validateDeleteObjectRequest(body);
    if (error) {
      return NextResponse.json(error, { status: error.statusCode });
    }

    const client = await getS3Client(body);

    const command = new DeleteObjectCommand({
      Bucket: body.bucketName,
      Key: body.key,
    });

    await client.send(command);

    const response = {success: true} as DeleteObjectResponse;

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Delete object error:', error);
    const { message, statusCode } = handleS3Error(error);
    return NextResponse.json(
      { success: false, error: message, statusCode: statusCode } as DeleteObjectResponse,
      { status: statusCode }
    );
  }
}
