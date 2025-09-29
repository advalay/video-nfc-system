import { IsString, IsNotEmpty, Length, IsEmail, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateStoreDto {
  @IsString({ message: '企業名は文字列である必要があります' })
  @IsNotEmpty({ message: '企業名は必須です' })
  @Length(1, 100, { message: '企業名は1文字以上100文字以下である必要があります' })
  @Transform(({ value }) => value?.trim())
  companyName: string;

  @IsString({ message: '店舗名は文字列である必要があります' })
  @IsNotEmpty({ message: '店舗名は必須です' })
  @Length(1, 100, { message: '店舗名は1文字以上100文字以下である必要があります' })
  @Transform(({ value }) => value?.trim())
  storeName: string;

  @IsString({ message: '担当者名は文字列である必要があります' })
  @IsNotEmpty({ message: '担当者名は必須です' })
  @Length(1, 50, { message: '担当者名は1文字以上50文字以下である必要があります' })
  @Transform(({ value }) => value?.trim())
  contactName: string;

  @IsEmail({}, { message: '有効なメールアドレスを入力してください' })
  @IsNotEmpty({ message: '担当者メールアドレスは必須です' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  contactEmail: string;

  @IsOptional()
  @IsString({ message: 'YouTubeチャンネル名は文字列である必要があります' })
  @Length(1, 100, { message: 'YouTubeチャンネル名は1文字以上100文字以下である必要があります' })
  @Transform(({ value }) => value?.trim())
  youtubeChannelName?: string;
}

export class UpdateStoreDto {
  @IsOptional()
  @IsString({ message: '店舗名は文字列である必要があります' })
  @Length(1, 100, { message: '店舗名は1文字以上100文字以下である必要があります' })
  @Transform(({ value }) => value?.trim())
  storeName?: string;

  @IsOptional()
  @IsString({ message: '担当者名は文字列である必要があります' })
  @Length(1, 50, { message: '担当者名は1文字以上50文字以下である必要があります' })
  @Transform(({ value }) => value?.trim())
  contactName?: string;

  @IsOptional()
  @IsEmail({}, { message: '有効なメールアドレスを入力してください' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  contactEmail?: string;

  @IsOptional()
  @IsEmail({}, { message: '有効なメールアドレスを入力してください' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  notifyEmail?: string;

  @IsOptional()
  @IsString({ message: 'YouTubeチャンネル名は文字列である必要があります' })
  @Length(1, 100, { message: 'YouTubeチャンネル名は1文字以上100文字以下である必要があります' })
  @Transform(({ value }) => value?.trim())
  youtubeChannelName?: string;

  @IsOptional()
  @IsBoolean({ message: '有効フラグは真偽値である必要があります' })
  enabled?: boolean;
}

export class RegenerateTokenDto {
  @IsOptional()
  @IsString({ message: '年月は文字列である必要があります' })
  @Length(6, 6, { message: '年月は6桁（YYYYMM形式）である必要があります' })
  @Transform(({ value }) => value?.trim())
  yearMonth?: string;
}

export class GoogleFormSubmissionDto {
  @IsString({ message: '企業名は文字列である必要があります' })
  @IsNotEmpty({ message: '企業名は必須です' })
  companyName: string;

  @IsString({ message: '店舗名は文字列である必要があります' })
  @IsNotEmpty({ message: '店舗名は必須です' })
  storeName: string;

  @IsString({ message: '担当者名は文字列である必要があります' })
  @IsNotEmpty({ message: '担当者名は必須です' })
  contactName: string;

  @IsEmail({}, { message: '有効なメールアドレスを入力してください' })
  @IsNotEmpty({ message: '担当者メールアドレスは必須です' })
  contactEmail: string;

  @IsOptional()
  @IsString({ message: 'YouTubeチャンネル名は文字列である必要があります' })
  youtubeChannelName?: string;

  @IsOptional()
  @IsString({ message: 'フォーム送信IDは文字列である必要があります' })
  formSubmissionId?: string;
}

