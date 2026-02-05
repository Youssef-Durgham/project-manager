import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// POST get presigned upload URL
export async function POST(request: NextRequest) {
  try {
    const { filename, contentType } = await request.json();
    
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_S3_BUCKET) {
      return NextResponse.json({ 
        success: false, 
        error: 'S3 not configured. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET in .env.local' 
      }, { status: 500 });
    }

    const ext = filename.split('.').pop() || 'png';
    const key = `uploads/${uuid()}.${ext}`;
    
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      ContentType: contentType || 'image/png',
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return NextResponse.json({ 
      success: true, 
      uploadUrl, 
      fileUrl,
      key,
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate upload URL' }, { status: 500 });
  }
}
