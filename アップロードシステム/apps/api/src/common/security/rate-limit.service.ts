import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { logWarn } from '../logger';

@Injectable()
export class RateLimitService {
  constructor(private configService: ConfigService) {}

  /**
   * 一般的なAPI用のレート制限
   */
  createGeneralRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15分
      max: 100, // 100リクエストまで
      message: {
        error: 'Too many requests',
        message: '15分間に100回までしかリクエストできません',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logWarn('Rate limit exceeded', {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          endpoint: req.path,
          method: req.method
        });
        res.status(429).json({
          error: 'Too many requests',
          message: '15分間に100回までしかリクエストできません',
          retryAfter: '15 minutes'
        });
      },
      skip: (req) => {
        // ヘルスチェックは除外
        return req.path === '/health' || req.path === '/health/live';
      }
    });
  }

  /**
   * アップロード用の厳しいレート制限
   */
  createUploadRateLimit() {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1時間
      max: 10, // 10回まで
      message: {
        error: 'Upload rate limit exceeded',
        message: '1時間に10回までしかアップロードできません',
        retryAfter: '1 hour'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logWarn('Upload rate limit exceeded', {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          endpoint: req.path,
          storeToken: req.headers['x-store-token']?.toString().substring(0, 20) + '...'
        });
        res.status(429).json({
          error: 'Upload rate limit exceeded',
          message: '1時間に10回までしかアップロードできません',
          retryAfter: '1 hour'
        });
      }
    });
  }

  /**
   * OAuth認証用のレート制限
   */
  createOAuthRateLimit() {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1時間
      max: 5, // 5回まで
      message: {
        error: 'OAuth rate limit exceeded',
        message: '1時間に5回までしかOAuth認証を試行できません',
        retryAfter: '1 hour'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logWarn('OAuth rate limit exceeded', {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          endpoint: req.path
        });
        res.status(429).json({
          error: 'OAuth rate limit exceeded',
          message: '1時間に5回までしかOAuth認証を試行できません',
          retryAfter: '1 hour'
        });
      }
    });
  }

  /**
   * スローダウン機能（連続リクエストの遅延）
   */
  createSlowDown() {
    return slowDown({
      windowMs: 15 * 60 * 1000, // 15分
      delayAfter: 50, // 50リクエスト後に遅延開始
      delayMs: 500, // 500ms遅延
      maxDelayMs: 20000, // 最大20秒遅延
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      // onLimitReached: (req, res, options) => {
      //   logWarn('Slow down activated', {
      //     ip: req.ip,
      //     userAgent: req.headers['user-agent'],
      //     endpoint: req.path,
      //     delayMs: options.delayMs
      //   });
      // }
    });
  }

  /**
   * 厳格なレート制限（管理機能用）
   */
  createStrictRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15分
      max: 20, // 20回まで
      message: {
        error: 'Strict rate limit exceeded',
        message: '管理機能へのアクセスが制限されました',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logWarn('Strict rate limit exceeded', {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          endpoint: req.path,
          method: req.method
        });
        res.status(429).json({
          error: 'Strict rate limit exceeded',
          message: '管理機能へのアクセスが制限されました',
          retryAfter: '15 minutes'
        });
      }
    });
  }
}
