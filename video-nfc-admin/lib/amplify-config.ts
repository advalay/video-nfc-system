import { Amplify } from 'aws-amplify';

export function configureAmplify(): void {
  // 環境変数の確認
  const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
  const userPoolClientId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID;
  const region = process.env.NEXT_PUBLIC_COGNITO_REGION || 'ap-northeast-1';

  console.log('Amplify Configuration:', {
    userPoolId,
    userPoolClientId,
    region,
  });

  // Cognito認証設定
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: userPoolId || 'ap-northeast-1_tRsVTmwXn',
        userPoolClientId: userPoolClientId || '55qo2n0meafpoop59indgeejq4',
        loginWith: {
          email: true,
        },
      },
    },
  });
}
