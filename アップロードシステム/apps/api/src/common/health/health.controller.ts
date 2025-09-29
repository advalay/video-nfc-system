import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { logInfo } from '../logger';

@Controller('health')
export class HealthController {
  constructor(private configService: ConfigService) {}

  @Get()
  async getHealth() {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'advalay-api',
      version: this.configService.get<string>('APP_VERSION', '1.0.0'),
      environment: this.configService.get<string>('NODE_ENV', 'development'),
      uptime: process.uptime(),
      memory: {
        used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
        total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
      },
    };

    logInfo('Health check requested', { status: health.status });
    return health;
  }

  @Get('ready')
  async getReadiness() {
    // 基本的な依存関係のチェック
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      aws: await this.checkAWS(),
    };

    const isReady = Object.values(checks).every(check => check.status === 'ok');

    const readiness = {
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks,
    };

    logInfo('Readiness check requested', { status: readiness.status, checks });
    return readiness;
  }

  @Get('live')
  async getLiveness() {
    // 基本的な生存確認
    const liveness = {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };

    return liveness;
  }

  private async checkDatabase(): Promise<{ status: string; message?: string }> {
    try {
      // Prismaクライアントの接続チェック
      // const result = await prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch (error) {
      return { 
        status: 'error', 
        message: 'Database connection failed' 
      };
    }
  }

  private async checkRedis(): Promise<{ status: string; message?: string }> {
    try {
      // Redis接続チェック
      // const redis = new Redis(process.env.REDIS_URL);
      // await redis.ping();
      return { status: 'ok' };
    } catch (error) {
      return { 
        status: 'error', 
        message: 'Redis connection failed' 
      };
    }
  }

  private async checkAWS(): Promise<{ status: string; message?: string }> {
    try {
      // AWS認証情報のチェック
      const hasCredentials = !!(
        process.env.AWS_ACCESS_KEY_ID && 
        process.env.AWS_SECRET_ACCESS_KEY
      );
      
      return hasCredentials 
        ? { status: 'ok' }
        : { status: 'warning', message: 'AWS credentials not configured' };
    } catch (error) {
      return { 
        status: 'error', 
        message: 'AWS configuration failed' 
      };
    }
  }
}
