import { Amplify } from 'aws-amplify';

let configured = false;

function buildConfig() {
  const region = process.env.NEXT_PUBLIC_AWS_REGION || 'ap-northeast-1';
  const userPoolId = process.env.NEXT_PUBLIC_USER_POOL_ID;
  const userPoolClientId = process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID;

  const hasAuth = Boolean(userPoolId && userPoolClientId);
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';

  const base: any = { ssr: true };

  // 開発環境では認証を無効化
  if (hasAuth && !isDevelopment) {
    base.Auth = {
      Cognito: {
        userPoolId,
        userPoolClientId,
        region,
      },
    };
  } else if (!isDevelopment) {
    // 本番環境で未設定だとログイン不可のため警告
    console.warn('Amplify Auth is not configured. Set NEXT_PUBLIC_USER_POOL_ID and NEXT_PUBLIC_USER_POOL_CLIENT_ID.');
  } else {
    console.log('Development mode: Amplify Auth disabled');
  }

  return base;
}

export function configureAmplify(): void {
  if (configured) return;
  try {
    const config = buildConfig();
    Amplify.configure(config);
    configured = true;
  } catch (error) {
    console.error('Amplify configure error:', error);
  }
}


