import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as logs from 'aws-cdk-lib/aws-logs';

export interface ApiStackProps extends cdk.StackProps {
  environment: string;
  accountId: string;
  videoBucket: s3.IBucket;
  assetBucket: s3.IBucket;
  userPoolId: string;
  userPoolClientId: string;
  videoMetadataTableName: string;
  billingTableName: string;
  organizationTableName: string;
  shopTableName: string;
  approvalRequestTableName: string;
  cloudFrontDomain: string;
  snsTopicArn?: string;
}

export class ApiStack extends cdk.Stack {
  public readonly restApi: apigateway.RestApi;
  public readonly lambdaFunctions: lambda.Function[] = [];

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const {
      environment,
      accountId,
      videoBucket,
      assetBucket,
      userPoolId,
      userPoolClientId,
      videoMetadataTableName,
      billingTableName,
      organizationTableName,
      shopTableName,
      approvalRequestTableName,
      cloudFrontDomain,
      snsTopicArn,
    } = props;

    // 共通の環境変数
    const commonEnvironment = {
      S3_BUCKET_NAME: videoBucket.bucketName,
      ASSETS_BUCKET_NAME: assetBucket.bucketName,
      DYNAMODB_TABLE_VIDEO: videoMetadataTableName,
      DYNAMODB_TABLE_BILLING: billingTableName,
      DYNAMODB_TABLE_ORGANIZATION: organizationTableName,
      DYNAMODB_TABLE_SHOP: shopTableName,
      DYNAMODB_TABLE_APPROVAL_REQUEST: approvalRequestTableName,
      CLOUDFRONT_DOMAIN: cloudFrontDomain,
      COGNITO_USER_POOL_ID: userPoolId,
      SNS_TOPIC_ARN: snsTopicArn || '',
      FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3001',
      ENVIRONMENT: environment,
    };

    // Lambda関数: generateUploadUrl
    const generateUploadUrlFn = new lambda.Function(this, 'GenerateUploadUrlFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('services/generate-upload-url'),
      memorySize: 512,
      timeout: cdk.Duration.seconds(29),
      environment: commonEnvironment,
      description: 'Generate pre-signed URL for video upload',
    });

    // Lambda関数: listVideos
    const listVideosFn = new lambda.Function(this, 'ListVideosFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('services/list-videos'),
      memorySize: 512,
      timeout: cdk.Duration.seconds(29),
      environment: commonEnvironment,
      description: 'List videos with pagination and search',
    });

    // Lambda関数: getVideoDetail
    const getVideoDetailFn = new lambda.Function(this, 'GetVideoDetailFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('services/get-video-detail'),
      memorySize: 512,
      timeout: cdk.Duration.seconds(29),
      environment: commonEnvironment,
      description: 'Get video detail (authenticated)',
    });

    // Lambda関数: deleteVideo
    const deleteVideoFn = new lambda.Function(this, 'DeleteVideoFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('services/delete-video'),
      memorySize: 512,
      timeout: cdk.Duration.seconds(29),
      environment: commonEnvironment,
      description: 'Delete video (system-admin only)',
    });

    // Lambda関数: getVideoDetailPublic
    const getVideoDetailPublicFn = new lambda.Function(this, 'GetVideoDetailPublicFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('services/get-video-detail-public'),
      memorySize: 512,
      timeout: cdk.Duration.seconds(29),
      environment: commonEnvironment,
      description: 'Get video detail (public, no authentication)',
    });

    // Lambda関数: getAdminStats
    const getAdminStatsFn = new lambda.Function(this, 'GetAdminStatsFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/getAdminStats.handler',
      code: lambda.Code.fromAsset('lambda/dist'),
      memorySize: 1024,
      timeout: cdk.Duration.seconds(29),
      environment: commonEnvironment,
      description: 'Get admin statistics (system-admin only)',
    });

    // Lambda関数: listAllVideos
    const listAllVideosFn = new lambda.Function(this, 'ListAllVideosFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/listAllVideos.handler',
      code: lambda.Code.fromAsset('lambda/dist'),
      memorySize: 1024,
      timeout: cdk.Duration.seconds(29),
      environment: commonEnvironment,
      description: 'List all videos (system-admin only)',
    });

    // Lambda関数: listOrganizations
    const listOrganizationsFn = new lambda.Function(this, 'ListOrganizationsFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/listOrganizations.handler',
      code: lambda.Code.fromAsset('lambda/dist'),
      memorySize: 512,
      timeout: cdk.Duration.seconds(29),
      environment: commonEnvironment,
      description: 'List organizations',
    });

    // Lambda関数: createOrganization
    const createOrganizationFn = new lambda.Function(this, 'CreateOrganizationFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/createOrganization.handler',
      code: lambda.Code.fromAsset('lambda/dist'),
      memorySize: 512,
      timeout: cdk.Duration.seconds(29),
      environment: commonEnvironment,
      description: 'Create organization (system-admin only)',
    });

    // Lambda関数: updateOrganization
    const updateOrganizationFn = new lambda.Function(this, 'UpdateOrganizationFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/updateOrganization.handler',
      code: lambda.Code.fromAsset('lambda/dist'),
      memorySize: 512,
      timeout: cdk.Duration.seconds(29),
      environment: commonEnvironment,
      description: 'Update organization (system-admin only)',
    });

    // Lambda関数: createShop
    const createShopFn = new lambda.Function(this, 'CreateShopFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/createShop.handler',
      code: lambda.Code.fromAsset('lambda/dist'),
      memorySize: 512,
      timeout: cdk.Duration.seconds(29),
      environment: commonEnvironment,
      description: 'Create shop (organization-admin only)',
    });

    // Lambda関数: updateShop
    const updateShopFn = new lambda.Function(this, 'UpdateShopFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/updateShop.handler',
      code: lambda.Code.fromAsset('lambda/dist'),
      memorySize: 512,
      timeout: cdk.Duration.seconds(29),
      environment: commonEnvironment,
      description: 'Update shop (organization-admin only)',
    });

    // Lambda関数: deleteShop
    const deleteShopFn = new lambda.Function(this, 'DeleteShopFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/deleteShop.handler',
      code: lambda.Code.fromAsset('lambda/dist'),
      memorySize: 512,
      timeout: cdk.Duration.seconds(29),
      environment: commonEnvironment,
      description: 'Delete shop (system-admin only)',
    });

    // Lambda関数: deleteOrganization
    const deleteOrganizationFn = new lambda.Function(this, 'DeleteOrganizationFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/deleteOrganization.handler',
      code: lambda.Code.fromAsset('lambda/dist'),
      memorySize: 512,
      timeout: cdk.Duration.seconds(29),
      environment: commonEnvironment,
      description: 'Delete organization permanently (system-admin only)',
    });

    // Lambda関数: createApprovalRequest
    const createApprovalRequestFn = new lambda.Function(this, 'CreateApprovalRequestFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/createApprovalRequest.handler',
      code: lambda.Code.fromAsset('lambda/dist'),
      memorySize: 512,
      timeout: cdk.Duration.seconds(29),
      environment: commonEnvironment,
      description: 'Create approval request for organization registration',
    });

    // Lambda関数: submitApprovalForm
    const submitApprovalFormFn = new lambda.Function(this, 'SubmitApprovalFormFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/submitApprovalForm.handler',
      code: lambda.Code.fromAsset('lambda/dist'),
      memorySize: 512,
      timeout: cdk.Duration.seconds(29),
      environment: commonEnvironment,
      description: 'Submit approval form data',
    });

    // Lambda関数: getPendingApprovals
    const getPendingApprovalsFn = new lambda.Function(this, 'GetPendingApprovalsFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/getPendingApprovals.handler',
      code: lambda.Code.fromAsset('lambda/dist'),
      memorySize: 512,
      timeout: cdk.Duration.seconds(29),
      environment: commonEnvironment,
      description: 'Get pending approval requests',
    });

    // Lambda関数: getApprovalRequest
    const getApprovalRequestFn = new lambda.Function(this, 'GetApprovalRequestFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/getApprovalRequest.handler',
      code: lambda.Code.fromAsset('lambda/dist'),
      memorySize: 512,
      timeout: cdk.Duration.seconds(29),
      environment: commonEnvironment,
      description: 'Get approval request details',
    });

    // Lambda関数: approveRequest
    const approveRequestFn = new lambda.Function(this, 'ApproveRequestFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/approveRequest.handler',
      code: lambda.Code.fromAsset('lambda/dist'),
      memorySize: 512,
      timeout: cdk.Duration.seconds(29),
      environment: commonEnvironment,
      description: 'Approve organization registration request',
    });

    // Lambda関数: rejectRequest
    const rejectRequestFn = new lambda.Function(this, 'RejectRequestFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/rejectRequest.handler',
      code: lambda.Code.fromAsset('lambda/dist'),
      memorySize: 512,
      timeout: cdk.Duration.seconds(29),
      environment: commonEnvironment,
      description: 'Reject organization registration request',
    });

    // Lambda関数: getShopStats
    const getShopStatsFn = new lambda.Function(this, 'GetShopStatsFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/getShopStats.handler',
      code: lambda.Code.fromAsset('lambda/dist'),
      memorySize: 512,
      timeout: cdk.Duration.seconds(29),
      environment: commonEnvironment,
      description: 'Get shop statistics',
    });

    // Lambda関数: getSystemStats
    const getSystemStatsFn = new lambda.Function(this, 'GetSystemStatsFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/getSystemStats.handler',
      code: lambda.Code.fromAsset('lambda/dist'),
      memorySize: 512,
      timeout: cdk.Duration.seconds(29),
      environment: commonEnvironment,
      description: 'Get system statistics (system-admin only)',
    });

    // 全Lambda関数を配列に追加（監視用）
    this.lambdaFunctions.push(
      generateUploadUrlFn,
      listVideosFn,
      getVideoDetailFn,
      deleteVideoFn,
      getVideoDetailPublicFn,
      getAdminStatsFn,
      listAllVideosFn,
      listOrganizationsFn,
      createOrganizationFn,
      updateOrganizationFn,
      deleteOrganizationFn,
      createShopFn,
      updateShopFn,
      deleteShopFn,
      createApprovalRequestFn,
      submitApprovalFormFn,
      getPendingApprovalsFn,
      getApprovalRequestFn,
      approveRequestFn,
      rejectRequestFn,
      getShopStatsFn,
      getSystemStatsFn
    );

    // S3権限の付与
    videoBucket.grantPut(generateUploadUrlFn);
    videoBucket.grantRead(getVideoDetailFn);
    videoBucket.grantRead(getVideoDetailPublicFn);
    videoBucket.grantReadWrite(deleteVideoFn);
    assetBucket.grantReadWrite(deleteVideoFn);

    // DynamoDB権限の付与
    const dynamoReadWritePolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
        'dynamodb:Query',
        'dynamodb:Scan',
      ],
      resources: [
        `arn:aws:dynamodb:${this.region}:${accountId}:table/${videoMetadataTableName}`,
        `arn:aws:dynamodb:${this.region}:${accountId}:table/${videoMetadataTableName}/index/*`,
        `arn:aws:dynamodb:${this.region}:${accountId}:table/${billingTableName}`,
        `arn:aws:dynamodb:${this.region}:${accountId}:table/${billingTableName}/index/*`,
        `arn:aws:dynamodb:${this.region}:${accountId}:table/${organizationTableName}`,
        `arn:aws:dynamodb:${this.region}:${accountId}:table/${organizationTableName}/index/*`,
        `arn:aws:dynamodb:${this.region}:${accountId}:table/${shopTableName}`,
        `arn:aws:dynamodb:${this.region}:${accountId}:table/${shopTableName}/index/*`,
        `arn:aws:dynamodb:${this.region}:${accountId}:table/${approvalRequestTableName}`,
        `arn:aws:dynamodb:${this.region}:${accountId}:table/${approvalRequestTableName}/index/*`,
      ],
    });

    generateUploadUrlFn.addToRolePolicy(dynamoReadWritePolicy);
    listVideosFn.addToRolePolicy(dynamoReadWritePolicy);
    getVideoDetailFn.addToRolePolicy(dynamoReadWritePolicy);
    deleteVideoFn.addToRolePolicy(dynamoReadWritePolicy);
    getVideoDetailPublicFn.addToRolePolicy(dynamoReadWritePolicy);
    getAdminStatsFn.addToRolePolicy(dynamoReadWritePolicy);
    listAllVideosFn.addToRolePolicy(dynamoReadWritePolicy);
    listOrganizationsFn.addToRolePolicy(dynamoReadWritePolicy);
    createOrganizationFn.addToRolePolicy(dynamoReadWritePolicy);
    updateOrganizationFn.addToRolePolicy(dynamoReadWritePolicy);
    deleteOrganizationFn.addToRolePolicy(dynamoReadWritePolicy);
    createShopFn.addToRolePolicy(dynamoReadWritePolicy);
    updateShopFn.addToRolePolicy(dynamoReadWritePolicy);
    deleteShopFn.addToRolePolicy(dynamoReadWritePolicy);
    createApprovalRequestFn.addToRolePolicy(dynamoReadWritePolicy);
    submitApprovalFormFn.addToRolePolicy(dynamoReadWritePolicy);
    getPendingApprovalsFn.addToRolePolicy(dynamoReadWritePolicy);
    getApprovalRequestFn.addToRolePolicy(dynamoReadWritePolicy);
    approveRequestFn.addToRolePolicy(dynamoReadWritePolicy);
    rejectRequestFn.addToRolePolicy(dynamoReadWritePolicy);
    getShopStatsFn.addToRolePolicy(dynamoReadWritePolicy);
    getSystemStatsFn.addToRolePolicy(dynamoReadWritePolicy);

    // Cognito権限（承認Lambda用）
    const cognitoAdminPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cognito-idp:AdminCreateUser',
        'cognito-idp:AdminAddUserToGroup',
        'cognito-idp:AdminSetUserPassword',
        'cognito-idp:AdminGetUser',
        'cognito-idp:AdminUpdateUserAttributes',
      ],
      resources: [`arn:aws:cognito-idp:${this.region}:${accountId}:userpool/${userPoolId}`],
    });
    
    approveRequestFn.addToRolePolicy(cognitoAdminPolicy);
    createOrganizationFn.addToRolePolicy(cognitoAdminPolicy);
    createShopFn.addToRolePolicy(cognitoAdminPolicy);

    // SNS権限（メール送信用）
    if (snsTopicArn) {
      const snsPublishPolicy = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['sns:Publish'],
        resources: [snsTopicArn],
      });
      
      createApprovalRequestFn.addToRolePolicy(snsPublishPolicy);
      submitApprovalFormFn.addToRolePolicy(snsPublishPolicy);
      approveRequestFn.addToRolePolicy(snsPublishPolicy);
      rejectRequestFn.addToRolePolicy(snsPublishPolicy);
    }

    // CloudWatch Logs設定
    const logGroup = new logs.LogGroup(this, 'ApiGatewayLogGroup', {
      logGroupName: `/aws/apigateway/video-nfc-${environment}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // REST API作成
    this.restApi = new apigateway.RestApi(this, 'VideoNfcRestApi', {
      restApiName: `video-nfc-api-${environment}`,
      description: `NFCタグ付きキーホルダー向け動画配信システム API (${environment})`,
      deployOptions: {
        stageName: environment,
        dataTraceEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        metricsEnabled: true,
        accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
          caller: true,
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          user: true,
        }),
        throttlingBurstLimit: 2000,
        throttlingRateLimit: 1000,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: [
          'http://localhost:3000',
          'http://localhost:3001',
          'https://localhost:3000',
          'https://localhost:3001',
          'https://main.d3vnoskfyyh2d2.amplifyapp.com',
          'https://*.amazonaws.com',
          'https://*.cloudfront.net',
          'https://*.amplifyapp.com',
        ],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'X-Development-Mode',
        ],
        allowCredentials: true,
        maxAge: cdk.Duration.days(10),
      },
      cloudWatchRole: true,
    });

    // Cognito User Pool Authorizer
    const importedUserPool = cognito.UserPool.fromUserPoolId(
      this,
      'ImportedUserPool',
      userPoolId
    );

    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      'CognitoAuthorizer',
      {
        cognitoUserPools: [importedUserPool],
        authorizerName: `video-nfc-${environment}-authorizer`,
        identitySource: 'method.request.header.Authorization',
      }
    );

    // Lambda統合の設定
    const lambdaIntegrationOptions: apigateway.LambdaIntegrationOptions = {
      proxy: true,
      allowTestInvoke: true,
      timeout: cdk.Duration.seconds(29),
    };

    // ルート: /videos
    const videosResource = this.restApi.root.addResource('videos');

    // POST /videos/upload-url - 認証必須（agency-user, system-admin）
    const uploadUrlResource = videosResource.addResource('upload-url');
    uploadUrlResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(generateUploadUrlFn, lambdaIntegrationOptions),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    // OPTIONS メソッドを手動で追加（CORS用）
    uploadUrlResource.addMethod(
      'OPTIONS',
      new apigateway.MockIntegration({
        integrationResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Development-Mode'",
              'method.response.header.Access-Control-Allow-Origin': "'*'",
              'method.response.header.Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
              'method.response.header.Access-Control-Allow-Credentials': "'true'",
            },
          },
        ],
        requestTemplates: {
          'application/json': '{"statusCode": 200}',
        },
      }),
      {
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Headers': true,
              'method.response.header.Access-Control-Allow-Origin': true,
              'method.response.header.Access-Control-Allow-Methods': true,
              'method.response.header.Access-Control-Allow-Credentials': true,
            },
          },
        ],
      }
    );

    // GET /videos - 開発環境では認証をスキップ
    videosResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(listVideosFn, lambdaIntegrationOptions),
      {
        authorizationType: apigateway.AuthorizationType.COGNITO,
        authorizer: authorizer,
        requestParameters: {
          'method.request.querystring.limit': false,
          'method.request.querystring.lastEvaluatedKey': false,
          'method.request.querystring.search': false,
        },
      }
    );

    // /videos/{videoId}
    const videoIdResource = videosResource.addResource('{videoId}');

    // GET /videos/{videoId} - 認証必須
    videoIdResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getVideoDetailFn, lambdaIntegrationOptions),
      {
        authorizationType: apigateway.AuthorizationType.COGNITO,
        authorizer: authorizer,
        requestParameters: {
          'method.request.path.videoId': true,
        },
      }
    );

    // DELETE /videos/{videoId} - 認証必須（system-adminのみ）
    videoIdResource.addMethod(
      'DELETE',
      new apigateway.LambdaIntegration(deleteVideoFn, lambdaIntegrationOptions),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
        requestParameters: {
          'method.request.path.videoId': true,
          'method.request.header.X-Development-Mode': false,
        },
      }
    );

    // GET /videos/{videoId}/detail - 認証不要（公開エンドポイント）
    const detailResource = videoIdResource.addResource('detail');
    detailResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getVideoDetailPublicFn, lambdaIntegrationOptions),
      {
        authorizationType: apigateway.AuthorizationType.NONE,
        requestParameters: {
          'method.request.path.videoId': true,
        },
      }
    );

    // 管理者用ルート: /admin
    const adminResource = this.restApi.root.addResource('admin');

    // GET /admin/stats - 認証必須（システム管理者のみ）
    const statsResource = adminResource.addResource('stats');
    statsResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getAdminStatsFn, lambdaIntegrationOptions),
      {
        authorizationType: apigateway.AuthorizationType.COGNITO,
        authorizer: authorizer,
      }
    );

    // GET /admin/videos - システム管理者のみ
    const adminVideosResource = adminResource.addResource('videos');
    adminVideosResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(listAllVideosFn, lambdaIntegrationOptions),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
        requestParameters: {
          'method.request.querystring.organizationId': false,
          'method.request.querystring.status': false,
          'method.request.querystring.search': false,
          'method.request.querystring.limit': false,
          'method.request.querystring.lastEvaluatedKey': false,
          'method.request.header.X-Development-Mode': false,
        },
      }
    );

    // 組織管理ルート: /organizations
    const organizationsResource = this.restApi.root.addResource('organizations');

    // GET /organizations - システム管理者 or 代理店管理者
    organizationsResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(listOrganizationsFn, lambdaIntegrationOptions),
      {
        authorizationType: apigateway.AuthorizationType.NONE,
        requestParameters: {
          'method.request.querystring.type': false,
          'method.request.querystring.parentId': false,
        },
      }
    );

    // POST /organizations - システム管理者のみ
    organizationsResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(createOrganizationFn, lambdaIntegrationOptions),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    // PUT /organizations/{organizationId} - システム管理者のみ
    const organizationIdResource = organizationsResource.addResource('{organizationId}');
    organizationIdResource.addMethod(
      'PUT',
      new apigateway.LambdaIntegration(updateOrganizationFn, lambdaIntegrationOptions),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
        requestParameters: {
          'method.request.path.organizationId': true,
        },
      }
    );

    // DELETE /organizations/{organizationId} - システム管理者のみ（完全削除）
    organizationIdResource.addMethod(
      'DELETE',
      new apigateway.LambdaIntegration(deleteOrganizationFn, lambdaIntegrationOptions),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
        requestParameters: {
          'method.request.path.organizationId': true,
        },
      }
    );

    // 販売店ルート: /shops
    const shopsResource = this.restApi.root.addResource('shops');

    // POST /shops - 販売店作成（組織管理者のみ）
    shopsResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(createShopFn, lambdaIntegrationOptions),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    // /shops/{shopId}
    const shopIdResource = shopsResource.addResource('{shopId}');

    // PATCH /shops/{shopId} - 販売店更新（組織管理者のみ）
    shopIdResource.addMethod(
      'PATCH',
      new apigateway.LambdaIntegration(updateShopFn, lambdaIntegrationOptions),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
        requestParameters: {
          'method.request.path.shopId': true,
        },
      }
    );

    // DELETE /shops/{shopId} - 販売店削除（システム管理者のみ）
    shopIdResource.addMethod(
      'DELETE',
      new apigateway.LambdaIntegration(deleteShopFn, lambdaIntegrationOptions),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
        requestParameters: {
          'method.request.path.shopId': true,
        },
      }
    );

    // 承認申請ルート: /approvals
    const approvalsResource = this.restApi.root.addResource('approvals');

    // POST /approvals - 承認申請作成（システム管理者 or 組織管理者）
    approvalsResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(createApprovalRequestFn, lambdaIntegrationOptions),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    // GET /approvals - 承認待ち一覧取得（システム管理者 or 組織管理者）
    approvalsResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getPendingApprovalsFn, lambdaIntegrationOptions),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    // /approvals/{requestId}
    const approvalIdResource = approvalsResource.addResource('{requestId}');

    // GET /approvals/{requestId} - 承認申請詳細取得
    approvalIdResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getApprovalRequestFn, lambdaIntegrationOptions),
      {
        authorizationType: apigateway.AuthorizationType.NONE, // 公開エンドポイント
        requestParameters: {
          'method.request.path.requestId': true,
        },
      }
    );

    // POST /approvals/{requestId}/submit - フォーム送信（認証不要）
    const submitResource = approvalIdResource.addResource('submit');
    submitResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(submitApprovalFormFn, lambdaIntegrationOptions),
      {
        authorizationType: apigateway.AuthorizationType.NONE, // 公開エンドポイント
        requestParameters: {
          'method.request.path.requestId': true,
        },
      }
    );

    // POST /approvals/{requestId}/approve - 承認（認証必須）
    const approveResource = approvalIdResource.addResource('approve');
    approveResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(approveRequestFn, lambdaIntegrationOptions),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
        requestParameters: {
          'method.request.path.requestId': true,
        },
      }
    );

    // POST /approvals/{requestId}/reject - 却下（認証必須）
    const rejectResource = approvalIdResource.addResource('reject');
    rejectResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(rejectRequestFn, lambdaIntegrationOptions),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
        requestParameters: {
          'method.request.path.requestId': true,
        },
      }
    );

    // GET /shop/stats - 販売店統計取得（認証必須）
    const shopResource = this.restApi.root.addResource('shop');
    const shopStatsResource = shopResource.addResource('stats');
    shopStatsResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getShopStatsFn, lambdaIntegrationOptions),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    // GET /system/stats - 開発環境では認証をスキップ
    const systemResource = this.restApi.root.addResource('system');
    const systemStatsResource = systemResource.addResource('stats');
    systemStatsResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getSystemStatsFn, lambdaIntegrationOptions),
      {
        authorizationType: apigateway.AuthorizationType.NONE,
      }
    );

    // 注: OPTIONS メソッドは defaultCorsPreflightOptions で自動的に作成されるため、
    // 明示的な追加は不要

    // タグ付け
    cdk.Tags.of(this.restApi).add('Environment', environment);
    cdk.Tags.of(this.restApi).add('Project', 'video-nfc');

    // CloudFormation Outputs
    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: this.restApi.url,
      description: 'API GatewayのベースURL',
      exportName: `${environment}-ApiGatewayUrl`,
    });

    new cdk.CfnOutput(this, 'ApiGatewayId', {
      value: this.restApi.restApiId,
      description: 'API Gateway ID',
      exportName: `${environment}-ApiGatewayId`,
    });

    new cdk.CfnOutput(this, 'CognitoUserPoolId', {
      value: userPoolId,
      description: 'Cognito User Pool ID',
      exportName: `${environment}-CognitoUserPoolIdOutput`,
    });

    new cdk.CfnOutput(this, 'CognitoClientId', {
      value: userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: `${environment}-CognitoClientIdOutput`,
    });
  }
}
