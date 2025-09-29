import { IsString, IsOptional, IsEnum, IsEmail, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccountStatus, ChannelStatus } from '@prisma/client';

export class CreateGoogleAccountDto {
  @ApiProperty({ example: 'store_123', description: '店舗ID' })
  @IsString({ message: '店舗IDは文字列である必要があります' })
  storeId: string;

  @ApiProperty({ example: 'user@gmail.com', description: 'Googleアカウントのメールアドレス' })
  @IsEmail({}, { message: '有効なメールアドレスを入力してください' })
  googleEmail: string;
}

export class OAuthCallbackDto {
  @ApiProperty({ example: 'store_123', description: '店舗ID' })
  @IsString({ message: '店舗IDは文字列である必要があります' })
  storeId: string;

  @ApiProperty({ example: 'auth_code_123', description: 'OAuth認証コード' })
  @IsString({ message: '認証コードは文字列である必要があります' })
  code: string;

  @ApiProperty({ example: 'state_123', description: 'OAuth state' })
  @IsString({ message: 'stateは文字列である必要があります' })
  state: string;
}

export class UpdateAccountStatusDto {
  @ApiProperty({ 
    example: 'ACTIVE', 
    description: 'アカウントステータス',
    enum: AccountStatus 
  })
  @IsEnum(AccountStatus, { message: '有効なステータスを選択してください' })
  status: AccountStatus;

  @ApiProperty({ example: 'エラーメッセージ', description: 'エラーメッセージ', required: false })
  @IsOptional()
  @IsString({ message: 'エラーメッセージは文字列である必要があります' })
  errorMessage?: string;
}

export class CreateYouTubeChannelDto {
  @ApiProperty({ example: 'google_account_123', description: 'GoogleアカウントID' })
  @IsString({ message: 'GoogleアカウントIDは文字列である必要があります' })
  googleAccountId: string;

  @ApiProperty({ example: 'UCxxxxxxxxxxxxxxxxxxxxx', description: 'YouTubeチャンネルID' })
  @IsString({ message: 'YouTubeチャンネルIDは文字列である必要があります' })
  channelId: string;

  @ApiProperty({ example: 'マイチャンネル', description: 'チャンネルタイトル' })
  @IsString({ message: 'チャンネルタイトルは文字列である必要があります' })
  channelTitle: string;

  @ApiProperty({ example: 'https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxx', description: 'チャンネルURL', required: false })
  @IsOptional()
  @IsUrl({}, { message: '有効なURLを入力してください' })
  channelUrl?: string;

  @ApiProperty({ example: 'https://yt3.ggpht.com/...', description: 'チャンネルサムネイルURL', required: false })
  @IsOptional()
  @IsUrl({}, { message: '有効なURLを入力してください' })
  thumbnailUrl?: string;
}

export class UpdateChannelStatusDto {
  @ApiProperty({ 
    example: 'ACTIVE', 
    description: 'チャンネルステータス',
    enum: ChannelStatus 
  })
  @IsEnum(ChannelStatus, { message: '有効なステータスを選択してください' })
  status: ChannelStatus;
}

export class GoogleAccountResponse {
  @ApiProperty({ example: 'google_account_123', description: 'GoogleアカウントID' })
  id: string;

  @ApiProperty({ example: 'store_123', description: '店舗ID' })
  storeId: string;

  @ApiProperty({ example: 'user@gmail.com', description: 'Googleアカウントのメールアドレス' })
  googleEmail: string;

  @ApiProperty({ example: 'google_user_123', description: 'Google User ID' })
  googleUserId: string;

  @ApiProperty({ example: 'ACTIVE', description: 'アカウントステータス', enum: AccountStatus })
  status: AccountStatus;

  @ApiProperty({ example: '2025-09-29T12:00:00Z', description: 'トークン有効期限' })
  tokenExpiresAt: Date;

  @ApiProperty({ example: '2025-09-29T11:00:00Z', description: '最後にトークンを更新した日時', required: false })
  lastTokenRefresh?: Date;

  @ApiProperty({ example: 'エラーメッセージ', description: 'エラーメッセージ', required: false })
  errorMessage?: string;

  @ApiProperty({ example: '2025-09-29T10:00:00Z', description: '作成日時' })
  createdAt: Date;

  @ApiProperty({ example: '2025-09-29T11:00:00Z', description: '更新日時' })
  updatedAt: Date;
}

export class YouTubeChannelResponse {
  @ApiProperty({ example: 'channel_123', description: 'チャンネルID' })
  id: string;

  @ApiProperty({ example: 'google_account_123', description: 'GoogleアカウントID' })
  googleAccountId: string;

  @ApiProperty({ example: 'UCxxxxxxxxxxxxxxxxxxxxx', description: 'YouTubeチャンネルID' })
  channelId: string;

  @ApiProperty({ example: 'マイチャンネル', description: 'チャンネルタイトル' })
  channelTitle: string;

  @ApiProperty({ example: 'https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxx', description: 'チャンネルURL', required: false })
  channelUrl?: string;

  @ApiProperty({ example: 'https://yt3.ggpht.com/...', description: 'チャンネルサムネイルURL', required: false })
  thumbnailUrl?: string;

  @ApiProperty({ example: 1000, description: '登録者数', required: false })
  subscriberCount?: number;

  @ApiProperty({ example: 'ACTIVE', description: 'チャンネルステータス', enum: ChannelStatus })
  status: ChannelStatus;

  @ApiProperty({ example: '2025-09-29T11:00:00Z', description: '最後に同期した日時', required: false })
  lastSyncedAt?: Date;

  @ApiProperty({ example: '2025-09-29T10:00:00Z', description: '作成日時' })
  createdAt: Date;

  @ApiProperty({ example: '2025-09-29T11:00:00Z', description: '更新日時' })
  updatedAt: Date;
}
