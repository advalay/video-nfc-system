import { Amplify } from 'aws-amplify';

export function configureAmplify(): void {
  // Cognito認証設定
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'ap-northeast-1_gtvMJ70ot',
        userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID || '6o0knadh7s8v164r6a8kvp7m0n',
        loginWith: {
          email: true,
        },
      },
    },
  });
}
