import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    try {
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION || 'ap-northeast-1',
      });
    } catch (error) {
      console.warn('S3 client not available, using mock');
    }
    this.bucketName = process.env.S3_BUCKET || 'advalay-video-uploads';
  }

  async generatePresignedUrl(
    key: string,
    contentType: string = 'video/mp4',
    expiresIn: number = 600, // 10 minutes
  ): Promise<string> {
    if (!this.s3Client) {
      console.log('S3 not available, returning mock presigned URL');
      return `https://mock-s3-url.com/${key}`;
    }
    
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  getBucketName(): string {
    return this.bucketName;
  }
}
