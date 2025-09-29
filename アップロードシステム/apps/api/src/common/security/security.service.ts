import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { logInfo, logWarn } from '../logger';

@Injectable()
export class SecurityService {
  constructor(private configService: ConfigService) {}

  /**
   * セキュリティヘッダーの設定
   */
  createHelmetConfig() {
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'", // 開発環境では必要
            isProduction ? undefined : "'unsafe-eval'" // 開発環境のみ
          ].filter(Boolean),
          styleSrc: [
            "'self'",
            "'unsafe-inline'", // Tailwind CSSなどで必要
            "https://fonts.googleapis.com"
          ],
          fontSrc: [
            "'self'",
            "https://fonts.gstatic.com"
          ],
          imgSrc: [
            "'self'",
            "data:",
            "https:",
            "blob:"
          ],
          connectSrc: [
            "'self'",
            "https://www.googleapis.com",
            "https://youtube.googleapis.com",
            "https://accounts.google.com"
          ],
          frameSrc: [
            "'self'",
            "https://accounts.google.com"
          ],
          objectSrc: ["'none'"],
          // upgradeInsecureRequests: isProduction ? [] : undefined
        },
      },
      hsts: {
        maxAge: 31536000, // 1年
        includeSubDomains: true,
        preload: isProduction
      },
      noSniff: true,
      xssFilter: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      crossOriginEmbedderPolicy: isProduction,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      dnsPrefetchControl: true,
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      ieNoOpen: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
    });
  }

  /**
   * リクエストのサニタイゼーション
   */
  sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return this.sanitizeString(input);
    }
    
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }
    
    if (input && typeof input === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return input;
  }

  /**
   * 文字列のサニタイゼーション
   */
  private sanitizeString(str: string): string {
    return str
      .replace(/[<>]/g, '') // HTMLタグの除去
      .replace(/javascript:/gi, '') // JavaScript: の除去
      .replace(/on\w+\s*=/gi, '') // イベントハンドラの除去
      .replace(/script/gi, '') // scriptタグの除去
      .trim();
  }

  /**
   * ファイル名の検証
   */
  validateFileName(filename: string): boolean {
    // 危険な文字のチェック
    const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (dangerousChars.test(filename)) {
      return false;
    }

    // パストラバーサル攻撃のチェック
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return false;
    }

    // 長すぎるファイル名のチェック
    if (filename.length > 255) {
      return false;
    }

    return true;
  }

  /**
   * シリアル番号の検証
   */
  validateSerialNumber(serialNo: string): boolean {
    // 英数字、ハイフン、アンダースコアのみ許可
    const validPattern = /^[A-Za-z0-9\-_]+$/;
    
    if (!validPattern.test(serialNo)) {
      return false;
    }

    // 長さのチェック（1-50文字）
    if (serialNo.length < 1 || serialNo.length > 50) {
      return false;
    }

    return true;
  }

  /**
   * 動画タイトルの検証
   */
  validateVideoTitle(title: string): boolean {
    // 基本的な文字チェック（改行文字など危険な文字を除去）
    const dangerousChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
    if (dangerousChars.test(title)) {
      return false;
    }

    // 長さのチェック（1-100文字）
    if (title.length < 1 || title.length > 100) {
      return false;
    }

    return true;
  }

  /**
   * IPアドレスの検証
   */
  validateIPAddress(ip: string): boolean {
    // IPv4とIPv6の基本的な検証
    const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Pattern = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    return ipv4Pattern.test(ip) || ipv6Pattern.test(ip);
  }

  /**
   * セキュリティイベントのログ記録
   */
  logSecurityEvent(eventType: string, details: any) {
    logWarn('Security event detected', {
      eventType,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  /**
   * 疑わしいアクティビティの検知
   */
  detectSuspiciousActivity(req: any): boolean {
    const suspiciousPatterns = [
      // SQLインジェクションのパターン
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|OR|AND)\b)/i,
      // XSS攻撃のパターン
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      // パストラバーサルのパターン
      /\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c/i,
      // コマンドインジェクションのパターン
      /[;&|`$()]/,
    ];

    const checkString = JSON.stringify(req.body) + req.url + JSON.stringify(req.query);
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(checkString)) {
        this.logSecurityEvent('suspicious_pattern_detected', {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          pattern: pattern.toString(),
          url: req.url,
          method: req.method
        });
        return true;
      }
    }

    return false;
  }
}
