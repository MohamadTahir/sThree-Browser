import { NextRequest, NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getS3Client, handleS3Error } from "@/lib/s3Client";
import { buildDeleteObjectRequest, validateDeleteObjectRequest } from "@/models/dto/requests/DeleteObjectRequest";
import { DeleteObjectResponse } from "@/models/dto/responses/DeleteObjectResponse";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest) {
  try {
    const deleteObjectRequest = buildDeleteObjectRequest(request);

    const error = validateDeleteObjectRequest(deleteObjectRequest);
    if (error) {
      return NextResponse.json(error, { status: error.statusCode ?? 400 });
    }

    const client = await getS3Client(deleteObjectRequest);

    const command = new DeleteObjectCommand({
      Bucket: deleteObjectRequest.bucketName,
      Key: deleteObjectRequest.key,
    });

    await client.send(command);

    const response = { success: true } as DeleteObjectResponse;

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("Delete object error:", error);
    const { message, statusCode } = handleS3Error(error);
    return NextResponse.json(
      { success: false, error: message, statusCode } as DeleteObjectResponse,
      { status: statusCode },
    );
  }
}
