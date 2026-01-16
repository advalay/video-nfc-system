'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import Link from 'next/link';

type Step = 'email' | 'code' | 'success';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const { forgotPassword, confirmForgotPassword } = useAuth();
    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSendCode = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!email || !email.includes('@')) {
            toast.error('有効なメールアドレスを入力してください');
            return;
        }

        setIsLoading(true);
        try {
            await forgotPassword(email);
            toast.success('確認コードを送信しました。メールをご確認ください。');
            setStep('code');
        } catch (error: unknown) {
            console.error('Forgot password error:', error);
            let errorMessage = 'エラーが発生しました';
            if (error instanceof Error) {
                if (error.name === 'UserNotFoundException') {
                    errorMessage = 'このメールアドレスは登録されていません';
                } else if (error.name === 'LimitExceededException') {
                    errorMessage = 'リクエストが多すぎます。しばらくしてから再度お試しください';
                } else {
                    errorMessage = error.message;
                }
            }
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!code) {
            toast.error('確認コードを入力してください');
            return;
        }

        if (newPassword.length < 8) {
            toast.error('パスワードは8文字以上で入力してください');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('パスワードが一致しません');
            return;
        }

        setIsLoading(true);
        try {
            await confirmForgotPassword(email, code, newPassword);
            toast.success('パスワードをリセットしました！');
            setStep('success');
        } catch (error: unknown) {
            console.error('Confirm forgot password error:', error);
            let errorMessage = 'エラーが発生しました';
            if (error instanceof Error) {
                if (error.name === 'CodeMismatchException') {
                    errorMessage = '確認コードが正しくありません';
                } else if (error.name === 'ExpiredCodeException') {
                    errorMessage = '確認コードの有効期限が切れています。再度お試しください';
                } else if (error.name === 'InvalidPasswordException') {
                    errorMessage = 'パスワードは英大文字、小文字、数字、記号を含む8文字以上で設定してください';
                } else {
                    errorMessage = error.message;
                }
            }
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-12">
            <div className="w-full max-w-md">
                {/* ロゴ・タイトル */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-lg">
                        <svg
                            className="w-10 h-10 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 7a2 2 0 012 2m4 0a6 6 0 11-12 0 6 6 0 0112 0zm-1 8v.01M12 14l.01-.011M8.5 14a3.5 3.5 0 106.99-.01M11 21h2"
                            />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        パスワードリセット
                    </h1>
                    <p className="text-gray-600">
                        {step === 'email' && 'メールアドレスを入力してください'}
                        {step === 'code' && '確認コードと新しいパスワードを入力してください'}
                        {step === 'success' && 'パスワードのリセットが完了しました'}
                    </p>
                </div>

                {/* カード */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                    {step === 'email' && (
                        <form onSubmit={handleSendCode} className="space-y-5">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                    メールアドレス
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-gray-900 placeholder:text-gray-400"
                                    placeholder="your@email.com"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {isLoading ? '送信中...' : '確認コードを送信'}
                            </button>
                        </form>
                    )}

                    {step === 'code' && (
                        <form onSubmit={handleResetPassword} className="space-y-5">
                            <div>
                                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                                    確認コード
                                </label>
                                <input
                                    id="code"
                                    type="text"
                                    autoComplete="one-time-code"
                                    required
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    disabled={isLoading}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-gray-900 placeholder:text-gray-400"
                                    placeholder="123456"
                                />
                                <p className="mt-1 text-sm text-gray-500">
                                    {email} に送信されたコードを入力してください
                                </p>
                            </div>

                            <div>
                                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                    新しいパスワード
                                </label>
                                <div className="relative">
                                    <input
                                        id="newPassword"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        disabled={isLoading}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed pr-12 text-gray-900 placeholder:text-gray-400"
                                        placeholder="新しいパスワード"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        disabled={isLoading}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
                                    >
                                        {showPassword ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                <p className="mt-1 text-sm text-gray-500">
                                    英大文字、小文字、数字、記号を含む8文字以上
                                </p>
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                    パスワード確認
                                </label>
                                <input
                                    id="confirmPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={isLoading}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-gray-900 placeholder:text-gray-400"
                                    placeholder="パスワードを再入力"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {isLoading ? 'リセット中...' : 'パスワードをリセット'}
                            </button>
                        </form>
                    )}

                    {step === 'success' && (
                        <div className="text-center space-y-4">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-gray-600">
                                新しいパスワードでログインできます。
                            </p>
                            <button
                                onClick={() => router.push('/login')}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
                            >
                                ログインページへ
                            </button>
                        </div>
                    )}

                    {/* ログインへ戻るリンク */}
                    {step !== 'success' && (
                        <div className="mt-6 text-center">
                            <Link href="/login" className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors">
                                ← ログインに戻る
                            </Link>
                        </div>
                    )}
                </div>

                {/* フッター */}
                <p className="mt-8 text-center text-xs text-gray-500">
                    © 2025 動画配信システム. All rights reserved.
                </p>
            </div>
        </div>
    );
}
