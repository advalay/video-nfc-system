import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { YoutubeService } from '../youtube/youtube.service';
import { KmsService } from '../aws/kms.service';

@Injectable()
export class OAuthService {
  constructor(
    private db: DatabaseService,
    private youtube: YoutubeService,
    private kms: KmsService,
  ) {}

  async startOAuth(storeId: string): Promise<{ consentUrl: string }> {
    const store = await this.db.prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    // テスト用に固定のstateを使用
    const state = 'store_test_token_001';
    const consentUrl = this.youtube.generateAuthUrl(state);

    return { consentUrl };
  }

  async handleOAuthCallback(
    code: string,
    state: string,
  ): Promise<void> {
    // Extract store ID from state
    let storeId: string;
    
    // テスト用の固定stateの場合の処理
    if (state === 'store_test_token_001') {
      storeId = 'store_test_001'; // データベースの実際のstoreId
    } else {
      // 従来の動的stateの場合の処理（後方互換性のため）
      const storeIdMatch = state.match(/^store_(.+)_\d+$/);
      if (!storeIdMatch) {
        throw new Error('Invalid state parameter');
      }
      storeId = storeIdMatch[1];
    }

    // Exchange code for tokens
    const tokens = await this.youtube.exchangeCodeForTokens(code);

    // Get channel information
    const channelInfo = await this.youtube.getChannelInfo(tokens.refresh_token);

    // TODO: Encrypt refresh token when KMS is properly configured
    // const encryptedRefreshToken = await this.kms.encrypt(tokens.refresh_token);

    // Update or create YouTube channel record
    await this.db.prisma.youTubeChannel.upsert({
      where: { storeId },
      update: {
        channelId: channelInfo.channelId,
        channelTitle: channelInfo.channelTitle,
        refreshTokenEnc: tokens.refresh_token, // 一時的にプレーンテキストで保存
        status: 'active',
      },
      create: {
        storeId,
        channelId: channelInfo.channelId,
        channelTitle: channelInfo.channelTitle,
        refreshTokenEnc: tokens.refresh_token, // 一時的にプレーンテキストで保存
        status: 'active',
      },
    });
  }

  async handleOAuthCallbackWithChannelInfo(
    code: string,
    state: string,
  ): Promise<{ channelTitle: string; channelId: string }> {
    // Extract store ID from state
    let storeId: string;
    
    // テスト用の固定stateの場合の処理
    if (state === 'store_test_token_001') {
      storeId = 'store_test_001'; // データベースの実際のstoreId
    } else {
      // 従来の動的stateの場合の処理（後方互換性のため）
      const storeIdMatch = state.match(/^store_(.+)_\d+$/);
      if (!storeIdMatch) {
        throw new Error('Invalid state parameter');
      }
      storeId = storeIdMatch[1];
    }

    // Exchange code for tokens
    const tokens = await this.youtube.exchangeCodeForTokens(code);

    // Get channel information
    const channelInfo = await this.youtube.getChannelInfo(tokens.refresh_token);

    // TODO: Encrypt refresh token when KMS is properly configured
    // const encryptedRefreshToken = await this.kms.encrypt(tokens.refresh_token);

    // Update or create YouTube channel record
    await this.db.prisma.youTubeChannel.upsert({
      where: { storeId },
      update: {
        channelId: channelInfo.channelId,
        channelTitle: channelInfo.channelTitle,
        refreshTokenEnc: tokens.refresh_token, // 一時的にプレーンテキストで保存
        status: 'active',
      },
      create: {
        storeId,
        channelId: channelInfo.channelId,
        channelTitle: channelInfo.channelTitle,
        refreshTokenEnc: tokens.refresh_token, // 一時的にプレーンテキストで保存
        status: 'active',
      },
    });

    return {
      channelTitle: channelInfo.channelTitle,
      channelId: channelInfo.channelId,
    };
  }
}

