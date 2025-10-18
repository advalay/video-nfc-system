const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Development-Mode',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Credentials': 'false',
    'Access-Control-Max-Age': '86400'
};

exports.handler = async (event) => {
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

        // 開発環境では認証をスキップ
        let userGroups = [];
        console.log('Environment:', process.env.ENVIRONMENT);
        console.log('Development mode header:', event.headers?.['x-development-mode']);
        
        if (process.env.ENVIRONMENT === 'dev' && event.headers?.['x-development-mode'] === 'true') {
            console.log('Development mode: Skipping authentication');
            userGroups = ['system-admin'];
        } else {
            // 認証情報からユーザー情報を取得
            const claims = event.requestContext?.authorizer?.claims || {};
            userGroups = claims['cognito:groups'] || [];
        }
        
        console.log('User groups:', userGroups);

        // システム管理者のみアクセス可能
        if (!userGroups.includes('system-admin')) {
            return {
                statusCode: 403,
                headers: CORS_HEADERS,
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
            TableName: process.env.DYNAMODB_TABLE_ORGANIZATION,
        };

        console.log('DynamoDB scan parameters:', JSON.stringify(organizationsParams, null, 2));
        const organizationsResult = await dynamodb.send(new ScanCommand(organizationsParams));
        
        // DynamoDBの生データをログ出力
        console.log('Raw DynamoDB Organizations:');
        console.log('Items count:', organizationsResult.Items?.length || 0);
        console.log(JSON.stringify(organizationsResult.Items, null, 2));
        
        const organizations = (organizationsResult.Items || []).map(item => {
            // shopsフィールドを取得
            const shops = item.shops?.L || [];
            const orgShops = shops.map(shop => ({
                id: shop.M?.id?.S,
                name: shop.M?.name?.S,
                email: shop.M?.email?.S,
                status: shop.M?.status?.S
            }));
            
            console.log(`Raw DynamoDB item:`, JSON.stringify(item, null, 2));
            const org = {
                organizationId: item.organizationId?.S || item.organizationId,
                organizationName: item.organizationName?.S || item.organizationName,
                status: item.status?.S || item.status,
                createdAt: item.createdAt?.S || item.createdAt,
                shops: orgShops
            };
            console.log(`Organization ${org.organizationId}: organizationName=${org.organizationName}, shops=${orgShops.length}`);
            return org;
        });
        
        console.log('Organizations after conversion:');
        console.log(JSON.stringify(organizations, null, 2));

        // 販売店データも取得
        const shopsParams = {
            TableName: process.env.DYNAMODB_TABLE_SHOP,
        };

        console.log('Shop scan parameters:', JSON.stringify(shopsParams, null, 2));
        const shopsResult = await dynamodb.send(new ScanCommand(shopsParams));
        console.log('Shop scan result count:', shopsResult.Items?.length || 0);
        const shops = (shopsResult.Items || []).map(item => {
            console.log('Raw Shop DynamoDB item:', JSON.stringify(item, null, 2));
            const shop = {
                shopId: item.shopId?.S || item.shopId,
                shopName: item.shopName?.S || item.shopName,
                organizationId: item.organizationId?.S || item.organizationId,
                status: item.status?.S || item.status
            };
            console.log('Processing shop item:', JSON.stringify(shop, null, 2));
            return shop;
        });
        
        console.log('Raw shop items from DynamoDB:', JSON.stringify(shopsResult.Items?.slice(0, 2), null, 2));
        console.log('Converted shops:', JSON.stringify(shops.slice(0, 2), null, 2));
        
        console.log('Shops data after conversion:');
        console.log(JSON.stringify(shops, null, 2));
        
        console.log('Organizations data after conversion:');
        console.log(JSON.stringify(organizations, null, 2));
        
        // 販売店データの確認
        console.log('All shops:', JSON.stringify(shops, null, 2));
        console.log('ORG_A shops:', shops.filter(s => s.organizationId === 'ORG_A'));
        console.log('ORG_B shops:', shops.filter(s => s.organizationId === 'ORG_B'));

        // 期間指定がある場合のフィルタリング
        let filterExpression = 'attribute_exists(videoId)';
        let expressionAttributeValues = {};

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

        // 全動画を取得
        const videosParams = {
            TableName: process.env.DYNAMODB_TABLE_VIDEO,
            FilterExpression: filterExpression,
            ExpressionAttributeValues: Object.keys(expressionAttributeValues).length > 0 ? expressionAttributeValues : undefined
        };

        const videosResult = await dynamodb.send(new ScanCommand(videosParams));
        let allVideos = (videosResult.Items || []).map(item => ({
            videoId: item.videoId?.S || item.videoId,
            fileName: item.fileName?.S || item.fileName,
            fileSize: parseInt(item.fileSize?.N || item.fileSize || '0'),
            uploadDate: item.uploadDate?.S || item.uploadDate,
            organizationId: item.organizationId?.S || item.organizationId,
            shopId: item.shopId?.S || item.shopId
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
        const organizationStatsMap = {};
        
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
                status: shop.status
            }));
            const allOrgShops = [...normalizedOrgShops, ...orgShopsFromShopTable];
            const uniqueShops = allOrgShops.filter((shop, index, self) => 
                index === self.findIndex(s => s.shopId === shop.shopId)
            );
            
            console.log(`Organization ${org.organizationId}:`);
            console.log(`  - organizationName: ${org.organizationName}`);
            console.log(`  - Shops from org table: ${orgShopsFromOrg.length}`);
            console.log(`  - Shops from shop table: ${orgShopsFromShopTable.length}`);
            console.log(`  - Total unique shops: ${uniqueShops.length}`);
            console.log(`  - Shop IDs: ${uniqueShops.map(s => s.id || s.shopId).join(', ')}`);
            
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
            console.log(`Initialized organizationStatsMap for ${org.organizationId}: organizationName=${org.organizationName}`);
            
            console.log(`Final shopCount for ${org.organizationId}: ${organizationStatsMap[org.organizationId].shopCount}`);

            // 販売店ごとの統計も初期化
            uniqueShops.forEach(shop => {
                console.log(`Adding shop to ${org.organizationId}: shopId=${shop.shopId}, shopName=${shop.shopName}`);
                organizationStatsMap[org.organizationId].shopStats.push({
                    shopId: shop.shopId,
                    shopName: shop.shopName,
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
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        // 動画データから統計を計算
        console.log('Processing videos:', allVideos.length);
        console.log('Available organizations:', Object.keys(organizationStatsMap));
        console.log('Sample video data:', allVideos.slice(0, 3));
        
        // すべての動画を処理
        allVideos.forEach(video => {
            const orgId = video.organizationId;
            const shopId = video.shopId;

            console.log(`Processing video: orgId=${orgId}, shopId=${shopId}, fileSize=${video.fileSize}`);

            // SYSTEM動画はスキップ（カウントしない）
            if (orgId === 'SYSTEM') {
                console.log('Skipping SYSTEM video:', video.videoId);
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
                    console.log(`Updated shop stat: ${shopId} -> videos: ${shopStat.videoCount}, size: ${shopStat.totalSize}`);
                } else {
                    console.log(`Shop stat not found for: ${shopId} in org: ${orgId}`);
                    console.log(`Available shops in org ${orgId}:`, organizationStatsMap[orgId].shopStats.map(s => s.shopId));
                }
            } else {
                console.log(`Organization not found: ${orgId}`);
                console.log(`Available organizations:`, Object.keys(organizationStatsMap));
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
            console.log(`Mapping organization: ${org.organizationId}, organizationName: ${org.organizationName}, shopStats: ${org.shopStats.length}`);
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
            headers: CORS_HEADERS,
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

    } catch (error) {
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


