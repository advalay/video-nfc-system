import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';
import { Construct } from 'constructs';

export interface StorageStackProps extends cdk.StackProps {
  environment: string;
  accountId: string;
}

export class StorageStack extends cdk.Stack {
  public readonly videoBucket: s3.Bucket;
  public readonly assetBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    const { environment, accountId } = props;

    // 動画保存用S3バケット
    this.videoBucket = new s3.Bucket(this, 'VideoBucket', {
      bucketName: `video-nfc-videos-${environment}-${accountId}`,
      encryption: s3.BucketEncryption.S3_MANAGED, // AES256
      versioned: true,
      objectLockEnabled: environment === 'prod', // dev環境ではObject Lockを無効化
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: environment === 'dev',
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
          ],
          allowedOrigins: ['*'], // 本番環境では適切なオリジンに制限してください
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3000,
        },
      ],
      lifecycleRules: [
        {
          id: 'TransitionToIntelligentTiering',
          enabled: true,
          transitions: [
            {
              storageClass: s3.StorageClass.INTELLIGENT_TIERING,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
        },
      ],
    });

    // オブジェクトロック設定（COMPLIANCE モード、10年保持）
    // 本番環境のみObject Lockを有効化
    if (environment === 'prod') {
      const cfnBucket = this.videoBucket.node.defaultChild as s3.CfnBucket;
      cfnBucket.objectLockConfiguration = {
        objectLockEnabled: 'Enabled',
        rule: {
          defaultRetention: {
            mode: 'COMPLIANCE',
            years: 10,
          },
        },
      };
    }

    // アセット保存用S3バケット（サムネイル、請求書PDF、CloudTrailログ）
    this.assetBucket = new s3.Bucket(this, 'AssetBucket', {
      bucketName: `video-nfc-assets-${environment}-${accountId}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      // CloudFront 標準ログの書き込みにはACLが必要なため、オブジェクト所有権でACLを許可
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: environment === 'dev',
      lifecycleRules: [
        {
          id: 'DeleteCloudFrontLogsAfter30Days',
          enabled: true,
          prefix: 'cloudfront-logs/',
          expiration: cdk.Duration.days(30),
        },
      ],
    });

    // CloudTrail がアセットバケットへログを書き込めるようにポリシー付与
    this.assetBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'AWSCloudTrailAclCheck',
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('cloudtrail.amazonaws.com')],
        actions: ['s3:GetBucketAcl'],
        resources: [this.assetBucket.bucketArn],
      })
    );
    this.assetBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'AWSCloudTrailWrite',
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('cloudtrail.amazonaws.com')],
        actions: ['s3:PutObject'],
        resources: [
          this.assetBucket.arnForObjects(`cloudtrail/AWSLogs/${accountId}/*`),
        ],
        conditions: {
          StringEquals: { 's3:x-amz-acl': 'bucket-owner-full-control' },
        },
      })
    );

    // CloudFront Origin Access Identity
    const oai = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: `OAI for video-nfc-${environment}`,
    });

    // S3バケットポリシー：CloudFrontからのアクセスを許可
    this.videoBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [this.videoBucket.arnForObjects('*')],
        principals: [
          new iam.CanonicalUserPrincipal(
            oai.cloudFrontOriginAccessIdentityS3CanonicalUserId
          ),
        ],
      })
    );

    // Response Headers Policy for CORS and video playback
    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, 'ResponseHeadersPolicy', {
      responseHeadersPolicyName: `video-nfc-${environment}-response-headers`,
      comment: `Response headers policy for video-nfc-${environment} (CORS + Security)`,
      corsConfiguration: {
        accessControlAllowOrigins: ['*'],
        accessControlAllowHeaders: ['*'],
        accessControlAllowMethods: ['GET', 'HEAD', 'OPTIONS'],
        accessControlExposeHeaders: ['ETag', 'Content-Length', 'Content-Range', 'Accept-Ranges'],
        accessControlMaxAgeSec: 600,
        originOverride: true,
      },
      securityHeadersConfiguration: {
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: cloudfront.HeadersFrameOption.SAMEORIGIN, override: true },
        referrerPolicy: {
          referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: true,
        },
        strictTransportSecurity: {
          accessControlMaxAgeSec: 31536000,
          includeSubdomains: true,
          override: true,
        },
        xssProtection: { protection: true, modeBlock: true, override: true },
      },
    });

    // CloudFront Distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: `video-nfc-${environment} distribution`,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessIdentity(this.videoBucket, {
          originAccessIdentity: oai,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: responseHeadersPolicy,
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
      },
      priceClass: cloudfront.PriceClass.PRICE_CLASS_200, // アジア、北米、ヨーロッパ
      // geoRestriction: 設定なし = 制限なし（全世界からアクセス可能）
      enableLogging: true,
      logBucket: this.assetBucket,
      logFilePrefix: 'cloudfront-logs/',
    });

    // CloudTrail設定（prod環境のみ）
    if (environment === 'prod') {
      const trail = new cloudtrail.Trail(this, 'CloudTrail', {
        trailName: `video-nfc-${environment}-trail`,
        bucket: this.assetBucket,
        s3KeyPrefix: 'cloudtrail/',
        includeGlobalServiceEvents: true,
        isMultiRegionTrail: false,
        managementEvents: cloudtrail.ReadWriteType.ALL,
      });

      // S3データイベント記録（動画バケット）- 書き込みのみ
      trail.addS3EventSelector(
        [
          {
            bucket: this.videoBucket,
          },
        ],
        {
          includeManagementEvents: true,
          readWriteType: cloudtrail.ReadWriteType.WRITE_ONLY, // 読み取りログを削除
        }
      );
    }

    // タグ付け
    cdk.Tags.of(this.videoBucket).add('Environment', environment);
    cdk.Tags.of(this.videoBucket).add('Project', 'video-nfc');
    cdk.Tags.of(this.assetBucket).add('Environment', environment);
    cdk.Tags.of(this.assetBucket).add('Project', 'video-nfc');
    cdk.Tags.of(this.distribution).add('Environment', environment);
    cdk.Tags.of(this.distribution).add('Project', 'video-nfc');

    // CloudFormation Outputs
    new cdk.CfnOutput(this, 'VideoBucketName', {
      value: this.videoBucket.bucketName,
      description: '動画保存用S3バケット名',
      exportName: `${environment}-VideoBucketName`,
    });

    new cdk.CfnOutput(this, 'AssetBucketName', {
      value: this.assetBucket.bucketName,
      description: 'アセット保存用S3バケット名',
      exportName: `${environment}-AssetBucketName`,
    });

    new cdk.CfnOutput(this, 'CloudFrontDomain', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront配信ドメイン',
      exportName: `${environment}-CloudFrontDomain`,
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront Distribution ID',
      exportName: `${environment}-CloudFrontDistributionId`,
    });
  }
}

