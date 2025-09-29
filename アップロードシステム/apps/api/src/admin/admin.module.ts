import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminAuthController } from './admin-auth.controller';
import { GoogleAccountController } from './controllers/google-account.controller';
import { AdminService } from './admin.service';
import { AdminAuthService } from './admin-auth.service';
import { StoreTokenService } from './store-token.service';
import { GoogleFormsService } from './google-forms.service';
import { UploadStatsService } from './upload-stats.service';
import { GoogleAccountService } from './services/google-account.service';
import { GoogleOAuthService } from './services/google-oauth.service';
import { TokenEncryptionService } from './services/token-encryption.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../common/auth/auth.module';
import { SecurityModule } from '../common/security/security.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    SecurityModule,
    ConfigModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AdminController, AdminAuthController, GoogleAccountController],
  providers: [
    AdminService, 
    AdminAuthService, 
    StoreTokenService, 
    GoogleFormsService, 
    UploadStatsService,
    GoogleAccountService,
    GoogleOAuthService,
    TokenEncryptionService,
  ],
  exports: [
    AdminService, 
    AdminAuthService, 
    StoreTokenService, 
    GoogleFormsService, 
    UploadStatsService,
    GoogleAccountService,
    GoogleOAuthService,
    TokenEncryptionService,
  ],
})
export class AdminModule {}
