import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';

export interface AuthStackProps extends cdk.StackProps {
  environment: string;
  accountId: string;
}

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    const { environment } = props;

    // Cognito User Pool
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `video-nfc-${environment}-users`,
      selfSignUpEnabled: false, // 管理者がユーザーを作成するため
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: true,
        otp: false,
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      // 既存UserPoolのカスタム属性を維持（Cognitoは一度作成したスキーマ属性を削除できない）
      customAttributes: {
        agencyId: new cognito.StringAttribute({ minLen: 1, maxLen: 256, mutable: true }),
        organizationId: new cognito.StringAttribute({ minLen: 1, maxLen: 256, mutable: true }),
        shopId: new cognito.StringAttribute({ minLen: 1, maxLen: 256, mutable: true }),
        role: new cognito.StringAttribute({ minLen: 1, maxLen: 50, mutable: true }),
        organizationName: new cognito.StringAttribute({ minLen: 1, maxLen: 256, mutable: true }),
        shopName: new cognito.StringAttribute({ minLen: 1, maxLen: 256, mutable: true }),
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // User Pool Client（既存の論理IDを維持するためaddClientを使用）
    this.userPoolClient = this.userPool.addClient('UserPoolClient', {
      userPoolClientName: `video-nfc-${environment}-client`,
      generateSecret: false, // ブラウザから直接アクセスするため
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
        userSrp: true,
        custom: true,
      },
      preventUserExistenceErrors: true,
      enableTokenRevocation: true,
      authSessionValidity: cdk.Duration.minutes(3),
      accessTokenValidity: cdk.Duration.minutes(1440),
      idTokenValidity: cdk.Duration.minutes(1440),
      refreshTokenValidity: cdk.Duration.minutes(43200),
    });

    // Groups
    new cognito.CfnUserPoolGroup(this, 'SystemAdminGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'system-admin',
      description: 'システム管理者グループ（全権限）',
      precedence: 1,
    });

    new cognito.CfnUserPoolGroup(this, 'OrganizationAdminGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'organization-admin',
      description: '代理店管理者グループ（配下の全販売店を管理）',
      precedence: 2,
    });

    new cognito.CfnUserPoolGroup(this, 'ShopAdminGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'shop-admin',
      description: '販売店管理者グループ（自店舗を管理）',
      precedence: 3,
    });

    // Outputs（既存のExport名を維持）
    new cdk.CfnOutput(this, 'UserPoolId', {
      description: 'Cognito User Pool ID',
      value: this.userPool.userPoolId,
      exportName: `${environment}-UserPoolId`,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      description: 'Cognito User Pool Client ID',
      value: this.userPoolClient.userPoolClientId,
      exportName: `${environment}-UserPoolClientId`,
    });

    new cdk.CfnOutput(this, 'UserPoolArn', {
      description: 'Cognito User Pool ARN',
      value: this.userPool.userPoolArn,
      exportName: `${environment}-UserPoolArn`,
    });

    new cdk.CfnOutput(this, 'SystemAdminGroupName', {
      description: 'システム管理者グループ',
      value: 'system-admin',
      exportName: `${environment}-SystemAdminGroupName`,
    });

    new cdk.CfnOutput(this, 'OrganizationAdminGroupName', {
      description: '組織管理者グループ',
      value: 'organization-admin',
      exportName: `${environment}-OrganizationAdminGroupName`,
    });

    new cdk.CfnOutput(this, 'ShopAdminGroupName', {
      description: '販売店管理者グループ',
      value: 'shop-admin',
      exportName: `${environment}-ShopAdminGroupName`,
    });
  }
}
