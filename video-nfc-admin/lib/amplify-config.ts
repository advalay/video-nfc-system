import { Amplify } from 'aws-amplify';

let configured = false;

function buildConfig() {
  // 認証を完全に無効化（本番環境でも）
  console.log('Disabling Amplify Auth completely');
  return { ssr: true } as any;
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


