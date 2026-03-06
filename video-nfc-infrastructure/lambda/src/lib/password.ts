import { randomBytes } from 'crypto';

export const generateTempPassword = (): string => {
    const length = 16;
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';
    const symbols = '!@#$%^&*';
    const allChars = lowercase + uppercase + digits + symbols;

    // 各文字種から最低1文字を暗号学的に安全な方法で選択
    const guaranteed = [
        lowercase[randomBytes(1)[0] % lowercase.length],
        uppercase[randomBytes(1)[0] % uppercase.length],
        digits[randomBytes(1)[0] % digits.length],
        symbols[randomBytes(1)[0] % symbols.length],
    ];

    // 残りをランダムに生成
    const remaining: string[] = [];
    const bytes = randomBytes(length - guaranteed.length);
    for (let i = 0; i < bytes.length; i++) {
        remaining.push(allChars[bytes[i] % allChars.length]);
    }

    // 結合してFisher-Yatesシャッフル
    const arr = [...guaranteed, ...remaining];
    const shuffleBytes = randomBytes(arr.length);
    for (let i = arr.length - 1; i > 0; i--) {
        const j = shuffleBytes[i] % (i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    return arr.join('');
};
