import { Amplify } from 'aws-amplify';

export function configureAmplify(): void {
  // Mock modeの場合は設定をスキップ
  if (process.env.NEXT_PUBLIC_AUTH_MODE === 'mock') {
    return;
  }

  // Cognito認証設定
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
        userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID || '',
        loginWith: {
          email: true,
        },
      },
    },
  });
}
