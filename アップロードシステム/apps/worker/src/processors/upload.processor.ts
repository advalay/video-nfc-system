import { Job } from 'bullmq';
import { google } from 'googleapis';
import { S3Client, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { KMSClient, DecryptCommand } from '@aws-sdk/client-kms';
import { prisma } from '@advalay/db';

interface UploadJobData {
  jobId: string;
  storeId: string;
  fileUri: string;
  title: string;
  serialNo: string;
}

export class UploadProcessor {
  private s3Client: S3Client;
  private sesClient: SESClient;
  private kmsClient: KMSClient;
  private youtubeClientId: string;
  private youtubeClientSecret: string;
  private youtubeRedirectUri: string;
  private senderEmail: string;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-northeast-1',
    });
    this.sesClient = new SESClient({
      region: process.env.AWS_REGION || 'ap-northeast-1',
    });
    this.kmsClient = new KMSClient({
      region: process.env.AWS_REGION || 'ap-northeast-1',
    });
    this.youtubeClientId = process.env.YOUTUBE_CLIENT_ID || '';
    this.youtubeClientSecret = process.env.YOUTUBE_CLIENT_SECRET || '';
    this.youtubeRedirectUri = process.env.YOUTUBE_REDIRECT_URI || '';
    this.senderEmail = process.env.SES_SENDER || 'noreply@your-domain.jp';
  }

  async process(job: Job<UploadJobData>): Promise<void> {
    const { jobId, storeId, fileUri, title, serialNo } = job.data;

    try {
      console.log(`🎬 Processing upload job ${jobId} for store ${storeId}`);

      // Update job state to PROCESSING
      await prisma.uploadJob.update({
        where: { id: jobId },
        data: { state: 'PROCESSING' },
      });

      // Get store and channel information
      const store = await prisma.store.findUnique({
        where: { id: storeId },
        include: {
          youtubeChannel: true,
        },
      });

      if (!store || !store.youtubeChannel) {
        throw new Error('Store or YouTube channel not found');
      }

      // Decrypt refresh token
      const refreshToken = await this.decryptToken(store.youtubeChannel.refreshTokenEnc);

      // Create YouTube OAuth client
      const oauth2Client = new google.auth.OAuth2(
        this.youtubeClientId,
        this.youtubeClientSecret,
        this.youtubeRedirectUri,
      );

      oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

      // Download file from S3
      const s3Key = this.extractS3Key(fileUri);
      const fileStream = await this.downloadFromS3(s3Key);

      // Upload to YouTube
      const uploadResponse = await youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title,
          },
          status: {
            privacyStatus: 'unlisted',
          },
        },
        media: {
          body: fileStream,
        },
      });

      const videoId = uploadResponse.data.id!;
      const videoUrl = `https://youtu.be/${videoId}`;

      // Save video record
      await prisma.video.create({
        data: {
          uploadJobId: jobId,
          youtubeVideoId: videoId,
          url: videoUrl,
          privacyStatus: 'unlisted',
        },
      });

      // Update job state to DONE
      await prisma.uploadJob.update({
        where: { id: jobId },
        data: {
          state: 'DONE',
          completedAt: new Date(),
        },
      });

      // Send completion notification
      await this.sendCompletionNotification(store.notifyEmail, {
        serialNo,
        title,
        videoUrl,
        storeName: store.displayName,
      });

      // Delete original file from S3
      await this.deleteFromS3(s3Key);

      console.log(`✅ Upload job ${jobId} completed successfully. Video URL: ${videoUrl}`);
    } catch (error) {
      console.error(`❌ Upload job ${jobId} failed:`, error);

      // Update job state to FAILED
      await prisma.uploadJob.update({
        where: { id: jobId },
        data: {
          state: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        },
      });

      // Send failure notification
      try {
        const store = await prisma.store.findUnique({
          where: { id: storeId },
        });

        if (store) {
          await this.sendFailureNotification(store.notifyEmail, {
            serialNo,
            title,
            error: error instanceof Error ? error.message : 'Unknown error',
            storeName: store.displayName,
          });
        }
      } catch (notificationError) {
        console.error('Failed to send failure notification:', notificationError);
      }

      throw error; // Re-throw to mark job as failed
    }
  }

  private async decryptToken(encryptedToken: string): Promise<string> {
    const keyId = process.env.KMS_KEY_ID;
    
    if (!keyId) {
      // Development mode - decode base64
      return Buffer.from(encryptedToken, 'base64').toString('utf-8');
    }

    const command = new DecryptCommand({
      CiphertextBlob: Buffer.from(encryptedToken, 'base64'),
    });

    const result = await this.kmsClient.send(command);
    return Buffer.from(result.Plaintext!).toString('utf-8');
  }

  private extractS3Key(fileUri: string): string {
    const match = fileUri.match(/s3:\/\/[^\/]+\/(.+)$/);
    if (!match) {
      throw new Error('Invalid S3 URI format');
    }
    return match[1];
  }

  private async downloadFromS3(key: string): Promise<NodeJS.ReadableStream> {
    const bucketName = process.env.S3_BUCKET || 'advalay-video-uploads';
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    return response.Body as NodeJS.ReadableStream;
  }

  private async deleteFromS3(key: string): Promise<void> {
    const bucketName = process.env.S3_BUCKET || 'advalay-video-uploads';
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  private async sendCompletionNotification(
    toEmail: string,
    data: {
      serialNo: string;
      title: string;
      videoUrl: string;
      storeName: string;
    },
  ): Promise<void> {
    const subject = `【動画アップロード完了】${data.serialNo} - ${data.title}`;
    const body = `
店舗責任者様

動画のアップロードが完了いたしました。

【アップロード情報】
シリアル番号: ${data.serialNo}
タイトル: ${data.title}
店舗名: ${data.storeName}

【YouTube URL】
${data.videoUrl}

※ この動画は限定公開（unlisted）としてアップロードされています。

---
Advalay Video Uploader
    `.trim();

    const command = new SendEmailCommand({
      Source: this.senderEmail,
      Destination: {
        ToAddresses: [toEmail],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: body,
            Charset: 'UTF-8',
          },
        },
      },
    });

    await this.sesClient.send(command);
  }

  private async sendFailureNotification(
    toEmail: string,
    data: {
      serialNo: string;
      title: string;
      error: string;
      storeName: string;
    },
  ): Promise<void> {
    const subject = `【動画アップロード失敗】${data.serialNo} - ${data.title}`;
    const body = `
店舗責任者様

動画のアップロードに失敗いたしました。

【アップロード情報】
シリアル番号: ${data.serialNo}
タイトル: ${data.title}
店舗名: ${data.storeName}

【エラー内容】
${data.error}

管理者にお問い合わせください。

---
Advalay Video Uploader
    `.trim();

    const command = new SendEmailCommand({
      Source: this.senderEmail,
      Destination: {
        ToAddresses: [toEmail],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: body,
            Charset: 'UTF-8',
          },
        },
      },
    });

    await this.sesClient.send(command);
  }
}
