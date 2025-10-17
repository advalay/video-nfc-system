import { Amplify } from 'aws-amplify';

// Amplify設定（必要に応じて環境変数から上書き）
const amplifyConfig = {
  ssr: true,
};

let configured = false;

export function configureAmplify(): void {
  if (configured) return;
  try {
    // 型の厳格さを避けるため最小構成をキャスト
    Amplify.configure(amplifyConfig as any);
    configured = true;
  } catch (error) {
    // 実行環境により未設定でも問題ないためログのみ
    console.error('Amplify configure error:', error);
  }
}


