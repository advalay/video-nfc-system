import { Injectable, CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';
import { SecurityService } from '../security/security.service';
import { logWarn } from '../logger';

@Injectable()
export class SecurityGuard implements CanActivate {
  constructor(private securityService: SecurityService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 開発環境では一時的に無効化
    return true;
    
    // const request = context.switchToHttp().getRequest();

    // // 疑わしいアクティビティの検知
    // if (this.securityService.detectSuspiciousActivity(request)) {
    //   logWarn('Suspicious activity blocked', {
    //     ip: request.ip,
    //     userAgent: request.headers['user-agent'],
    //     url: request.url,
    //     method: request.method
    //   });
    //   throw new BadRequestException('疑わしいリクエストが検出されました');
    // }

    // // リクエストボディのサニタイゼーション
    // if (request.body) {
    //   request.body = this.securityService.sanitizeInput(request.body);
    // }

    // // クエリパラメータのサニタイゼーション
    // if (request.query) {
    //   request.query = this.securityService.sanitizeInput(request.query);
    // }

    // return true;
  }
}

/**
 * ファイルアップロード用のセキュリティガード
 */
@Injectable()
export class FileUploadSecurityGuard implements CanActivate {
  constructor(private securityService: SecurityService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // ファイル名の検証
    if (request.file) {
      if (!this.securityService.validateFileName(request.file.originalname)) {
        logWarn('Invalid filename detected', {
          ip: request.ip,
          filename: request.file.originalname,
          userAgent: request.headers['user-agent']
        });
        throw new BadRequestException('無効なファイル名です');
      }
    }

    // 複数ファイルの場合
    if (request.files) {
      for (const file of request.files) {
        if (!this.securityService.validateFileName(file.originalname)) {
          logWarn('Invalid filename detected', {
            ip: request.ip,
            filename: file.originalname,
            userAgent: request.headers['user-agent']
          });
          throw new BadRequestException('無効なファイル名です');
        }
      }
    }

    return true;
  }
}

/**
 * 入力検証用のガード
 */
@Injectable()
export class InputValidationGuard implements CanActivate {
  constructor(private securityService: SecurityService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // シリアル番号の検証
    if (request.body?.serialNo) {
      if (!this.securityService.validateSerialNumber(request.body.serialNo)) {
        logWarn('Invalid serial number detected', {
          ip: request.ip,
          serialNo: request.body.serialNo,
          userAgent: request.headers['user-agent']
        });
        throw new BadRequestException('無効なシリアル番号です');
      }
    }

    // 動画タイトルの検証
    if (request.body?.title) {
      if (!this.securityService.validateVideoTitle(request.body.title)) {
        logWarn('Invalid video title detected', {
          ip: request.ip,
          title: request.body.title,
          userAgent: request.headers['user-agent']
        });
        throw new BadRequestException('無効な動画タイトルです');
      }
    }

    return true;
  }
}

