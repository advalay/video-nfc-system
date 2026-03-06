import { Amplify } from 'aws-amplify';

export function configureAmplify(): void {
  // 環境変数の確認
  const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
  const userPoolClientId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID;
  const region = process.env.NEXT_PUBLIC_COGNITO_REGION || 'ap-northeast-1';

  if (!userPoolId || !userPoolClientId) {
    throw new Error('Cognito環境変数が設定されていません（NEXT_PUBLIC_COGNITO_USER_POOL_ID, NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID）');
  }

  // Cognito認証設定
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        loginWith: {
          email: true,
        },
      },
    },
  });
}
