import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { logHttp, logError, logInfo } from '../logger';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    const { method, url, headers, body } = request;
    const userAgent = headers['user-agent'] || '';
    const ip = request.ip || request.connection.remoteAddress;

    // リクエストログ
    logHttp('Request received', {
      method,
      url,
      userAgent,
      ip,
      body: this.sanitizeBody(body),
    });

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        const { statusCode } = response;

        // レスポンスログ
        logHttp('Request completed', {
          method,
          url,
          statusCode,
          duration,
          ip,
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const { statusCode } = response;

        // エラーログ
        logError('Request failed', error, {
          method,
          url,
          statusCode: statusCode || 500,
          duration,
          ip,
          body: this.sanitizeBody(body),
        });

        throw error;
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;

    // パスワードやトークンなどの機密情報をマスク
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'refreshToken'];

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '***MASKED***';
      }
    });

    return sanitized;
  }
}
