import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthService, AuthResult } from './jwt.service';
import { logError, logInfo } from '../logger';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      logError('No token provided', new Error('Missing token'));
      throw new UnauthorizedException('認証トークンが必要です');
    }

    const authResult = await this.authService.authenticate(token);

    if (!authResult.isValid) {
      logError('Invalid token', new Error('Token validation failed'), { token: token.substring(0, 20) + '...' });
      throw new UnauthorizedException('無効な認証トークンです');
    }

    // リクエストオブジェクトに認証情報を追加
    request.auth = authResult;
    
    logInfo('Request authenticated', { 
      storeId: authResult.storeId, 
      permissions: authResult.permissions 
    });

    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    // X-Store-Token ヘッダーからトークンを取得
    const storeToken = request.headers['x-store-token'] as string;
    if (storeToken) {
      return storeToken;
    }

    // Authorization ヘッダーからトークンを取得（Bearer形式）
    const authHeader = request.headers.authorization as string;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return undefined;
  }
}

/**
 * 権限チェック用のガード
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authResult: AuthResult = request.auth;

    if (!authResult) {
      logError('No auth result found', new Error('Missing auth context'));
      throw new UnauthorizedException('認証情報が見つかりません');
    }

    // デコレータから必要な権限を取得（後で実装）
    const requiredPermission = this.getRequiredPermission(context);
    
    if (!this.authService.hasPermission(authResult, requiredPermission)) {
      logError('Insufficient permissions', new Error('Permission denied'), { 
        required: requiredPermission, 
        available: authResult.permissions 
      });
      throw new UnauthorizedException('権限が不足しています');
    }

    return true;
  }

  private getRequiredPermission(context: ExecutionContext): string {
    // メソッド名から権限を推測（簡易実装）
    const handler = context.getHandler();
    const methodName = handler.name;

    if (methodName.includes('upload')) {
      return 'upload';
    }
    if (methodName.includes('delete')) {
      return 'delete';
    }

    return 'view'; // デフォルト
  }
}
