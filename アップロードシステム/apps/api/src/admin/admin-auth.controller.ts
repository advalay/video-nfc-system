import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Body, 
  UseGuards, 
  Request,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthService, AdminProfile } from './admin-auth.service';
import { AdminLoginDto, AdminRegisterDto, ChangePasswordDto } from './dto/admin-auth.dto';
import { AdminAuthGuard } from './admin-auth.guard';
import { logInfo, logError } from '../common/logger';


@ApiTags('Admin Authentication')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('register')
  @ApiOperation({ summary: '管理者アカウントを作成' })
  @ApiResponse({ status: 201, description: '管理者アカウントが正常に作成されました' })
  @ApiResponse({ status: 400, description: 'リクエストが無効です' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async register(@Body() registerDto: AdminRegisterDto): Promise<AdminProfile> {
    logInfo('Admin registration request', { email: registerDto.email });
    return this.adminAuthService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '管理者ログイン' })
  @ApiResponse({ status: 200, description: 'ログイン成功' })
  @ApiResponse({ status: 401, description: '認証に失敗しました' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async login(@Body() loginDto: AdminLoginDto) {
    logInfo('Admin login request', { email: loginDto.email });
    return this.adminAuthService.login(loginDto);
  }

  @Get('profile')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '管理者プロフィール取得' })
  @ApiResponse({ status: 200, description: 'プロフィール取得成功' })
  @ApiResponse({ status: 401, description: '認証が必要です' })
  async getProfile(@Request() req): Promise<AdminProfile> {
    const adminId = req.user.sub;
    logInfo('Admin profile request', { adminId });
    return this.adminAuthService.getAdminProfile(adminId);
  }

  @Put('password')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'パスワード変更' })
  @ApiResponse({ status: 200, description: 'パスワードが正常に変更されました' })
  @ApiResponse({ status: 401, description: '認証が必要です' })
  @ApiResponse({ status: 400, description: '現在のパスワードが正しくありません' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const adminId = req.user.sub;
    logInfo('Admin password change request', { adminId });
    
    await this.adminAuthService.changePassword(
      adminId,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );

    return { message: 'パスワードが正常に変更されました' };
  }

  @Post('logout')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ログアウト' })
  @ApiResponse({ status: 200, description: 'ログアウト成功' })
  async logout(@Request() req): Promise<{ message: string }> {
    const adminId = req.user.sub;
    logInfo('Admin logout request', { adminId });
    
    // JWTはステートレスなので、クライアント側でトークンを削除する
    // 必要に応じて、ブラックリスト機能を実装することも可能
    return { message: 'ログアウトしました' };
  }
}
