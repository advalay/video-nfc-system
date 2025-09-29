import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GoogleAccountService } from '../services/google-account.service';
import { AdminAuthGuard } from '../admin-auth.guard';
import { logInfo } from '../../common/logger';
import {
  CreateGoogleAccountDto,
  OAuthCallbackDto,
  UpdateAccountStatusDto,
  GoogleAccountResponse,
} from '../dto/google-account.dto';

@ApiTags('Google Account Management')
@Controller('admin/google-accounts')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class GoogleAccountController {
  constructor(private readonly googleAccountService: GoogleAccountService) {}

  @Post('auth-url')
  @ApiOperation({ summary: 'Googleアカウント認証URLを生成', description: '指定された店舗のGoogleアカウント認証URLを生成します。' })
  @ApiResponse({ status: 201, description: '認証URLが正常に生成されました。' })
  @ApiResponse({ status: 400, description: '無効なリクエストデータ。' })
  @ApiResponse({ status: 404, description: '店舗が見つかりません。' })
  async generateAuthUrl(@Body() createDto: CreateGoogleAccountDto): Promise<{ authUrl: string }> {
    logInfo('Generate auth URL request received', { storeId: createDto.storeId });
    return this.googleAccountService.generateAuthUrl(createDto.storeId);
  }

  @Post('oauth-callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'OAuth認証コールバック処理', description: 'Google OAuth認証完了後のコールバック処理を行います。' })
  @ApiResponse({ status: 200, description: '認証が正常に完了しました。' })
  @ApiResponse({ status: 400, description: '無効な認証データ。' })
  @ApiResponse({ status: 404, description: '店舗が見つかりません。' })
  async handleOAuthCallback(@Body() callbackDto: OAuthCallbackDto): Promise<GoogleAccountResponse> {
    logInfo('OAuth callback request received', { storeId: callbackDto.storeId });
    return this.googleAccountService.handleOAuthCallback(callbackDto);
  }

  @Get('store/:storeId')
  @ApiOperation({ summary: '店舗のGoogleアカウント情報を取得', description: '指定された店舗のGoogleアカウント情報を取得します。' })
  @ApiResponse({ status: 200, description: 'Googleアカウント情報。' })
  @ApiResponse({ status: 404, description: 'Googleアカウントが見つかりません。' })
  async getGoogleAccountByStoreId(@Param('storeId') storeId: string): Promise<GoogleAccountResponse> {
    logInfo('Get Google account by store ID request received', { storeId });
    return this.googleAccountService.getGoogleAccountByStoreId(storeId);
  }

  @Get()
  @ApiOperation({ summary: '全てのGoogleアカウントを取得', description: '管理用：全てのGoogleアカウント情報を取得します。' })
  @ApiQuery({ name: 'page', required: false, description: 'ページ番号（デフォルト: 1）' })
  @ApiQuery({ name: 'limit', required: false, description: '1ページあたりの件数（デフォルト: 20）' })
  @ApiResponse({ status: 200, description: 'Googleアカウント一覧。' })
  async getAllGoogleAccounts(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20
  ): Promise<{
    accounts: GoogleAccountResponse[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    logInfo('Get all Google accounts request received', { page, limit });
    return this.googleAccountService.getAllGoogleAccounts(page, limit);
  }

  @Put(':accountId/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'アカウントステータスを更新', description: 'Googleアカウントのステータスを更新します。' })
  @ApiResponse({ status: 200, description: 'ステータスが正常に更新されました。' })
  @ApiResponse({ status: 400, description: '無効なリクエストデータ。' })
  @ApiResponse({ status: 404, description: 'Googleアカウントが見つかりません。' })
  async updateAccountStatus(
    @Param('accountId') accountId: string,
    @Body() updateDto: UpdateAccountStatusDto
  ): Promise<GoogleAccountResponse> {
    logInfo('Update account status request received', { accountId, status: updateDto.status });
    return this.googleAccountService.updateAccountStatus(accountId, updateDto);
  }

  @Post(':accountId/refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'アクセストークンを更新', description: 'Googleアカウントのアクセストークンを更新します。' })
  @ApiResponse({ status: 200, description: 'トークンが正常に更新されました。' })
  @ApiResponse({ status: 404, description: 'Googleアカウントが見つかりません。' })
  @ApiResponse({ status: 500, description: 'トークンの更新に失敗しました。' })
  async refreshAccessToken(@Param('accountId') accountId: string): Promise<GoogleAccountResponse> {
    logInfo('Refresh access token request received', { accountId });
    return this.googleAccountService.refreshAccessToken(accountId);
  }

  @Delete(':accountId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Googleアカウントを削除', description: 'Googleアカウントと関連するYouTubeチャンネル情報を削除します。' })
  @ApiResponse({ status: 204, description: 'アカウントが正常に削除されました。' })
  @ApiResponse({ status: 404, description: 'Googleアカウントが見つかりません。' })
  async deleteGoogleAccount(@Param('accountId') accountId: string): Promise<void> {
    logInfo('Delete Google account request received', { accountId });
    return this.googleAccountService.deleteGoogleAccount(accountId);
  }

  @Post('check-expired-tokens')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '有効期限切れトークンをチェック・更新', description: '有効期限切れのトークンをチェックし、可能なものは更新します。' })
  @ApiResponse({ status: 200, description: 'トークンチェックが完了しました。' })
  async checkAndRefreshExpiredTokens(): Promise<{ message: string }> {
    logInfo('Check expired tokens request received');
    await this.googleAccountService.checkAndRefreshExpiredTokens();
    return { message: '有効期限切れトークンのチェックが完了しました' };
  }
}
