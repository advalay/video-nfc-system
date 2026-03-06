import { z } from 'zod';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getCorsHeaders } from './errorHandler';

// 共通バリデーション
const emailSchema = z.string().email('メールアドレスの形式が不正です').max(254);
const organizationIdSchema = z.string().regex(
  /^org-(agency|store)-[a-f0-9]{8}$/,
  '組織IDの形式が不正です'
);

// 組織作成スキーマ
export const createOrganizationSchema = z.object({
  organizationType: z.enum(['agency', 'store'], {
    errorMap: () => ({ message: '組織タイプが不正です（"agency" または "store" を指定してください）' }),
  }),
  organizationName: z.string().min(1, '組織名は必須です').max(200, '組織名は200文字以内で入力してください'),
  email: emailSchema,
  parentId: z.string().max(100).optional().nullable(),
  phone: z.string().max(20, '電話番号は20文字以内で入力してください').optional().default(''),
  address: z.string().max(500, '住所は500文字以内で入力してください').optional().default(''),
  contactphone: z.string().max(20).optional().default(''),
  unitPrice: z.number().int().min(0).max(1000000).optional().default(1200),
}).refine(
  (data) => data.organizationType !== 'store' || !!data.parentId,
  { message: '販売店にはparentId（親組織ID）が必須です', path: ['parentId'] }
);

// 組織＋ユーザー作成スキーマ
export const createOrganizationWithUserSchema = z.object({
  organizationType: z.enum(['agency', 'store'], {
    errorMap: () => ({ message: '組織タイプが不正です（"agency" または "store" を指定してください）' }),
  }),
  organizationName: z.string().min(1, '組織名は必須です').max(200, '組織名は200文字以内で入力してください'),
  email: emailSchema,
  parentId: z.string().max(100).optional().nullable(),
  phone: z.string().max(20).optional().default(''),
  address: z.string().max(500).optional().default(''),
  unitPrice: z.number().int().min(0).max(1000000).optional().default(1200),
}).refine(
  (data) => data.organizationType !== 'store' || !!data.parentId,
  { message: '販売店にはparentId（親組織ID）が必須です', path: ['parentId'] }
);

// 販売店作成スキーマ
export const createShopSchema = z.object({
  shopName: z.string().min(1, '販売店名は必須です').max(200, '販売店名は200文字以内で入力してください'),
  organizationId: z.string().min(1, '組織IDは必須です').max(100),
  email: emailSchema,
  contactPerson: z.string().min(1, '担当者名は必須です').max(100, '担当者名は100文字以内で入力してください'),
  contactEmail: z.string().email('連絡先メールアドレスの形式が不正です').max(254).optional().default(''),
  contactPhone: z.string().max(20, '電話番号は20文字以内で入力してください').optional().default(''),
});

// 組織更新スキーマ
export const updateOrganizationSchema = z.object({
  organizationName: z.string().min(1).max(200).optional(),
  contactPerson: z.string().max(100).optional(),
  contactEmail: z.string().email('メールアドレスの形式が不正です').max(254).optional(),
  contactphone: z.string().max(20).optional(),
  billingAddress: z.string().max(500).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  unitPrice: z.number().int().min(0).max(1000000).optional(),
});

// 販売店更新スキーマ
export const updateShopSchema = z.object({
  shopName: z.string().min(1).max(200).optional(),
  contactPerson: z.string().max(100).optional(),
  contactEmail: z.string().email('メールアドレスの形式が不正です').max(254).optional(),
  contactPhone: z.string().max(20).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});

// パスパラメータのorganizationIdバリデーション
export const validateOrganizationId = (organizationId: string): boolean => {
  return organizationIdSchema.safeParse(organizationId).success;
};

// リクエストボディのパース＋バリデーション
export const parseBody = <T>(
  schema: z.ZodType<T>,
  event: APIGatewayProxyEvent
): { success: true; data: T } | { success: false; response: APIGatewayProxyResult } => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(event.body || '{}');
  } catch {
    return {
      success: false,
      response: {
        statusCode: 400,
        headers: getCorsHeaders(event),
        body: JSON.stringify({
          success: false,
          error: 'リクエストボディのJSON形式が不正です',
        }),
      },
    };
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    const messages = result.error.errors.map((e) => e.message);
    return {
      success: false,
      response: {
        statusCode: 400,
        headers: getCorsHeaders(event),
        body: JSON.stringify({
          success: false,
          error: 'バリデーションエラー',
          details: messages,
        }),
      },
    };
  }

  return { success: true, data: result.data };
};
