import { Amplify } from 'aws-amplify';

let configured = false;

function buildConfig() {
  const region = process.env.NEXT_PUBLIC_AWS_REGION || 'ap-northeast-1';
  const userPoolId = process.env.NEXT_PUBLIC_USER_POOL_ID;
  const userPoolClientId = process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID;

  const hasAuth = Boolean(userPoolId && userPoolClientId);
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';

  const base: any = { ssr: true };

  // 強制的に認証を無効化（開発用）
  console.log('Force disabling Amplify Auth for development');
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


