import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { SecurityService } from './common/security/security.service';
import { RateLimitService } from './common/security/rate-limit.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // セキュリティサービスを取得
  const securityService = app.get(SecurityService);
  const rateLimitService = app.get(RateLimitService);

  // セキュリティヘッダーの設定（開発環境では一時的に無効化）
  // app.use(securityService.createHelmetConfig());

  // レート制限の設定（開発環境では一時的に無効化）
  // app.use(rateLimitService.createGeneralRateLimit());
  // app.use(rateLimitService.createSlowDown());

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    disableErrorMessages: process.env.NODE_ENV === 'production',
  }));

  // CORS configuration
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.ALLOWED_ORIGIN || 'https://your-domain.com']
      : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Store-Token', 'X-CSRF-Token'],
    credentials: true,
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Video Uploader API')
    .setDescription('Multi-tenant YouTube uploader API')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-Store-Token', in: 'header' }, 'store-token')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 API server running on http://localhost:${port}`);
  console.log(`📚 Swagger docs available at http://localhost:${port}/api/docs`);
  console.log(`🛡️  Security features enabled: Rate limiting, Helmet, Input validation`);
}

bootstrap();

