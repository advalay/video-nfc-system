import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { logInfo, logError } from '../../common/logger';

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
}

export interface YouTubeChannelInfo {
  channelId: string;
  channelTitle: string;
  channelUrl?: string;
  thumbnailUrl?: string;
  subscriberCount?: number;
}

@Injectable()
export class GoogleOAuthService {
  private readonly oauth2Client: any;
  private readonly youtubeService: any;

  constructor(private readonly configService: ConfigService) {
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      this.configService.get<string>('GOOGLE_REDIRECT_URI')
    );

    this.youtubeService = google.youtube({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * OAuth認証URLを生成する
   * @param storeId - 店舗ID
   * @returns 認証URL
   */
  generateAuthUrl(storeId: string): string {
    logInfo('Generating OAuth auth URL', { storeId });

    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    const state = Buffer.from(JSON.stringify({ storeId, timestamp: Date.now() })).toString('base64');

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: state,
      prompt: 'consent' // リフレッシュトークンを確実に取得するため
    });

    logInfo('OAuth auth URL generated', { storeId, authUrl: authUrl.substring(0, 100) + '...' });
    return authUrl;
  }

  /**
   * OAuth認証コードからトークンを取得する
   * @param code - 認証コード
   * @param state - ステート
   * @returns OAuthトークン情報
   */
  async getTokensFromCode(code: string, state: string): Promise<{ tokens: OAuthTokens; storeId: string }> {
    logInfo('Getting tokens from OAuth code', { code: code.substring(0, 10) + '...' });

    try {
      // ステートを検証
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      const { storeId, timestamp } = stateData;

      // ステートの有効期限チェック（5分）
      if (Date.now() - timestamp > 5 * 60 * 1000) {
        throw new BadRequestException('認証の有効期限が切れています。再度認証してください。');
      }

      const { tokens } = await this.oauth2Client.getToken(code);
      
      if (!tokens.access_token || !tokens.refresh_token) {
        throw new BadRequestException('必要なトークンが取得できませんでした。');
      }

      const expiresAt = new Date(tokens.expiry_date || Date.now() + 3600 * 1000);

      const tokenData: OAuthTokens = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: expiresAt,
        scope: tokens.scope || ''
      };

      logInfo('Tokens retrieved successfully', { storeId, expiresAt });
      return { tokens: tokenData, storeId };

    } catch (error) {
      logError('Failed to get tokens from OAuth code', error as Error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('認証処理中にエラーが発生しました。');
    }
  }

  /**
   * リフレッシュトークンでアクセストークンを更新する
   * @param refreshToken - リフレッシュトークン
   * @returns 更新されたトークン情報
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    logInfo('Refreshing access token');

    try {
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });
      
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      if (!credentials.access_token) {
        throw new BadRequestException('アクセストークンの更新に失敗しました。');
      }

      const expiresAt = new Date(credentials.expiry_date || Date.now() + 3600 * 1000);

      const tokenData: OAuthTokens = {
        accessToken: credentials.access_token,
        refreshToken: refreshToken, // リフレッシュトークンは通常変更されない
        expiresAt: expiresAt,
        scope: credentials.scope || ''
      };

      logInfo('Access token refreshed successfully', { expiresAt });
      return tokenData;

    } catch (error) {
      logError('Failed to refresh access token', error as Error);
      throw new InternalServerErrorException('トークンの更新中にエラーが発生しました。');
    }
  }

  /**
   * YouTubeチャンネル情報を取得する
   * @param accessToken - アクセストークン
   * @returns チャンネル情報
   */
  async getYouTubeChannelInfo(accessToken: string): Promise<YouTubeChannelInfo> {
    logInfo('Getting YouTube channel info');

    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });
      
      const response = await this.youtubeService.channels.list({
        part: ['snippet', 'statistics'],
        mine: true
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new BadRequestException('YouTubeチャンネルが見つかりませんでした。');
      }

      const channel = response.data.items[0];
      const snippet = channel.snippet;
      const statistics = channel.statistics;

      const channelInfo: YouTubeChannelInfo = {
        channelId: channel.id,
        channelTitle: snippet.title,
        channelUrl: `https://www.youtube.com/channel/${channel.id}`,
        thumbnailUrl: snippet.thumbnails?.default?.url || snippet.thumbnails?.medium?.url,
        subscriberCount: statistics?.subscriberCount ? parseInt(statistics.subscriberCount) : undefined
      };

      logInfo('YouTube channel info retrieved', { 
        channelId: channelInfo.channelId, 
        channelTitle: channelInfo.channelTitle 
      });

      return channelInfo;

    } catch (error) {
      logError('Failed to get YouTube channel info', error as Error);
      throw new InternalServerErrorException('YouTubeチャンネル情報の取得中にエラーが発生しました。');
    }
  }

  /**
   * Googleアカウント情報を取得する
   * @param accessToken - アクセストークン
   * @returns アカウント情報
   */
  async getGoogleAccountInfo(accessToken: string): Promise<{ email: string; userId: string }> {
    logInfo('Getting Google account info');

    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });
      
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const response = await oauth2.userinfo.get();

      if (!response.data.email || !response.data.id) {
        throw new BadRequestException('Googleアカウント情報が取得できませんでした。');
      }

      const accountInfo = {
        email: response.data.email,
        userId: response.data.id
      };

      logInfo('Google account info retrieved', { email: accountInfo.email });
      return accountInfo;

    } catch (error) {
      logError('Failed to get Google account info', error as Error);
      throw new InternalServerErrorException('Googleアカウント情報の取得中にエラーが発生しました。');
    }
  }

  /**
   * トークンが有効かチェックする
   * @param accessToken - アクセストークン
   * @returns 有効性
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });
      
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      await oauth2.userinfo.get();
      
      return true;
    } catch (error) {
      logError('Token validation failed', error as Error);
      return false;
    }
  }
}
