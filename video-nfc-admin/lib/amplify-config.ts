import { Amplify } from 'aws-amplify';

let configured = false;

function buildConfig() {
  const region = process.env.NEXT_PUBLIC_AWS_REGION || 'ap-northeast-1';
  const userPoolId = process.env.NEXT_PUBLIC_USER_POOL_ID;
  const userPoolClientId = process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID;

  const hasAuth = Boolean(userPoolId && userPoolClientId);

  const base: any = { ssr: true };

  if (hasAuth) {
    base.Auth = {
      Cognito: {
        userPoolId,
        userPoolClientId,
        region,
      },
    };
  } else {
    // 本番環境で未設定だとログイン不可のため警告
    console.warn('Amplify Auth is not configured. Set NEXT_PUBLIC_USER_POOL_ID and NEXT_PUBLIC_USER_POOL_CLIENT_ID.');
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


