import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { GoogleOAuthService } from './google-oauth.service';
import { TokenEncryptionService } from './token-encryption.service';
import { logInfo, logError } from '../../common/logger';
import { AccountStatus, ChannelStatus } from '@prisma/client';
import { 
  CreateGoogleAccountDto, 
  OAuthCallbackDto, 
  UpdateAccountStatusDto, 
  CreateYouTubeChannelDto,
  UpdateChannelStatusDto,
  GoogleAccountResponse,
  YouTubeChannelResponse
} from '../dto/google-account.dto';

@Injectable()
export class GoogleAccountService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly googleOAuthService: GoogleOAuthService,
    private readonly tokenEncryptionService: TokenEncryptionService,
  ) {}

  /**
   * GoogleアカウントのOAuth認証URLを生成する
   * @param storeId - 店舗ID
   * @returns 認証URL
   */
  async generateAuthUrl(storeId: string): Promise<{ authUrl: string }> {
    logInfo('Generating Google account auth URL', { storeId });

    // 店舗が存在するかチェック
    const store = await this.databaseService.prisma.store.findUnique({
      where: { id: storeId }
    });

    if (!store) {
      throw new NotFoundException('店舗が見つかりません');
    }

    // 既存のGoogleアカウントがあるかチェック
    const existingAccount = await this.databaseService.prisma.googleAccount.findUnique({
      where: { storeId }
    });

    if (existingAccount) {
      throw new BadRequestException('この店舗には既にGoogleアカウントが登録されています');
    }

    const authUrl = this.googleOAuthService.generateAuthUrl(storeId);
    return { authUrl };
  }

  /**
   * OAuth認証完了後の処理
   * @param callbackDto - コールバックデータ
   * @returns Googleアカウント情報
   */
  async handleOAuthCallback(callbackDto: OAuthCallbackDto): Promise<GoogleAccountResponse> {
    logInfo('Handling OAuth callback', { storeId: callbackDto.storeId });

    try {
      // トークンを取得
      const { tokens, storeId } = await this.googleOAuthService.getTokensFromCode(
        callbackDto.code,
        callbackDto.state
      );

      // Googleアカウント情報を取得
      const accountInfo = await this.googleOAuthService.getGoogleAccountInfo(tokens.accessToken);
      
      // YouTubeチャンネル情報を取得
      const channelInfo = await this.googleOAuthService.getYouTubeChannelInfo(tokens.accessToken);

      // トークンを暗号化
      const encryptedAccessToken = this.tokenEncryptionService.encrypt(tokens.accessToken);
      const encryptedRefreshToken = this.tokenEncryptionService.encrypt(tokens.refreshToken);

      // データベースに保存
      const googleAccount = await this.databaseService.prisma.googleAccount.create({
        data: {
          storeId,
          googleEmail: accountInfo.email,
          googleUserId: accountInfo.userId,
          accessTokenEnc: encryptedAccessToken,
          refreshTokenEnc: encryptedRefreshToken,
          tokenExpiresAt: tokens.expiresAt,
          scope: tokens.scope,
          status: AccountStatus.ACTIVE,
          lastTokenRefresh: new Date(),
        }
      });

      // YouTubeチャンネル情報を保存
      const youtubeChannel = await this.databaseService.prisma.youtubeChannel.create({
        data: {
          googleAccountId: googleAccount.id,
          channelId: channelInfo.channelId,
          channelTitle: channelInfo.channelTitle,
          channelUrl: channelInfo.channelUrl,
          thumbnailUrl: channelInfo.thumbnailUrl,
          subscriberCount: channelInfo.subscriberCount,
          status: ChannelStatus.ACTIVE,
          lastSyncedAt: new Date(),
        }
      });

      logInfo('Google account created successfully', { 
        googleAccountId: googleAccount.id, 
        storeId,
        channelId: youtubeChannel.channelId 
      });

      return this.mapGoogleAccountToResponse(googleAccount);

    } catch (error) {
      logError('OAuth callback handling failed', error as Error, { 
        storeId: callbackDto.storeId
      });
      
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('認証処理中にエラーが発生しました');
    }
  }

  /**
   * 店舗のGoogleアカウント情報を取得する
   * @param storeId - 店舗ID
   * @returns Googleアカウント情報
   */
  async getGoogleAccountByStoreId(storeId: string): Promise<GoogleAccountResponse> {
    logInfo('Getting Google account by store ID', { storeId });

    const googleAccount = await this.databaseService.prisma.googleAccount.findUnique({
      where: { storeId },
      include: {
        youtubeChannels: true
      }
    });

    if (!googleAccount) {
      throw new NotFoundException('Googleアカウントが見つかりません');
    }

    return this.mapGoogleAccountToResponse(googleAccount);
  }

  /**
   * 全てのGoogleアカウントを取得する（管理用）
   * @param page - ページ番号
   * @param limit - 1ページあたりの件数
   * @returns Googleアカウント一覧
   */
  async getAllGoogleAccounts(page: number = 1, limit: number = 20): Promise<{
    accounts: GoogleAccountResponse[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    logInfo('Getting all Google accounts', { page, limit });

    const skip = (page - 1) * limit;

    const [accounts, total] = await Promise.all([
      this.databaseService.prisma.googleAccount.findMany({
        skip,
        take: limit,
        include: {
          store: {
            select: {
              id: true,
              storeName: true,
              companyName: true
            }
          },
          youtubeChannels: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.databaseService.prisma.googleAccount.count()
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      accounts: accounts.map(account => this.mapGoogleAccountToResponse(account)),
      total,
      page,
      totalPages
    };
  }

  /**
   * アカウントステータスを更新する
   * @param accountId - アカウントID
   * @param updateDto - 更新データ
   * @returns 更新されたアカウント情報
   */
  async updateAccountStatus(accountId: string, updateDto: UpdateAccountStatusDto): Promise<GoogleAccountResponse> {
    logInfo('Updating account status', { accountId, status: updateDto.status });

    const googleAccount = await this.databaseService.prisma.googleAccount.update({
      where: { id: accountId },
      data: {
        status: updateDto.status,
        errorMessage: updateDto.errorMessage,
        updatedAt: new Date()
      }
    });

    logInfo('Account status updated successfully', { accountId });
    return this.mapGoogleAccountToResponse(googleAccount);
  }

  /**
   * アクセストークンを更新する
   * @param accountId - アカウントID
   * @returns 更新されたアカウント情報
   */
  async refreshAccessToken(accountId: string): Promise<GoogleAccountResponse> {
    logInfo('Refreshing access token', { accountId });

    try {
      const googleAccount = await this.databaseService.prisma.googleAccount.findUnique({
        where: { id: accountId }
      });

      if (!googleAccount) {
        throw new NotFoundException('Googleアカウントが見つかりません');
      }

      // リフレッシュトークンを復号化
      const refreshToken = this.tokenEncryptionService.decrypt(googleAccount.refreshTokenEnc);

      // 新しいアクセストークンを取得
      const tokens = await this.googleOAuthService.refreshAccessToken(refreshToken);

      // 新しいトークンを暗号化
      const encryptedAccessToken = this.tokenEncryptionService.encrypt(tokens.accessToken);

      // データベースを更新
      const updatedAccount = await this.databaseService.prisma.googleAccount.update({
        where: { id: accountId },
        data: {
          accessTokenEnc: encryptedAccessToken,
          tokenExpiresAt: tokens.expiresAt,
          lastTokenRefresh: new Date(),
          status: AccountStatus.ACTIVE,
          errorMessage: null,
          updatedAt: new Date()
        }
      });

      logInfo('Access token refreshed successfully', { accountId });
      return this.mapGoogleAccountToResponse(updatedAccount);

    } catch (error) {
      logError('Access token refresh failed', error as Error, { accountId });

      // エラー時はステータスを更新
      await this.databaseService.prisma.googleAccount.update({
        where: { id: accountId },
        data: {
          status: AccountStatus.ERROR,
          errorMessage: error.message,
          updatedAt: new Date()
        }
      });

      throw new InternalServerErrorException('トークンの更新に失敗しました');
    }
  }

  /**
   * Googleアカウントを削除する
   * @param accountId - アカウントID
   */
  async deleteGoogleAccount(accountId: string): Promise<void> {
    logInfo('Deleting Google account', { accountId });

    const googleAccount = await this.databaseService.prisma.googleAccount.findUnique({
      where: { id: accountId }
    });

    if (!googleAccount) {
      throw new NotFoundException('Googleアカウントが見つかりません');
    }

    await this.databaseService.prisma.googleAccount.delete({
      where: { id: accountId }
    });

    logInfo('Google account deleted successfully', { accountId });
  }

  /**
   * 有効期限切れのトークンをチェックして更新する
   */
  async checkAndRefreshExpiredTokens(): Promise<void> {
    logInfo('Checking expired tokens');

    const expiredAccounts = await this.databaseService.prisma.googleAccount.findMany({
      where: {
        status: AccountStatus.ACTIVE,
        tokenExpiresAt: {
          lt: new Date(Date.now() + 5 * 60 * 1000) // 5分後に期限切れになるトークン
        }
      }
    });

    logInfo('Found expired tokens', { count: expiredAccounts.length });

    for (const account of expiredAccounts) {
      try {
        await this.refreshAccessToken(account.id);
      } catch (error) {
        logError('Failed to refresh expired token', error as Error, { 
          accountId: account.id
        });
      }
    }
  }

  /**
   * GoogleAccountをレスポンス形式にマッピングする
   */
  private mapGoogleAccountToResponse(account: any): GoogleAccountResponse {
    return {
      id: account.id,
      storeId: account.storeId,
      googleEmail: account.googleEmail,
      googleUserId: account.googleUserId,
      status: account.status,
      tokenExpiresAt: account.tokenExpiresAt,
      lastTokenRefresh: account.lastTokenRefresh,
      errorMessage: account.errorMessage,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt
    };
  }
}
