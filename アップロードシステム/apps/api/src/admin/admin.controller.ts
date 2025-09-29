import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { GoogleFormsService } from './google-forms.service';
import { UploadStatsService, UploadStatsFilter } from './upload-stats.service';
import { CreateStoreDto, UpdateStoreDto, RegenerateTokenDto, GoogleFormSubmissionDto } from './dto/store.dto';
import { AuthGuard } from '../common/auth/auth.guard';
import { logInfo, logWarn } from '../common/logger';

@ApiTags('Admin - 店舗管理')
@Controller('admin')
// @UseGuards(AuthGuard) // 開発環境では一時的に無効化
@ApiBearerAuth('X-Store-Token')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly googleFormsService: GoogleFormsService,
    private readonly uploadStatsService: UploadStatsService,
  ) {}

  @Post('stores')
  @ApiOperation({ summary: 'Googleフォームから店舗を作成' })
  @ApiResponse({ status: 201, description: '店舗が正常に作成されました' })
  @ApiResponse({ status: 400, description: 'リクエストデータが無効です' })
  @ApiResponse({ status: 409, description: 'ストアトークンが重複しています' })
  async createStoreFromGoogleForm(@Body() submission: GoogleFormSubmissionDto) {
    logInfo('Creating store from Google Form', { 
      companyName: submission.companyName,
      storeName: submission.storeName 
    });
    
    return await this.adminService.createStoreFromGoogleForm(submission);
  }

  @Get('stores')
  @ApiOperation({ summary: '店舗一覧を取得' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'ページ番号（デフォルト: 1）' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '1ページあたりの件数（デフォルト: 20）' })
  @ApiResponse({ status: 200, description: '店舗一覧が正常に取得されました' })
  async getStores(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return await this.adminService.getStores(pageNum, limitNum);
  }

  @Get('stores/:id')
  @ApiOperation({ summary: '店舗詳細を取得' })
  @ApiResponse({ status: 200, description: '店舗詳細が正常に取得されました' })
  @ApiResponse({ status: 404, description: '店舗が見つかりません' })
  async getStoreById(@Param('id') id: string) {
    return await this.adminService.getStoreById(id);
  }

  @Put('stores/:id')
  @ApiOperation({ summary: '店舗情報を更新' })
  @ApiResponse({ status: 200, description: '店舗情報が正常に更新されました' })
  @ApiResponse({ status: 404, description: '店舗が見つかりません' })
  @ApiResponse({ status: 400, description: 'リクエストデータが無効です' })
  async updateStore(
    @Param('id') id: string,
    @Body() updateData: UpdateStoreDto,
  ) {
    return await this.adminService.updateStore(id, updateData);
  }

  @Post('stores/:id/regenerate-token')
  @ApiOperation({ summary: 'ストアトークンを再生成' })
  @ApiResponse({ status: 200, description: 'ストアトークンが正常に再生成されました' })
  @ApiResponse({ status: 404, description: '店舗が見つかりません' })
  @ApiResponse({ status: 409, description: '生成されたストアトークンが重複しています' })
  async regenerateStoreToken(
    @Param('id') id: string,
    @Body() regenerateData: RegenerateTokenDto,
  ) {
    logInfo('Regenerating store token', { storeId: id, yearMonth: regenerateData.yearMonth });
    return await this.adminService.regenerateStoreToken(id, regenerateData);
  }

  @Put('stores/:id/toggle-status')
  @ApiOperation({ summary: '店舗の有効/無効を切り替え' })
  @ApiResponse({ status: 200, description: '店舗ステータスが正常に切り替えられました' })
  @ApiResponse({ status: 404, description: '店舗が見つかりません' })
  async toggleStoreStatus(@Param('id') id: string) {
    return await this.adminService.toggleStoreStatus(id);
  }

  @Get('statistics')
  @ApiOperation({ summary: '店舗の統計情報を取得' })
  @ApiResponse({ status: 200, description: '統計情報が正常に取得されました' })
  async getStoreStatistics() {
    return await this.adminService.getStoreStatistics();
  }

  @Get('stores/token/:token')
  @ApiOperation({ summary: 'ストアトークンで店舗情報を取得' })
  @ApiResponse({ status: 200, description: '店舗情報が正常に取得されました' })
  @ApiResponse({ status: 404, description: '店舗が見つかりません' })
  async getStoreByToken(@Param('token') token: string) {
    const store = await this.adminService.getStoreByToken(token);
    if (!store) {
      throw new NotFoundException(`ストアトークン '${token}' が見つかりません`);
    }
    return store;
  }

  @Post('webhook/google-forms')
  @ApiOperation({ summary: 'Googleフォーム Webhook（Google Apps Script用）' })
  @ApiResponse({ status: 200, description: 'フォーム送信が正常に処理されました' })
  @ApiResponse({ status: 400, description: 'リクエストデータが無効です' })
  @HttpCode(HttpStatus.OK)
  async handleGoogleFormsWebhook(@Body() webhookData: any) {
    logInfo('Received Google Forms webhook', { webhookData });
    return await this.googleFormsService.handleWebhookSubmission(webhookData);
  }

  // === アップロード統計関連のエンドポイント ===

  @Get('upload-stats/stores')
  @ApiOperation({ summary: '店舗ごとのアップロード統計を取得' })
  @ApiResponse({ status: 200, description: '店舗ごとのアップロード統計が正常に取得されました' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: '開始日 (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: '終了日 (YYYY-MM-DD)' })
  @ApiQuery({ name: 'storeIds', required: false, type: String, description: '店舗IDのカンマ区切り' })
  @ApiQuery({ name: 'companyIds', required: false, type: String, description: '会社IDのカンマ区切り' })
  async getStoreUploadStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('storeIds') storeIds?: string,
    @Query('companyIds') companyIds?: string,
  ) {
    logInfo('Getting store upload stats', { startDate, endDate, storeIds, companyIds });
    
    const filter: UploadStatsFilter = {};
    
    if (startDate) filter.startDate = new Date(startDate);
    if (endDate) filter.endDate = new Date(endDate);
    if (storeIds) filter.storeIds = storeIds.split(',').map(id => id.trim());
    if (companyIds) filter.companyIds = companyIds.split(',').map(id => id.trim());
    
    return await this.uploadStatsService.getStoreUploadStats(filter);
  }

  @Get('upload-stats/overall')
  @ApiOperation({ summary: '全体のアップロード統計を取得' })
  @ApiResponse({ status: 200, description: '全体のアップロード統計が正常に取得されました' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: '開始日 (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: '終了日 (YYYY-MM-DD)' })
  @ApiQuery({ name: 'storeIds', required: false, type: String, description: '店舗IDのカンマ区切り' })
  @ApiQuery({ name: 'companyIds', required: false, type: String, description: '会社IDのカンマ区切り' })
  async getOverallUploadStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('storeIds') storeIds?: string,
    @Query('companyIds') companyIds?: string,
  ) {
    logInfo('Getting overall upload stats', { startDate, endDate, storeIds, companyIds });
    
    const filter: UploadStatsFilter = {};
    
    if (startDate) filter.startDate = new Date(startDate);
    if (endDate) filter.endDate = new Date(endDate);
    if (storeIds) filter.storeIds = storeIds.split(',').map(id => id.trim());
    if (companyIds) filter.companyIds = companyIds.split(',').map(id => id.trim());
    
    return await this.uploadStatsService.getOverallUploadStats(filter);
  }

  @Get('upload-stats/daily')
  @ApiOperation({ summary: '日別アップロード統計を取得' })
  @ApiResponse({ status: 200, description: '日別アップロード統計が正常に取得されました' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: '開始日 (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: '終了日 (YYYY-MM-DD)' })
  @ApiQuery({ name: 'storeIds', required: false, type: String, description: '店舗IDのカンマ区切り' })
  @ApiQuery({ name: 'companyIds', required: false, type: String, description: '会社IDのカンマ区切り' })
  async getDailyUploadStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('storeIds') storeIds?: string,
    @Query('companyIds') companyIds?: string,
  ) {
    logInfo('Getting daily upload stats', { startDate, endDate, storeIds, companyIds });
    
    const filter: UploadStatsFilter = {};
    
    if (startDate) filter.startDate = new Date(startDate);
    if (endDate) filter.endDate = new Date(endDate);
    if (storeIds) filter.storeIds = storeIds.split(',').map(id => id.trim());
    if (companyIds) filter.companyIds = companyIds.split(',').map(id => id.trim());
    
    return await this.uploadStatsService.getDailyUploadStats(filter);
  }
}
