import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_FILTER, APP_GUARD } from '@nestjs/core';
import { PublicModule } from './public/public.module';
import { OAuthModule } from './oauth/oauth.module';
import { DatabaseModule } from './database/database.module';
import { QueueModule } from './queue/queue.module';
import { AwsModule } from './aws/aws.module';
import { YoutubeModule } from './youtube/youtube.module';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './common/auth/auth.module';
import { HealthModule } from './common/health/health.module';
import { SecurityModule } from './common/security/security.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { GlobalExceptionFilter } from './common/filters/error.filter';
import { SecurityGuard } from './common/guards/security.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    QueueModule,
    AwsModule,
    YoutubeModule,
    AdminModule,
    AuthModule,
    HealthModule,
    SecurityModule,
    PublicModule,
    OAuthModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: SecurityGuard,
    },
  ],
})
export class AppModule {}

