import { Injectable } from '@nestjs/common';
import { google, youtube_v3 } from 'googleapis';
import { KmsService } from '../aws/kms.service';

@Injectable()
export class YoutubeService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(private kmsService: KmsService) {
    this.clientId = process.env.YOUTUBE_CLIENT_ID || '';
    this.clientSecret = process.env.YOUTUBE_CLIENT_SECRET || '';
    this.redirectUri = process.env.YOUTUBE_REDIRECT_URI || '';
    
    // 環境変数の検証
    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      console.error('❌ YouTube OAuth環境変数が設定されていません:');
      console.error('YOUTUBE_CLIENT_ID:', this.clientId ? '設定済み' : '未設定');
      console.error('YOUTUBE_CLIENT_SECRET:', this.clientSecret ? '設定済み' : '未設定');
      console.error('YOUTUBE_REDIRECT_URI:', this.redirectUri ? '設定済み' : '未設定');
    }
  }

  generateAuthUrl(state: string): string {
    // 環境変数の検証
    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      throw new Error('YouTube OAuth環境変数が設定されていません。YOUTUBE_CLIENT_ID、YOUTUBE_CLIENT_SECRET、YOUTUBE_REDIRECT_URIを設定してください。');
    }
    
    const oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri,
    );

    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube',
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state,
      prompt: 'consent', // リフレッシュトークンを確実に取得するため
    });
  }

  async exchangeCodeForTokens(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    // 環境変数の検証
    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      throw new Error('YouTube OAuth環境変数が設定されていません。YOUTUBE_CLIENT_ID、YOUTUBE_CLIENT_SECRET、YOUTUBE_REDIRECT_URIを設定してください。');
    }
    
    const oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri,
    );

    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.refresh_token) {
      throw new Error('No refresh token received');
    }

    return {
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : 3600,
    };
  }

  async getChannelInfo(refreshToken: string): Promise<{
    channelId: string;
    channelTitle: string;
  }> {
    // 環境変数の検証
    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      throw new Error('YouTube OAuth環境変数が設定されていません。YOUTUBE_CLIENT_ID、YOUTUBE_CLIENT_SECRET、YOUTUBE_REDIRECT_URIを設定してください。');
    }
    
    const oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri,
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const response = await youtube.channels.list({
      part: ['snippet'],
      mine: true,
    });

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error('No channel found');
    }

    const channel = response.data.items[0];
    return {
      channelId: channel.id!,
      channelTitle: channel.snippet?.title || 'Unknown Channel',
    };
  }

  async uploadVideo(
    refreshToken: string,
    fileUri: string,
    title: string,
  ): Promise<{ videoId: string; url: string }> {
    const oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri,
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    // Note: In a real implementation, you would stream the file from S3
    // For now, we'll simulate the upload process
    const response = await youtube.videos.insert({
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
        body: require('fs').createReadStream(fileUri),
      },
    });

    const videoId = response.data.id!;
    return {
      videoId,
      url: `https://youtu.be/${videoId}`,
    };
  }
}

