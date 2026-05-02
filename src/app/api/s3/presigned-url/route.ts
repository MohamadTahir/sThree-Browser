import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3Client, handleS3Error } from "@/lib/s3Client";
import { buildPreSignUrlRequest, validatePreSignUrlRequest } from "@/models/dto/requests/PreSignUrl";
import { PreSignUrlResponse } from "@/models/dto/responses/PreSignUrl";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const preSignUrlRequest = buildPreSignUrlRequest(request);

    const error = validatePreSignUrlRequest(preSignUrlRequest);
    if (error) {
      return NextResponse.json(error, { status: error.statusCode ?? 400 });
    }

    const client = await getS3Client(preSignUrlRequest);

    const command = new GetObjectCommand({
      Bucket: preSignUrlRequest.bucketName,
      Key: preSignUrlRequest.key,
    });

    const url = await getSignedUrl(client, command, {
      expiresIn: preSignUrlRequest.expiresIn || 3600,
    });

    const preSignUrlResponse = { url } as PreSignUrlResponse;
    return NextResponse.json(preSignUrlResponse);
  } catch (error: unknown) {
    console.error("Presigned URL error:", error);
    const { message, statusCode } = handleS3Error(error);
    const preSignUrlResponse = { error: message, statusCode } as PreSignUrlResponse;
    return NextResponse.json(preSignUrlResponse, { status: statusCode });
  }
}
