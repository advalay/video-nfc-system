import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

interface Video {
    videoId: string;
    fileName: string;
    fileSize: number;
    uploadDate: string;
    organizationId: string;
    shopId: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('Event:', JSON.stringify(event, null, 2));

    try {
        // OPTIONS リクエストの処理
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'CORS preflight' })
            };
        }

        // 認証情報からユーザー情報を取得
        const claims = event.requestContext?.authorizer?.claims || {};
        const userGroups = claims['cognito:groups'] ? (Array.isArray(claims['cognito:groups']) ? claims['cognito:groups'] : [claims['cognito:groups']]) : [];
        const userShopId = claims['custom:shopId'] as string || '';
        const userOrganizationId = claims['custom:organizationId'] as string || '';

        // クエリパラメータから期間を取得
        const queryParams = event.queryStringParameters || {};
        const startDate = queryParams.startDate;
        const endDate = queryParams.endDate;

        // システム管理者、組織管理者、販売店管理者のみアクセス可能
        const isSystemAdmin = userGroups.includes('system-admin');
        const isOrganizationAdmin = userGroups.includes('organization-admin');
        const isShopAdmin = userGroups.includes('shop-admin');
        
        if (!isSystemAdmin && !isOrganizationAdmin && !isShopAdmin) {
            return {
                statusCode: 403,
                headers: CORS_HEADERS,
                body: JSON.stringify({
                    success: false,
                    error: {
                        message: 'Only system administrators, organization administrators, or shop administrators can access shop statistics'
                    }
                })
            };
        }

        if (!userShopId) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({
                    success: false,
                    error: {
                        message: 'Shop ID not found in user claims'
                    }
                })
            };
        }

        // 期間指定がある場合のフィルタリング
        let filterExpression = 'shopId = :shopId';
        let expressionAttributeValues: { [key: string]: any } = {
            ':shopId': { S: userShopId }
        };

        if (startDate || endDate) {
            if (startDate) {
                filterExpression += ' AND uploadDate >= :startDate';
                expressionAttributeValues[':startDate'] = { S: startDate };
            }
            if (endDate) {
                filterExpression += ' AND uploadDate <= :endDate';
                expressionAttributeValues[':endDate'] = { S: endDate };
            }
        }

        // 販売店の動画を取得
        const videosParams = {
            TableName: process.env.DYNAMODB_TABLE_VIDEO!,
            FilterExpression: filterExpression,
            ExpressionAttributeValues: expressionAttributeValues
        };

        const videosResult = await dynamodb.send(new ScanCommand(videosParams));
        let allVideos: Video[] = (videosResult.Items || []).map(item => ({
            videoId: item.videoId as string,
            fileName: item.fileName as string,
            fileSize: parseInt((item.fileSize as string) || '0'),
            uploadDate: item.uploadDate as string,
            organizationId: item.organizationId as string,
            shopId: item.shopId as string
        }));

        // 期間指定がある場合は、さらに日付でフィルタリング
        if (startDate || endDate) {
            allVideos = allVideos.filter(video => {
                const videoDate = new Date(video.uploadDate);
                if (startDate && videoDate < new Date(startDate)) return false;
                if (endDate && videoDate > new Date(endDate)) return false;
                return true;
            });
        }

        // 現在の日時を取得
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        // 統計を計算
        const totalVideos = allVideos.length;
        const totalSize = allVideos.reduce((sum, video) => sum + (video.fileSize || 0), 0);
        const monthlyVideos = allVideos.filter(video => new Date(video.uploadDate) >= startOfMonth).length;
        const weeklyVideos = allVideos.filter(video => new Date(video.uploadDate) >= startOfWeek).length;

        // 月別トレンドを計算（過去6ヶ月）
        const monthlyTrend = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const monthVideos = allVideos.filter(video => {
                const videoDate = new Date(video.uploadDate);
                return videoDate >= monthStart && videoDate <= monthEnd;
            });

            monthlyTrend.push({
                month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
                count: monthVideos.length,
                size: monthVideos.reduce((sum, video) => sum + (video.fileSize || 0), 0)
            });
        }

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                success: true,
                data: {
                    shopId: userShopId,
                    organizationId: userOrganizationId,
                    totalVideos,
                    totalSize,
                    monthlyVideos,
                    weeklyVideos,
                    monthlyTrend
                }
            })
        };

    } catch (error: any) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                success: false,
                error: {
                    message: 'Internal server error',
                    details: error.message
                }
            })
        };
    }
};
