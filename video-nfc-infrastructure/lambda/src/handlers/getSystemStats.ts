import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { parseAuthUser } from '../lib/permissions';
import { getCorsHeaders } from '../lib/errorHandler';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

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
    email?: string; // ログイン用メールアドレス
    contactPerson?: string;
    contactEmail?: string;
    contactPhone?: string;
    videoCount: number;
    totalSize: number;
    monthlyCount: number;
    weeklyCount: number;
}

interface OrganizationStat {
    organizationId: string;
    organizationName: string;
    shopCount: number;
    totalVideos: number;
    totalSize: number;
    monthlyVideos: number;
    weeklyVideos: number;
    createdAt: string;
    shopStats: ShopStat[];
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        // OPTIONS リクエストの処理
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: getCorsHeaders(event),
                body: JSON.stringify({ message: 'CORS preflight' })
            };
        }

        // 認証情報からユーザー情報を取得
        const user = parseAuthUser(event);

        // システム管理者のみアクセス可能
        if (!user.groups.includes('system-admin')) {
            return {
                statusCode: 403,
                headers: getCorsHeaders(event),
                body: JSON.stringify({
                    success: false,
                    error: {
                        message: 'Only system administrators can access system statistics'
                    }
                })
            };
        }

        // クエリパラメータから期間を取得
        const queryParams = event.queryStringParameters || {};
        const startDate = queryParams.startDate;
        const endDate = queryParams.endDate;

        // 全組織を取得
        const organizationsParams = {
            TableName: process.env.DYNAMODB_TABLE_ORGANIZATION!,
        };

        const organizationsResult = await dynamodb.send(new ScanCommand(organizationsParams));

        const organizations = (organizationsResult.Items || []).map(item => {
            // shopsフィールドを取得
            const shops = Array.isArray(item.shops) ? item.shops : [];
            const orgShops = shops.map(shop => ({
                id: shop.id,
                name: shop.name,
                email: shop.email,
                status: shop.status
            }));
            
            const org = {
                organizationId: item.organizationId as string,
                organizationName: item.organizationName as string,
                status: item.status as string,
                createdAt: item.createdAt as string,
                shops: orgShops
            };
            return org;
        });
        
        // 販売店データも取得
        const shopsParams = {
            TableName: process.env.DYNAMODB_TABLE_SHOP!,
        };

        const shopsResult = await dynamodb.send(new ScanCommand(shopsParams));
        const shops = (shopsResult.Items || []).map(item => {
            const shop = {
                shopId: item.shopId as string,
                shopName: item.shopName as string,
                organizationId: item.organizationId as string,
                email: item.email as string, // ログイン用メールアドレス
                status: item.status as string,
                contactPerson: item.contactPerson as string,
                contactEmail: item.contactEmail as string,
                contactPhone: item.contactPhone as string
            };
            return shop;
        });
        
        // 全動画を取得
        const videosParams = {
            TableName: process.env.DYNAMODB_TABLE_VIDEO!,
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

        // 組織ごとの統計を計算
        const organizationStatsMap: { [key: string]: OrganizationStat } = {};
        
        // 組織ごとの初期化
        organizations.forEach(org => {
            // Organizationテーブルのshopsフィールドを優先的に使用
            const orgShopsFromOrg = org.shops || [];
            const orgShopsFromShopTable = shops.filter(shop => shop.organizationId === org.organizationId);
            
            // 両方のソースから店舗データを統合（データ構造を統一）
            const normalizedOrgShops = orgShopsFromOrg.map(shop => ({
                shopId: shop.id,
                shopName: shop.name,
                email: shop.email,
                status: shop.status,
                contactPerson: '',
                contactEmail: '',
                contactPhone: ''
            }));
            const allOrgShops = [...normalizedOrgShops, ...orgShopsFromShopTable];
            const uniqueShops = allOrgShops.filter((shop, index, self) => 
                index === self.findIndex(s => s.shopId === shop.shopId)
            );
            
            organizationStatsMap[org.organizationId] = {
                organizationId: org.organizationId,
                organizationName: org.organizationName,
                createdAt: org.createdAt,
                shopCount: uniqueShops.length,
                totalVideos: 0,
                totalSize: 0,
                monthlyVideos: 0,
                weeklyVideos: 0,
                shopStats: []
            };
            // 販売店ごとの統計も初期化
            uniqueShops.forEach(shop => {
                organizationStatsMap[org.organizationId].shopStats.push({
                    shopId: shop.shopId,
                    shopName: shop.shopName,
                    email: shop.email || '', // ログイン用メールアドレス
                    contactPerson: shop.contactPerson || '',
                    contactEmail: shop.contactEmail || '',
                    contactPhone: shop.contactPhone || '',
                    videoCount: 0,
                    totalSize: 0,
                    monthlyCount: 0,
                    weeklyCount: 0
                });
            });
        });

        // 現在の日時を取得
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // 週の開始日を月曜日に設定（日曜日=0, 月曜日=1, ..., 土曜日=6）
        const startOfWeek = new Date(now);
        const dayOfWeek = now.getDay(); // 0=日曜日, 1=月曜日, ..., 6=土曜日
        const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 日曜日の場合は-6、それ以外は1-dayOfWeek
        startOfWeek.setDate(now.getDate() + daysToMonday);
        startOfWeek.setHours(0, 0, 0, 0);

        // すべての動画を処理
        allVideos.forEach(video => {
            const orgId = video.organizationId;
            const shopId = video.shopId;

            // SYSTEM動画はスキップ（カウントしない）
            if (orgId === 'SYSTEM') {
                return;
            }
            
            // 組織IDが存在する動画のみカウント
            if (organizationStatsMap[orgId]) {
                organizationStatsMap[orgId].totalVideos++;
                organizationStatsMap[orgId].totalSize += video.fileSize || 0;

                const videoDate = new Date(video.uploadDate);
                if (videoDate >= startOfMonth) {
                    organizationStatsMap[orgId].monthlyVideos++;
                }
                if (videoDate >= startOfWeek) {
                    organizationStatsMap[orgId].weeklyVideos++;
                }

                // 販売店ごとの統計も更新
                const shopStat = organizationStatsMap[orgId].shopStats.find(s => s.shopId === shopId);
                if (shopStat) {
                    shopStat.videoCount++;
                    shopStat.totalSize += video.fileSize || 0;
                    if (videoDate >= startOfMonth) {
                        shopStat.monthlyCount++;
                    }
                    if (videoDate >= startOfWeek) {
                        shopStat.weeklyCount++;
                    }
                }
            }
        });

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

        // 全体の総計を計算
        const totalOrganizations = organizations.length;
        const totalShops = shops.length;
        const totalVideos = allVideos.length;
        const totalSize = allVideos.reduce((sum, video) => sum + (video.fileSize || 0), 0);
        const totalMonthlyVideos = allVideos.filter(video => new Date(video.uploadDate) >= startOfMonth).length;
        const totalWeeklyVideos = allVideos.filter(video => new Date(video.uploadDate) >= startOfWeek).length;

        const organizationStats = Object.values(organizationStatsMap).map(org => {
            return {
                organizationId: org.organizationId,
                organizationName: org.organizationName,
                shopCount: org.shopCount,
                totalVideos: org.totalVideos,
                totalSize: org.totalSize,
                monthlyVideos: org.monthlyVideos,
                weeklyVideos: org.weeklyVideos,
                createdAt: org.createdAt,
                shopStats: org.shopStats
            };
        });

        console.log('System stats calculated:', {
            totalOrganizations,
            totalShops,
            totalVideos,
            totalSize,
            organizationStats: organizationStats.length
        });

        return {
            statusCode: 200,
            headers: getCorsHeaders(event),
            body: JSON.stringify({
                success: true,
                data: {
                    totalOrganizations,
                    totalShops,
                    totalVideos,
                    totalSize,
                    totalMonthlyVideos,
                    totalWeeklyVideos,
                    organizationStats,
                    monthlyTrend
                }
            })
        };

    } catch (error: any) {
        console.error('getSystemStats error');
        return {
            statusCode: 500,
            headers: getCorsHeaders(event),
            body: JSON.stringify({
                success: false,
                error: {
                    message: 'Internal server error'
                }
            })
        };
    }
};

