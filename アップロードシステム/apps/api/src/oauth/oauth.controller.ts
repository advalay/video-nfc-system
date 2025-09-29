import { Controller, Post, Get, Body, Query, HttpException, HttpStatus, Res, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OAuthService } from './oauth.service';
import { AuthService } from '../public/auth.service';
import { IsString, IsNotEmpty } from 'class-validator';
import { Response } from 'express';

class OAuthStartRequest {
  @IsString()
  @IsNotEmpty()
  storeId: string;
}

class OAuthCallbackRequest {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  state: string;
}

@ApiTags('OAuth')
@Controller('api/v1/channels/oauth')
export class OAuthController {
  constructor(
    private oauthService: OAuthService,
    private authService: AuthService,
  ) {}

  @Post('start')
  @ApiOperation({ summary: '店舗用YouTube連携開始（同意URLを発行）' })
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiResponse({ status: 404, description: 'store not found' })
  async startOAuth(@Headers('x-store-token') storeToken: string) {
    try {
      if (!storeToken) {
        throw new HttpException('Store token required', HttpStatus.BAD_REQUEST);
      }

      // ストアトークンからstoreIdを取得
      const storeInfo = await this.authService.validateStoreToken(storeToken);
      
      return await this.oauthService.startOAuth(storeInfo.storeId);
    } catch (error) {
      console.error('OAuth start error:', error);
      if (error.message.includes('Store not found') || error.message.includes('Invalid store token')) {
        throw new HttpException('Store not found', HttpStatus.NOT_FOUND);
      }
      if (error.message.includes('YouTube OAuth環境変数が設定されていません')) {
        throw new HttpException('YouTube OAuth環境変数が設定されていません', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      throw new HttpException(`Internal server error: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('callback')
  @ApiOperation({ summary: 'OAuth同意コールバック（refresh_token保存）' })
  @ApiResponse({ status: 204, description: 'saved' })
  @ApiResponse({ status: 400, description: 'invalid code/state' })
  async handleCallback(@Body() body: OAuthCallbackRequest) {
    try {
      await this.oauthService.handleOAuthCallback(body.code, body.state);
      return;
    } catch (error) {
      throw new HttpException('Invalid code or state', HttpStatus.BAD_REQUEST);
    }
  }

  @Get('callback')
  @ApiOperation({ summary: 'OAuth同意コールバック（GET、リダイレクト付き）' })
  async handleCallbackGet(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response
  ) {
    try {
      // テスト用の固定stateの場合の処理
      let storeId: string;
      if (state === 'store_test_token_001') {
        storeId = 'store_test_001'; // データベースの実際のstoreId
      } else {
        // 従来の動的stateの場合の処理（後方互換性のため）
        const storeIdMatch = state.match(/^store_(.+)_\d+$/);
        if (!storeIdMatch) {
          return res.redirect(`http://localhost:3000/store/${state}?error=invalid_state`);
        }
        storeId = storeIdMatch[1];
      }

      if (!code) {
        return res.redirect(`http://localhost:3000/store/store_test_token_001?error=no_code`);
      }

      const channelInfo = await this.oauthService.handleOAuthCallbackWithChannelInfo(code, state);
      
      // 成功時にシステムページにリダイレクト（チャンネル情報付き）
      return res.redirect(`http://localhost:3000/store/store_test_token_001?auth=success&channel=${encodeURIComponent(channelInfo.channelTitle)}`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      
      // エラーの種類に応じて適切なエラーメッセージを返す
      let errorType = 'oauth_failed';
      if (error.message.includes('YouTube OAuth環境変数が設定されていません')) {
        errorType = 'config_error';
      } else if (error.message.includes('Invalid state parameter')) {
        errorType = 'invalid_state';
      } else if (error.message.includes('No refresh token received')) {
        errorType = 'no_refresh_token';
      } else if (error.message.includes('No channel found')) {
        errorType = 'no_channel';
      }
      
      return res.redirect(`http://localhost:3000/store/store_test_token_001?error=${errorType}`);
    }
  }
}

