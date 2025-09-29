import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminLoginDto {
  @ApiProperty({ 
    description: '管理者メールアドレス',
    example: 'admin@advalay.com'
  })
  @IsEmail({}, { message: '有効なメールアドレスを入力してください' })
  email: string;

  @ApiProperty({ 
    description: 'パスワード',
    example: 'SecurePass123!'
  })
  @IsString()
  password: string;
}

export class AdminRegisterDto {
  @ApiProperty({ 
    description: '管理者メールアドレス',
    example: 'admin@advalay.com'
  })
  @IsEmail({}, { message: '有効なメールアドレスを入力してください' })
  email: string;

  @ApiProperty({ 
    description: 'セキュアなパスワード（8文字以上、大文字・小文字・数字・記号を含む）',
    example: 'SecurePass123!',
    minLength: 8,
    maxLength: 128
  })
  @IsString()
  @MinLength(8, { message: 'パスワードは8文字以上である必要があります' })
  @MaxLength(128, { message: 'パスワードは128文字以下である必要があります' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    { 
      message: 'パスワードは大文字・小文字・数字・記号（@$!%*?&）を含む必要があります' 
    }
  )
  password: string;

  @ApiProperty({ 
    description: '管理者名',
    example: 'システム管理者'
  })
  @IsString()
  @MinLength(1, { message: '管理者名を入力してください' })
  @MaxLength(100, { message: '管理者名は100文字以下である必要があります' })
  name: string;

  @ApiProperty({ 
    description: '管理者権限',
    example: 'admin',
    enum: ['admin', 'super_admin'],
    required: false
  })
  @IsOptional()
  @IsString()
  @Matches(/^(admin|super_admin)$/, { message: '権限はadminまたはsuper_adminである必要があります' })
  role?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ 
    description: '現在のパスワード',
    example: 'CurrentPass123!'
  })
  @IsString()
  currentPassword: string;

  @ApiProperty({ 
    description: '新しいセキュアなパスワード（8文字以上、大文字・小文字・数字・記号を含む）',
    example: 'NewSecurePass123!',
    minLength: 8,
    maxLength: 128
  })
  @IsString()
  @MinLength(8, { message: 'パスワードは8文字以上である必要があります' })
  @MaxLength(128, { message: 'パスワードは128文字以下である必要があります' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    { 
      message: 'パスワードは大文字・小文字・数字・記号（@$!%*?&）を含む必要があります' 
    }
  )
  newPassword: string;
}
