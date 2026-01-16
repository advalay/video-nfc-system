import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sns_subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';

export interface MonitoringStackProps extends cdk.StackProps {
    environment: string;
    accountId: string;
    lambdaFunctions: lambda.Function[];
    apiGatewayId: string;
    alertEmail: string;
}

export class MonitoringStack extends cdk.Stack {
    public readonly alertTopic: sns.Topic;

    constructor(scope: Construct, id: string, props: MonitoringStackProps) {
        super(scope, id, props);

        const { environment, lambdaFunctions, apiGatewayId, alertEmail } = props;

        // SNS Topic for Alerts
        this.alertTopic = new sns.Topic(this, 'AlertTopic', {
            topicName: `video-nfc-alerts-${environment}`,
            displayName: `Video NFC Alerts (${environment})`,
        });

        // Email Subscription
        if (alertEmail) {
            this.alertTopic.addSubscription(new sns_subscriptions.EmailSubscription(alertEmail));
        }

        // CloudWatch Alarms for Lambda Functions
        if (lambdaFunctions && lambdaFunctions.length > 0) {
            lambdaFunctions.forEach(fn => {
                const errorAlarm = new cloudwatch.Alarm(this, `ErrorAlarm-${fn.functionName}`, {
                    metric: fn.metricErrors(),
                    threshold: 1,
                    evaluationPeriods: 1,
                    alarmDescription: `Error alarm for ${fn.functionName}`,
                    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                });
                errorAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alertTopic));
            });
        }

        // Outputs
        new cdk.CfnOutput(this, 'AlertTopicArn', {
            value: this.alertTopic.topicArn,
            exportName: `video-nfc-monitoring-${environment}-AlertTopicArn`,
        });
    }
}
