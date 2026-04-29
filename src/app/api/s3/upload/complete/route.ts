import { NextRequest, NextResponse } from 'next/server';
import { CompleteMultipartUploadCommand } from '@aws-sdk/client-s3';
import { getS3Client, handleS3Error } from '@/lib/s3Client';
import { CompleteUploadRequest, validateCompleteUploadRequest } from '@/models/dto/requests/CompleteUploadRequest';
import { CompleteUploadResponse } from '@/models/dto/responses/CompleteUplaodRequest';

export const dynamic = 'force-static';

export async function POST(req: NextRequest) {
  try {
  const body: CompleteUploadRequest = await req.json();

  const error = validateCompleteUploadRequest(body);
  if (error) {
    return NextResponse.json(error, { status: error.statusCode });
  }


  const client = await getS3Client(body);

    const command = new CompleteMultipartUploadCommand({
      Bucket: body.bucketName,
      Key: body.key,
      UploadId: body.uploadId,
      MultipartUpload: { Parts: body.parts },
    });

    await client.send(command);

    const completeUploadResponse = {
      success: true,
    } as CompleteUploadResponse;

    return NextResponse.json(completeUploadResponse);
  } catch (error: any) {
    console.error('Complete upload error:', error);
    const { message, statusCode } = handleS3Error(error);
    return NextResponse.json(
      { success: false, error: message, statusCode: statusCode } as CompleteUploadResponse,
      { status: statusCode }
    );
  }
}
