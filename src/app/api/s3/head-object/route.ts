import { NextRequest, NextResponse } from "next/server";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { getS3Client, handleS3Error } from "@/lib/s3Client";
import { GetHeadObjectResponse } from "@/models/dto/responses/GetHeadObjectResponse";
import { buildHeadObjectRequest, validateHeadObjectRequest } from "@/models/dto/requests/GetHeadObjectRequest";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const headObjectRequest = buildHeadObjectRequest(request);
    const error = validateHeadObjectRequest(headObjectRequest);
    if (error) {
      return NextResponse.json(error, { status: error.statusCode ?? 400 });
    }

    const client = await getS3Client(headObjectRequest);

    const command = new HeadObjectCommand({
      Bucket: headObjectRequest.bucketName,
      Key: headObjectRequest.key,
    });

    const response = await client.send(command);

    const headObjectResponse = {
      MimeType: response.ContentType,
      ContentLength: response.ContentLength,
    } as GetHeadObjectResponse;

    return NextResponse.json(headObjectResponse);
  } catch (error: unknown) {
    console.error("Head object error:", error);
    const { message, statusCode } = handleS3Error(error);
    const headObjectResponse = { error: message, statusCode } as GetHeadObjectResponse;
    return NextResponse.json(headObjectResponse, { status: statusCode });
  }
}
