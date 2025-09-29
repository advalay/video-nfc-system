import { Injectable, Logger } from '@nestjs/common';
import { AdminService } from './admin.service';
import { GoogleFormSubmissionDto } from './dto/store.dto';
import { logInfo, logWarn, logError } from '../common/logger';

@Injectable()
export class GoogleFormsService {
  private readonly logger = new Logger(GoogleFormsService.name);

  constructor(private readonly adminService: AdminService) {}

  /**
   * Googleフォームからの送信を処理
   * 実際の実装では、Google Apps Scriptからのwebhookを受け取る
   */
  async processFormSubmission(submissionData: GoogleFormSubmissionDto): Promise<{
    success: boolean;
    storeId?: string;
    storeToken?: string;
    error?: string;
  }> {
    try {
      logInfo('Processing Google Form submission', { 
        companyName: submissionData.companyName,
        storeName: submissionData.storeName 
      });

      // 重複チェック（フォーム送信IDを使用）
      if (submissionData.formSubmissionId) {
        const existingSubmission = await this.checkDuplicateSubmission(submissionData.formSubmissionId);
        if (existingSubmission) {
          logWarn('Duplicate form submission detected', { 
            formSubmissionId: submissionData.formSubmissionId 
          });
          return {
            success: false,
            error: 'このフォーム送信は既に処理済みです',
          };
        }
      }

      // 店舗を作成
      const store = await this.adminService.createStoreFromGoogleForm(submissionData);

      logInfo('Store created from Google Form submission', {
        storeId: store.id,
        storeToken: store.tokenInfo.rawToken,
        companyName: submissionData.companyName,
        storeName: submissionData.storeName,
      });

      return {
        success: true,
        storeId: store.id,
        storeToken: store.tokenInfo.rawToken,
      };
    } catch (error) {
      logError('Failed to process Google Form submission', error, { submissionData });
      return {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラーが発生しました',
      };
    }
  }

  /**
   * 重複送信チェック
   */
  private async checkDuplicateSubmission(formSubmissionId: string): Promise<boolean> {
    // 実際の実装では、データベースで重複チェックを行う
    // ここでは簡易的に実装
    return false;
  }

  /**
   * Googleフォーム送信の検証
   */
  validateFormSubmission(data: any): GoogleFormSubmissionDto | null {
    try {
      // 必須フィールドのチェック
      if (!data.companyName || !data.storeName || !data.contactName || !data.contactEmail) {
        logWarn('Invalid form submission: missing required fields', { data });
        return null;
      }

      // メールアドレスの形式チェック
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.contactEmail)) {
        logWarn('Invalid form submission: invalid email format', { data });
        return null;
      }

      return {
        companyName: String(data.companyName).trim(),
        storeName: String(data.storeName).trim(),
        contactName: String(data.contactName).trim(),
        contactEmail: String(data.contactEmail).trim().toLowerCase(),
        youtubeChannelName: data.youtubeChannelName ? String(data.youtubeChannelName).trim() : undefined,
        formSubmissionId: data.formSubmissionId ? String(data.formSubmissionId).trim() : undefined,
      };
    } catch (error) {
      logError('Failed to validate form submission', error, { data });
      return null;
    }
  }

  /**
   * 店舗作成後の通知処理
   */
  async sendStoreCreationNotification(store: any): Promise<void> {
    try {
      // 実際の実装では、担当者にメール通知を送信
      logInfo('Store creation notification sent', {
        storeId: store.id,
        contactEmail: store.contactEmail,
        storeToken: store.tokenInfo.rawToken,
      });
    } catch (error) {
      logError('Failed to send store creation notification', error, { store });
    }
  }

  /**
   * Google Apps Script用のWebhookエンドポイント
   * 実際の実装では、セキュリティトークンによる認証を追加
   */
  async handleWebhookSubmission(webhookData: any): Promise<{
    success: boolean;
    message: string;
    storeId?: string;
    storeToken?: string;
  }> {
    try {
      // データの検証
      const validatedData = this.validateFormSubmission(webhookData);
      if (!validatedData) {
        return {
          success: false,
          message: '無効なフォーム送信データです',
        };
      }

      // 店舗作成処理
      const result = await this.processFormSubmission(validatedData);
      
      if (result.success) {
        // 通知送信
        const store = await this.adminService.getStoreById(result.storeId!);
        await this.sendStoreCreationNotification(store);

        return {
          success: true,
          message: '店舗が正常に作成されました',
          storeId: result.storeId,
          storeToken: result.storeToken,
        };
      } else {
        return {
          success: false,
          message: result.error || '店舗の作成に失敗しました',
        };
      }
    } catch (error) {
      logError('Webhook submission processing failed', error, { webhookData });
      return {
        success: false,
        message: 'システムエラーが発生しました',
      };
    }
  }
}

