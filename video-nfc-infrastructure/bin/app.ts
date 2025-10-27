#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VideoNfcStack } from '../lib/video-nfc-stack';
import { StorageStack } from '../lib/storage-stack';
import { DatabaseStack } from '../lib/database-stack';
import { AuthStack } from '../lib/auth-stack';
import { ApiStack } from '../lib/api-stack';
import { MonitoringStack } from '../lib/monitoring-stack';
import * as dotenv from 'dotenv';

// 環境変数の読み込み
dotenv.config();

const app = new cdk.App();

// 環境変数から設定を取得
const environment = process.env.ENV || 'dev';
const accountId = process.env.AWS_ACCOUNT_ID || process.env.CDK_DEFAULT_ACCOUNT || '';
const region = process.env.AWS_REGION || 'ap-northeast-1';

if (!accountId) {
  throw new Error('AWS_ACCOUNT_ID環境変数を設定してください');
}

// 共通のStack Props
const commonProps = {
  env: {
    account: accountId,
    region: region,
  },
  environment,
  accountId,
};

// Storage Stack（S3、CloudFront）
const storageStack = new StorageStack(app, `VideoNfcStorageStack-${environment}`, {
  ...commonProps,
  stackName: `video-nfc-storage-${environment}`,
  description: `NFCタグ付きキーホルダー向け動画配信システム - ストレージスタック (${environment})`,
});

// Database Stack（DynamoDB）
const databaseStack = new DatabaseStack(app, `VideoNfcDatabaseStack-${environment}`, {
  ...commonProps,
  stackName: `video-nfc-database-${environment}`,
  description: `NFCタグ付きキーホルダー向け動画配信システム - データベーススタック (${environment})`,
});

// Auth Stack（Cognito）
const authStack = new AuthStack(app, `VideoNfcAuthStack-${environment}`, {
  ...commonProps,
  stackName: `video-nfc-auth-${environment}`,
  description: `NFCタグ付きキーホルダー向け動画配信システム - 認証スタック (${environment})`,
});

// Main Stack（Lambda実行ロールなど）
const mainStack = new VideoNfcStack(app, `VideoNfcMainStack-${environment}`, {
  ...commonProps,
  stackName: `video-nfc-main-${environment}`,
  description: `NFCタグ付きキーホルダー向け動画配信システム - メインスタック (${environment})`,
});

// スタック間の依存関係
mainStack.addDependency(storageStack);
mainStack.addDependency(databaseStack);
mainStack.addDependency(authStack);

// Monitoring Stack（CloudWatch Alarms、SNS、Dashboard）
// アラート送信先メールアドレスを環境変数から取得
const alertEmail = process.env.ALERT_EMAIL || 'admin@example.com';

const monitoringStack = new MonitoringStack(app, `VideoNfcMonitoringStack-${environment}`, {
  ...commonProps,
  stackName: `video-nfc-monitoring-${environment}`,
  description: `NFCタグ付きキーホルダー向け動画配信システム - 監視スタック (${environment})`,
  lambdaFunctions: [], // 後で更新
  apiGatewayId: '', // 後で更新
  alertEmail: alertEmail,
});

monitoringStack.addDependency(storageStack);
monitoringStack.addDependency(authStack);
monitoringStack.addDependency(databaseStack);

// API Stack（API Gateway + Lambda）
// MonitoringStackのSNSトピックARNを渡す
const apiStack = new ApiStack(app, `VideoNfcApiStack-${environment}`, {
  ...commonProps,
  stackName: `video-nfc-api-${environment}`,
  description: `NFCタグ付きキーホルダー向け動画配信システム - APIスタック (${environment})`,
  videoBucket: storageStack.videoBucket,
  assetBucket: storageStack.assetBucket,
  userPoolId: authStack.userPool.userPoolId,
  userPoolClientId: authStack.userPoolClient.userPoolClientId,
  videoMetadataTableName: databaseStack.videoMetadataTable.tableName,
  billingTableName: databaseStack.billingTable.tableName,
  organizationTableName: databaseStack.organizationTable.tableName,
  shopTableName: databaseStack.shopTable.tableName,
  approvalRequestTableName: databaseStack.approvalRequestTable.tableName,
  userShopRelationTableName: databaseStack.userShopRelationTable.tableName,
  cloudFrontDomain: storageStack.distribution.distributionDomainName,
  snsTopicArn: monitoringStack.alertTopic.topicArn,
});

apiStack.addDependency(storageStack);
apiStack.addDependency(authStack);
apiStack.addDependency(databaseStack);
apiStack.addDependency(monitoringStack);

// MonitoringStackは簡略化されたバージョンを使用

// グローバルタグ
cdk.Tags.of(app).add('Environment', environment);
cdk.Tags.of(app).add('Project', 'video-nfc');
cdk.Tags.of(app).add('ManagedBy', 'CDK');

app.synth();

