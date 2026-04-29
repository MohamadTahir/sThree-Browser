import { NextRequest, NextResponse } from 'next/server';
import { HeadObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client, handleS3Error } from '@/lib/s3Client';
import { GetMimeTypeResponse } from '@/models/dto/responses/GetMimeTypeResponse';
import { GetMimeTypeRequest, validateGetMimeTypeRequest } from '@/models/dto/requests/GetMimeTypeRequest';

export const dynamic = 'force-static';

export async function POST(request: NextRequest) {
  try {
    const body: GetMimeTypeRequest = await request.json();

    const error = validateGetMimeTypeRequest(body);
    if (error) {
      return NextResponse.json(error, { status: error.statusCode });
    }

    const client = await getS3Client(body);

    const command = new HeadObjectCommand({
      Bucket: body.bucketName,
      Key: body.key,
    });

    const response = await client.send(command);

    // const x  =  {} as HeadObjectCommandOutput;

    const getMimeTypeResponse = {
      mimeType: response.ContentType,
    } as GetMimeTypeResponse

    return NextResponse.json(getMimeTypeResponse);
  } catch (error: any) {
    console.error('Get object error:', error);
    const { message, statusCode } = handleS3Error(error);
    const getMimeTypeResponse = {error: message, statusCode: statusCode} as GetMimeTypeResponse;
    return NextResponse.json(getMimeTypeResponse, { status: statusCode });
  }
}
