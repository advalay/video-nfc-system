import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export interface DatabaseStackProps extends cdk.StackProps {
  environment: string;
}

export class DatabaseStack extends cdk.Stack {
  public readonly videoMetadataTable: dynamodb.Table;
  public readonly billingTable: dynamodb.Table;
  public readonly organizationTable: dynamodb.Table;
  public readonly shopTable: dynamodb.Table;
  public readonly approvalRequestTable: dynamodb.Table;
  public readonly userShopRelationTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const { environment } = props;

    // Organization（代理店）テーブル
    this.organizationTable = new dynamodb.Table(this, 'OrganizationTable', {
      tableName: `video-nfc-Organization-${environment}`,
      partitionKey: {
        name: 'organizationId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: environment === 'prod', // prod環境のみ有効
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Shop（販売店）テーブル
    this.shopTable = new dynamodb.Table(this, 'ShopTable', {
      tableName: `video-nfc-Shop-${environment}`,
      partitionKey: {
        name: 'shopId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: environment === 'prod', // prod環境のみ有効
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // GSI: organizationId-createdAt-index（代理店配下の販売店一覧）
    this.shopTable.addGlobalSecondaryIndex({
      indexName: 'organizationId-createdAt-index',
      partitionKey: {
        name: 'organizationId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdAt',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // UserShopRelation（ユーザー-販売店関連）テーブル
    this.userShopRelationTable = new dynamodb.Table(this, 'UserShopRelationTable', {
      tableName: `video-nfc-UserShopRelation-${environment}`,
      partitionKey: {
        name: 'userId', // メールアドレス
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'shopId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: environment === 'prod', // prod環境のみ有効
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // GSI1: shopId-userId-index（販売店のユーザー一覧、逆引き用）
    this.userShopRelationTable.addGlobalSecondaryIndex({
      indexName: 'shopId-userId-index',
      partitionKey: {
        name: 'shopId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // VideoMetadata テーブル
    this.videoMetadataTable = new dynamodb.Table(this, 'VideoMetadataTable', {
      tableName: `video-nfc-VideoMetadata-${environment}`,
      partitionKey: {
        name: 'videoId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: environment === 'prod', // prod環境のみ有効
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // GSI1: organizationId-uploadDate-index（代理店の全動画）
    this.videoMetadataTable.addGlobalSecondaryIndex({
      indexName: 'organizationId-uploadDate-index',
      partitionKey: {
        name: 'organizationId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'uploadDate',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI2: shopId-uploadDate-index（販売店の全動画）
    this.videoMetadataTable.addGlobalSecondaryIndex({
      indexName: 'shopId-uploadDate-index',
      partitionKey: {
        name: 'shopId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'uploadDate',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI3: billingMonth-organizationId-index（請求月×代理店で集計）
    this.videoMetadataTable.addGlobalSecondaryIndex({
      indexName: 'billingMonth-organizationId-index',
      partitionKey: {
        name: 'billingMonth',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'organizationId',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI4: organizationId-billingMonth-index（代理店の月別請求）
    this.videoMetadataTable.addGlobalSecondaryIndex({
      indexName: 'organizationId-billingMonth-index',
      partitionKey: {
        name: 'organizationId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'billingMonth',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Billing（請求）テーブル
    this.billingTable = new dynamodb.Table(this, 'BillingTable', {
      tableName: `video-nfc-Billing-${environment}`,
      partitionKey: {
        name: 'billingId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'organizationId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: environment === 'prod', // prod環境のみ有効
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // ApprovalRequest（承認申請）テーブル
    this.approvalRequestTable = new dynamodb.Table(this, 'ApprovalRequestTable', {
      tableName: `video-nfc-ApprovalRequest-${environment}`,
      partitionKey: {
        name: 'requestId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: environment === 'prod', // prod環境のみ有効
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'expiresAt', // 自動削除（30日後）
    });

    // GSI1: approverEmail-status-index（承認者の承認待ち一覧）
    this.approvalRequestTable.addGlobalSecondaryIndex({
      indexName: 'approverEmail-status-index',
      partitionKey: {
        name: 'approverEmail',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'status',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI2: status-createdAt-index（ステータス別の申請一覧）
    this.approvalRequestTable.addGlobalSecondaryIndex({
      indexName: 'status-createdAt-index',
      partitionKey: {
        name: 'status',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdAt',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI1: organizationId-billingMonth-index（代理店の請求履歴）
    this.billingTable.addGlobalSecondaryIndex({
      indexName: 'organizationId-billingMonth-index',
      partitionKey: {
        name: 'organizationId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'billingMonth',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI2: billingMonth-status-index（月別の請求状況）
    this.billingTable.addGlobalSecondaryIndex({
      indexName: 'billingMonth-status-index',
      partitionKey: {
        name: 'billingMonth',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'status',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // タグ付け
    cdk.Tags.of(this.organizationTable).add('Environment', environment);
    cdk.Tags.of(this.organizationTable).add('Project', 'video-nfc');
    cdk.Tags.of(this.shopTable).add('Environment', environment);
    cdk.Tags.of(this.shopTable).add('Project', 'video-nfc');
    cdk.Tags.of(this.userShopRelationTable).add('Environment', environment);
    cdk.Tags.of(this.userShopRelationTable).add('Project', 'video-nfc');
    cdk.Tags.of(this.videoMetadataTable).add('Environment', environment);
    cdk.Tags.of(this.videoMetadataTable).add('Project', 'video-nfc');
    cdk.Tags.of(this.billingTable).add('Environment', environment);
    cdk.Tags.of(this.billingTable).add('Project', 'video-nfc');
    cdk.Tags.of(this.approvalRequestTable).add('Environment', environment);
    cdk.Tags.of(this.approvalRequestTable).add('Project', 'video-nfc');

    // CloudFormation Outputs
    new cdk.CfnOutput(this, 'OrganizationTableName', {
      value: this.organizationTable.tableName,
      description: 'Organization DynamoDBテーブル名',
      exportName: `${environment}-OrganizationTableName`,
    });

    new cdk.CfnOutput(this, 'ShopTableName', {
      value: this.shopTable.tableName,
      description: 'Shop DynamoDBテーブル名',
      exportName: `${environment}-ShopTableName`,
    });

    new cdk.CfnOutput(this, 'VideoMetadataTableName', {
      value: this.videoMetadataTable.tableName,
      description: 'VideoMetadata DynamoDBテーブル名',
      exportName: `${environment}-VideoMetadataTableName`,
    });

    new cdk.CfnOutput(this, 'BillingTableName', {
      value: this.billingTable.tableName,
      description: 'Billing DynamoDBテーブル名',
      exportName: `${environment}-BillingTableName`,
    });

    new cdk.CfnOutput(this, 'VideoMetadataTableStreamArn', {
      value: this.videoMetadataTable.tableStreamArn || '',
      description: 'VideoMetadataテーブルのストリームARN',
      exportName: `${environment}-VideoMetadataTableStreamArn`,
    });

    new cdk.CfnOutput(this, 'ApprovalRequestTableName', {
      value: this.approvalRequestTable.tableName,
      description: 'ApprovalRequest DynamoDBテーブル名',
      exportName: `${environment}-ApprovalRequestTableName`,
    });

    new cdk.CfnOutput(this, 'UserShopRelationTableName', {
      value: this.userShopRelationTable.tableName,
      description: 'UserShopRelation DynamoDBテーブル名',
      exportName: `${environment}-UserShopRelationTableName`,
    });
  }
}

