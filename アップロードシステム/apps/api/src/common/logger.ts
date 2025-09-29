import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';

// ログレベル定義
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// ログレベルに応じた色設定
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// winston.addColors(colors); // Winston v3では不要

// ログフォーマット定義
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`),
);

// ファイルローテーション設定
const fileRotateTransport = new DailyRotateFile({
  filename: 'logs/application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxFiles: '14d',
  maxSize: '20m',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
});

// エラーログ専用のファイルローテーション
const errorFileRotateTransport = new DailyRotateFile({
  filename: 'logs/error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxFiles: '30d',
  maxSize: '20m',
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
});

// 環境に応じたトランスポート設定
const transports = [
  // コンソール出力（開発環境）
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' 
      ? winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      : format,
  }),
];

// 本番環境ではファイル出力も追加
if (process.env.NODE_ENV === 'production') {
  transports.push(fileRotateTransport as any);
  transports.push(errorFileRotateTransport as any);
}

// ロガーインスタンス作成
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  transports,
  exitOnError: false,
});

// 開発環境では詳細なログを出力
if (process.env.NODE_ENV !== 'production') {
  logger.debug('Logging initialized at debug level');
}

export default logger;

// 構造化ログ用のヘルパー関数
export const logWithContext = (level: string, message: string, context?: any) => {
  const logData = {
    message,
    ...context,
    timestamp: new Date().toISOString(),
    service: 'advalay-api',
  };
  
  logger.log(level, JSON.stringify(logData));
};

// 各ログレベル用のヘルパー関数
export const logInfo = (message: string, context?: any) => {
  logWithContext('info', message, context);
};

export const logError = (message: string, error?: Error, context?: any) => {
  logWithContext('error', message, {
    ...context,
    error: error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : undefined,
  });
};

export const logWarn = (message: string, context?: any) => {
  logWithContext('warn', message, context);
};

export const logDebug = (message: string, context?: any) => {
  logWithContext('debug', message, context);
};

export const logHttp = (message: string, context?: any) => {
  logWithContext('http', message, context);
};
