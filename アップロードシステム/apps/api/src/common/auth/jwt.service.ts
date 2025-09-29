import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { logError, logInfo } from '../logger';

export interface JwtPayload {
  sub: string; // storeId
  storeToken: string;
  permissions: string[];
  iat?: number;
  exp?: number;
}

export interface AuthResult {
  storeId: string;
  storeToken: string;
  permissions: string[];
  isValid: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private jwtService: NestJwtService,
    private configService: ConfigService,
  ) {}

  /**
   * 店舗トークンからJWTトークンを生成
   */
  async generateToken(storeId: string, storeToken: string): Promise<string> {
    const payload: JwtPayload = {
      sub: storeId,
      storeToken,
      permissions: ['upload', 'view'], // 基本的な権限
    };

    const token = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '24h'),
    });

    logInfo('JWT token generated', { storeId, permissions: payload.permissions });
    return token;
  }

  /**
   * JWTトークンを検証
   */
  async validateToken(token: string): Promise<AuthResult> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      }) as JwtPayload;

      logInfo('JWT token validated', { storeId: payload.sub });
      
      return {
        storeId: payload.sub,
        storeToken: payload.storeToken,
        permissions: payload.permissions || [],
        isValid: true,
      };
    } catch (error) {
      logError('JWT token validation failed', error as Error, { token: token.substring(0, 20) + '...' });
      
      return {
        storeId: '',
        storeToken: '',
        permissions: [],
        isValid: false,
      };
    }
  }

  /**
   * 権限チェック
   */
  hasPermission(authResult: AuthResult, requiredPermission: string): boolean {
    if (!authResult.isValid) {
      return false;
    }

    return authResult.permissions.includes(requiredPermission);
  }

  /**
   * レガシー店舗トークンの検証（移行期間用）
   */
  async validateLegacyToken(token: string): Promise<AuthResult> {
    const validTokens = [
      'store_test_token_001',
      // 他の有効なトークンをここに追加
    ];

    if (validTokens.includes(token)) {
      logInfo('Legacy token validated', { token });
      
      return {
        storeId: 'store_test_001', // デフォルトのストアID
        storeToken: token,
        permissions: ['upload', 'view'],
        isValid: true,
      };
    }

    logError('Legacy token validation failed', new Error('Invalid token'), { token });
    
    return {
      storeId: '',
      storeToken: '',
      permissions: [],
      isValid: false,
    };
  }

  /**
   * 統合認証（JWT優先、レガシーフォールバック）
   */
  async authenticate(token: string): Promise<AuthResult> {
    // JWTトークンの場合
    if (token.startsWith('eyJ')) {
      return this.validateToken(token);
    }

    // レガシートークンの場合
    return this.validateLegacyToken(token);
  }
}
