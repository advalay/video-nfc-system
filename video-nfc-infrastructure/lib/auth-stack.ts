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
      userPoolName: `video-nfc-users-${environment}`,
      selfSignUpEnabled: false, // 管理者がユーザーを作成するため
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // User Pool Client
    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: `video-nfc-client-${environment}`,
      generateSecret: false, // ブラウザから直接アクセスするため
      authFlows: {
        adminUserPassword: true,
        userSrp: true,
        custom: true,
      },
    });

    // Groups
    new cognito.CfnUserPoolGroup(this, 'SystemAdminGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'system-admin',
      description: 'System Administrators',
      precedence: 0,
    });

    new cognito.CfnUserPoolGroup(this, 'OrganizationAdminGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'organization-admin',
      description: 'Organization Administrators',
      precedence: 10,
    });

    new cognito.CfnUserPoolGroup(this, 'ShopUserGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'shop-user', // Note: cdk-outputs says ShopUserGroupName: shop-user. But could be shop-admin? README says shop-admin. cdk-outputs says ShopUserGroupName: shop-user. Sticking to cdk-outputs.
      description: 'Shop Users',
      precedence: 20,
    });

    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      exportName: `video-nfc-auth-${environment}-UserPoolId`,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      exportName: `video-nfc-auth-${environment}-UserPoolClientId`,
    });

    new cdk.CfnOutput(this, 'SystemAdminGroupName', {
      value: 'system-admin',
    });

    new cdk.CfnOutput(this, 'OrganizationAdminGroupName', {
        value: 'organization-admin',
    });

    new cdk.CfnOutput(this, 'ShopUserGroupName', {
        value: 'shop-user',
    });
  }
}
