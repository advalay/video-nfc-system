import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { logInfo, logError } from '../common/logger';
import { validatePasswordStrength, hashPassword, verifyPassword } from './utils/password.utils';
import { AdminLoginDto, AdminRegisterDto } from './dto/admin-auth.dto';


export interface AdminProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
}

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
}

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: AdminRegisterDto): Promise<AdminProfile> {
    const { email, password, name, role = 'admin' } = registerDto;

    // パスワード強度チェック
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new BadRequestException(`パスワードが弱すぎます: ${passwordValidation.feedback.join(', ')}`);
    }

    // メールアドレスの重複チェック
    const existingAdmin = await this.databaseService.prisma.admin.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      throw new BadRequestException('このメールアドレスは既に登録されています');
    }

    // パスワードをハッシュ化
    const hashedPassword = await hashPassword(password);

    try {
      const admin = await this.databaseService.prisma.admin.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
      });

      logInfo('Admin registered successfully', { adminId: admin.id, email });
      return admin;
    } catch (error) {
      logError('Failed to register admin', error, { email });
      throw new BadRequestException('管理者の登録に失敗しました');
    }
  }

  async login(loginDto: AdminLoginDto): Promise<{ accessToken: string; admin: AdminProfile }> {
    const { email, password } = loginDto;

    try {
      // 管理者を検索
      const admin = await this.databaseService.prisma.admin.findUnique({
        where: { email },
      });

      if (!admin) {
        throw new UnauthorizedException('メールアドレスまたはパスワードが正しくありません');
      }

      // アカウントが無効化されているかチェック
      if (!admin.isActive) {
        throw new UnauthorizedException('このアカウントは無効化されています');
      }

      // パスワードを検証
      const isPasswordValid = await verifyPassword(password, admin.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('メールアドレスまたはパスワードが正しくありません');
      }

      // 最終ログイン時刻を更新
      await this.databaseService.prisma.admin.update({
        where: { id: admin.id },
        data: { lastLoginAt: new Date() },
      });

      // JWTペイロードを作成
      const payload: JwtPayload = {
        sub: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      };

      // アクセストークンを生成
      const accessToken = this.jwtService.sign(payload);

      // 管理者情報を返す（パスワードは除外）
      const adminProfile: AdminProfile = {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        isActive: admin.isActive,
        lastLoginAt: admin.lastLoginAt,
        createdAt: admin.createdAt,
      };

      logInfo('Admin logged in successfully', { adminId: admin.id, email });
      return { accessToken, admin: adminProfile };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      logError('Failed to login admin', error, { email });
      throw new UnauthorizedException('ログインに失敗しました');
    }
  }

  async validateAdmin(adminId: string): Promise<AdminProfile> {
    try {
      const admin = await this.databaseService.prisma.admin.findUnique({
        where: { id: adminId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
      });

      if (!admin || !admin.isActive) {
        throw new UnauthorizedException('管理者が見つからないか、アカウントが無効化されています');
      }

      return admin;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      logError('Failed to validate admin', error, { adminId });
      throw new UnauthorizedException('管理者の認証に失敗しました');
    }
  }

  async getAdminProfile(adminId: string): Promise<AdminProfile> {
    return this.validateAdmin(adminId);
  }

  async changePassword(adminId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      const admin = await this.databaseService.prisma.admin.findUnique({
        where: { id: adminId },
      });

      if (!admin) {
        throw new UnauthorizedException('管理者が見つかりません');
      }

      // 現在のパスワードを検証
      const isCurrentPasswordValid = await verifyPassword(currentPassword, admin.password);
      if (!isCurrentPasswordValid) {
        throw new UnauthorizedException('現在のパスワードが正しくありません');
      }

      // 新しいパスワードの強度チェック
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw new BadRequestException(`新しいパスワードが弱すぎます: ${passwordValidation.feedback.join(', ')}`);
      }

      // 現在のパスワードと同じかチェック
      const isSamePassword = await verifyPassword(newPassword, admin.password);
      if (isSamePassword) {
        throw new BadRequestException('新しいパスワードは現在のパスワードと異なる必要があります');
      }

      // 新しいパスワードをハッシュ化
      const hashedNewPassword = await hashPassword(newPassword);

      // パスワードを更新
      await this.databaseService.prisma.admin.update({
        where: { id: adminId },
        data: { password: hashedNewPassword },
      });

      logInfo('Admin password changed successfully', { adminId });
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      logError('Failed to change admin password', error, { adminId });
      throw new BadRequestException('パスワードの変更に失敗しました');
    }
  }
}
