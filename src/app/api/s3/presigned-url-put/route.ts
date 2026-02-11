
import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client, handleS3Error } from '@/lib/s3Client';

export const dynamic = 'force-static';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { config, bucketName, key, expiresIn, contentType } = body;

        if (!config || !bucketName || !key) {
            return NextResponse.json(
                { error: 'Missing required fields: config, bucketName, or key' },
                { status: 400 }
            );
        }

        const client = getS3Client(config);

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            ContentType: contentType || 'application/octet-stream',
        });

        const url = await getSignedUrl(client, command, {
            expiresIn: expiresIn || 3600,
        });

        return NextResponse.json({ url });
    } catch (error: any) {
        console.error('Presigned PUT URL error:', error);
        const { message, statusCode } = handleS3Error(error);
        return NextResponse.json(
            { error: message, name: error.name },
            { status: statusCode }
        );
    }
}
