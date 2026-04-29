import { NextRequest, NextResponse } from 'next/server';
import { CreateMultipartUploadCommand, UploadPartCommand } from '@aws-sdk/client-s3';
import { InitUploadRequest, validateInitUploadRequest } from '@/models/dto/requests/InitUploadRequest';
import { getS3Client, handleS3Error } from '@/lib/s3Client';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { InitUploadResponse } from '@/models/dto/responses/initUploadResponse';

export const dynamic = 'force-static';

export async function POST(req: NextRequest) {
  try {
  const body: InitUploadRequest = await req.json();

  const error = validateInitUploadRequest(body);
  if (error) {
    return NextResponse.json(error, { status: error.statusCode });
  }


  const client = await getS3Client(body);

    const command = new CreateMultipartUploadCommand({
      Bucket: body.bucketName,
      Key: body.key,
      ContentType: body.contentType,
    });

    const res = await client.send(command);

    const urlPromises = [];
    for (let i = 1; i <= body.parts; i++) {
      const command = new UploadPartCommand({
        Bucket: body.bucketName,
        Key: body.key,
        UploadId: res.UploadId,
        PartNumber: i,
      });
      urlPromises.push(getSignedUrl(client, command, { expiresIn: 3600 }));
    }
    const urls = await Promise.all(urlPromises);

    const initUploadResponse = {
      uploadId: res.UploadId,
      parts: urls,
    } as InitUploadResponse;

    return NextResponse.json(initUploadResponse);

  } catch (error: any) {
    console.error('Init upload error:', error);
    const { message, statusCode } = handleS3Error(error);
    return NextResponse.json(
      { error: message, statusCode: statusCode } as InitUploadResponse,
      { status: statusCode }
    );
  }
}
