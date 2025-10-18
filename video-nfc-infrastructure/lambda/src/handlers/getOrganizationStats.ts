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

interface ShopStat {
    shopId: string;
    shopName: string;
    videoCount: number;
    totalSize: number;
    monthlyCount: number;
    weeklyCount: number;
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
        const userOrganizationId = claims['custom:organizationId'] as string || '';

        // 組織管理者のみアクセス可能
        if (!userGroups.includes('organization-admin')) {
            return {
                statusCode: 403,
                headers: CORS_HEADERS,
                body: JSON.stringify({
                    success: false,
                    error: {
                        message: 'Only organization administrators can access organization statistics'
                    }
                })
            };
        }

        if (!userOrganizationId) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({
                    success: false,
                    error: {
                        message: 'Organization ID not found in user claims'
                    }
                })
            };
        }

        // クエリパラメータから期間を取得
        const queryParams = event.queryStringParameters || {};
        const startDate = queryParams.startDate;
        const endDate = queryParams.endDate;

        // 組織の販売店を取得
        const shopsParams = {
            TableName: process.env.DYNAMODB_TABLE_SHOP!,
            FilterExpression: 'organizationId = :organizationId',
            ExpressionAttributeValues: {
                ':organizationId': { S: userOrganizationId }
            }
        };

        const shopsResult = await dynamodb.send(new ScanCommand(shopsParams));
        const shops = (shopsResult.Items || []).map(item => ({
            shopId: item.shopId as string,
            shopName: item.shopName as string,
            organizationId: item.organizationId as string,
            status: item.status as string
        }));

        // 期間指定がある場合のフィルタリング
        let filterExpression = 'organizationId = :organizationId';
        let expressionAttributeValues: { [key: string]: any } = {
            ':organizationId': { S: userOrganizationId }
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

        // 組織の動画を取得
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

        // 販売店ごとの統計を計算
        const shopStats: ShopStat[] = shops.map(shop => {
            const shopVideos = allVideos.filter(video => video.shopId === shop.shopId);
            const monthlyVideos = shopVideos.filter(video => new Date(video.uploadDate) >= startOfMonth);
            const weeklyVideos = shopVideos.filter(video => new Date(video.uploadDate) >= startOfWeek);

            return {
                shopId: shop.shopId,
                shopName: shop.shopName,
                videoCount: shopVideos.length,
                totalSize: shopVideos.reduce((sum, video) => sum + (video.fileSize || 0), 0),
                monthlyCount: monthlyVideos.length,
                weeklyCount: weeklyVideos.length
            };
        });

        // 組織全体の統計を計算
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
                    organizationId: userOrganizationId,
                    shopCount: shops.length,
                    totalVideos,
                    totalSize,
                    monthlyVideos,
                    weeklyVideos,
                    shopStats,
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
