import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminAuthService } from './admin-auth.service';
import { logError } from '../common/logger';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly adminAuthService: AdminAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('認証トークンが提供されていません');
    }

    try {
      // JWTトークンを検証
      const payload = this.jwtService.verify(token);
      
      // 管理者の存在とアクティブ状態を確認
      await this.adminAuthService.validateAdmin(payload.sub);
      
      // リクエストオブジェクトにユーザー情報を追加
      request.user = payload;
      
      return true;
    } catch (error) {
      logError('Admin authentication failed', error, { token: token.substring(0, 20) + '...' });
      throw new UnauthorizedException('認証に失敗しました');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
