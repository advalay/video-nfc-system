import { Injectable } from '@nestjs/common';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

@Injectable()
export class SesService {
  private sesClient: SESClient;
  private senderEmail: string;

  constructor() {
    this.sesClient = new SESClient({
      region: process.env.AWS_REGION || 'ap-northeast-1',
    });
    this.senderEmail = process.env.SES_SENDER || 'noreply@your-domain.jp';
  }

  async sendUploadCompletionNotification(
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

  async sendUploadFailureNotification(
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

