import * as bcrypt from 'bcrypt';

/**
 * パスワードのセキュリティレベルをチェック
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  // 長さチェック
  if (password.length < 8) {
    feedback.push('パスワードは8文字以上である必要があります');
  } else if (password.length >= 12) {
    score += 2;
  } else {
    score += 1;
  }

  // 小文字チェック
  if (!/[a-z]/.test(password)) {
    feedback.push('小文字を含む必要があります');
  } else {
    score += 1;
  }

  // 大文字チェック
  if (!/[A-Z]/.test(password)) {
    feedback.push('大文字を含む必要があります');
  } else {
    score += 1;
  }

  // 数字チェック
  if (!/\d/.test(password)) {
    feedback.push('数字を含む必要があります');
  } else {
    score += 1;
  }

  // 記号チェック
  if (!/[@$!%*?&]/.test(password)) {
    feedback.push('記号（@$!%*?&）を含む必要があります');
  } else {
    score += 1;
  }

  // 連続文字チェック
  if (/(.)\1{2,}/.test(password)) {
    feedback.push('同じ文字が3回以上連続しないでください');
    score -= 1;
  }

  // 一般的なパスワードチェック
  const commonPasswords = [
    'password', '123456', 'admin', 'qwerty', 'letmein',
    'welcome', 'monkey', 'dragon', 'master', 'hello'
  ];
  
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    feedback.push('一般的なパスワードは避けてください');
    score -= 2;
  }

  return {
    isValid: feedback.length === 0 && score >= 4,
    score: Math.max(0, score),
    feedback
  };
}

/**
 * セキュアなパスワードを生成
 */
export function generateSecurePassword(length: number = 16): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '@$!%*?&';
  
  const allChars = lowercase + uppercase + numbers + symbols;
  
  let password = '';
  
  // 最低要件を満たす文字を1つずつ追加
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // 残りの文字をランダムに追加
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // パスワードをシャッフル
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * パスワードをハッシュ化
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12; // セキュリティ強化のため12ラウンド
  return bcrypt.hash(password, saltRounds);
}

/**
 * パスワードを検証
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * パスワードの強度レベルを取得
 */
export function getPasswordStrengthLevel(score: number): {
  level: 'weak' | 'medium' | 'strong' | 'very-strong';
  color: string;
  message: string;
} {
  if (score < 3) {
    return { level: 'weak', color: 'red', message: '弱い' };
  } else if (score < 5) {
    return { level: 'medium', color: 'orange', message: '普通' };
  } else if (score < 7) {
    return { level: 'strong', color: 'green', message: '強い' };
  } else {
    return { level: 'very-strong', color: 'blue', message: '非常に強い' };
  }
}
