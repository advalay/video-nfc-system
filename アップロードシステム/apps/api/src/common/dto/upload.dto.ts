import { IsString, IsNotEmpty, Length, Matches, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class UploadDto {
  @IsString({ message: 'タイトルは文字列である必要があります' })
  @IsNotEmpty({ message: 'タイトルは必須です' })
  @Length(1, 100, { message: 'タイトルは1文字以上100文字以下である必要があります' })
  @Transform(({ value }) => value?.trim())
  title: string;

  @IsString({ message: 'シリアル番号は文字列である必要があります' })
  @IsNotEmpty({ message: 'シリアル番号は必須です' })
  @Length(1, 50, { message: 'シリアル番号は1文字以上50文字以下である必要があります' })
  @Matches(/^[A-Za-z0-9\-_]+$/, { 
    message: 'シリアル番号は英数字、ハイフン、アンダースコアのみ使用できます' 
  })
  @Transform(({ value }) => value?.trim())
  serialNo: string;

  @IsOptional()
  @IsString({ message: 'ファイル名は文字列である必要があります' })
  @Transform(({ value }) => value?.trim())
  fileName?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  fileSize?: number;
}

export class OAuthStartDto {
  @IsString({ message: 'ストアIDは文字列である必要があります' })
  @IsNotEmpty({ message: 'ストアIDは必須です' })
  @Length(1, 50, { message: 'ストアIDは1文字以上50文字以下である必要があります' })
  @Matches(/^[A-Za-z0-9\-_]+$/, { 
    message: 'ストアIDは英数字、ハイフン、アンダースコアのみ使用できます' 
  })
  @Transform(({ value }) => value?.trim())
  storeId: string;
}

export class OAuthCallbackDto {
  @IsString({ message: '認証コードは文字列である必要があります' })
  @IsNotEmpty({ message: '認証コードは必須です' })
  @Length(10, 200, { message: '認証コードは10文字以上200文字以下である必要があります' })
  @Transform(({ value }) => value?.trim())
  code: string;

  @IsString({ message: 'ステートは文字列である必要があります' })
  @IsNotEmpty({ message: 'ステートは必須です' })
  @Length(10, 100, { message: 'ステートは10文字以上100文字以下である必要があります' })
  @Transform(({ value }) => value?.trim())
  state: string;
}

