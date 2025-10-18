const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Development-Mode',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
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
            FilterExpression: 'attribute_exists(organizationId) AND #status <> :status',
            ExpressionAttributeNames: {
                '#status': 'status'
            },
            ExpressionAttributeValues: {
                ':status': 'inactive'
            }
        };

        const organizationsResult = await dynamodb.send(new ScanCommand(organizationsParams));
        const organizations = (organizationsResult.Items || []).map(item => {
            const org = {
                organizationId: item.organizationId?.S,
                organizationName: item.organizationName?.S,
                status: item.status?.S
            };
            console.log(`Organization ${org.organizationId}: organizationName=${org.organizationName}`);
            return org;
        });
        
        console.log('Organizations after conversion:');
        console.log(JSON.stringify(organizations, null, 2));

        // 販売店データも取得
        const shopsParams = {
            TableName: process.env.DYNAMODB_TABLE_SHOP,
            FilterExpression: 'attribute_exists(shopId) AND #status <> :status',
            ExpressionAttributeNames: {
                '#status': 'status'
            },
            ExpressionAttributeValues: {
                ':status': 'inactive'
            }
        };

        const shopsResult = await dynamodb.send(new ScanCommand(shopsParams));
        const shops = (shopsResult.Items || []).map(item => ({
            shopId: item.shopId?.S,
            shopName: item.shopName?.S,
            organizationId: item.organizationId?.S,
            status: item.status?.S
        }));
        
        console.log('Shops data after conversion:');
        console.log(JSON.stringify(shops, null, 2));
        
        console.log('Organizations data after conversion:');
        console.log(JSON.stringify(organizations, null, 2));
        
        // 販売店データの確認
        console.log('ORG_A shops:', shops.filter(s => s.organizationId === 'ORG_A'));
        console.log('ORG_B shops:', shops.filter(s => s.organizationId === 'ORG_B'));

        // 期間指定がある場合のフィルタリング
        let filterExpression = 'attribute_exists(videoId)';
        let expressionAttributeValues = {};

        if (startDate || endDate) {
            if (startDate) {
                filterExpression += ' AND uploadDate >= :startDate';
                expressionAttributeValues[':startDate'] = startDate;
            }
            if (endDate) {
                filterExpression += ' AND uploadDate <= :endDate';
                expressionAttributeValues[':endDate'] = endDate;
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
            videoId: item.videoId?.S,
            fileName: item.fileName?.S,
            fileSize: parseInt(item.fileSize?.N || '0'),
            uploadDate: item.uploadDate?.S,
            organizationId: item.organizationId?.S,
            shopId: item.shopId?.S
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
            // 組織に属する販売店を取得
            const orgShops = shops.filter(shop => shop.organizationId === org.organizationId);
            
            console.log(`Organization ${org.organizationId}:`);
            console.log(`  - Total shops: ${shops.length}`);
            console.log(`  - Filtered shops: ${orgShops.length}`);
            console.log(`  - Shop IDs: ${orgShops.map(s => s.shopId).join(', ')}`);
            
            organizationStatsMap[org.organizationId] = {
                organizationId: org.organizationId,
                organizationName: org.organizationName,
                shopCount: orgShops.length,
                totalVideos: 0,
                totalSize: 0,
                monthlyVideos: 0,
                weeklyVideos: 0,
                shopStats: []
            };
            
            console.log(`Final shopCount for ${org.organizationId}: ${organizationStatsMap[org.organizationId].shopCount}`);
            
            console.log(`Setting shopCount for ${org.organizationId}: ${orgShops.length}`);

            // 販売店ごとの統計も初期化
            orgShops.forEach(shop => {
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
        allVideos.forEach(video => {
            const orgId = video.organizationId;
            const shopId = video.shopId;

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
            const result = {
                ...org,
                shopCount: org.shopStats.length,
                organizationName: org.organizationName || org.name || `組織${org.organizationId}`
            };
            console.log(`Final organization: ${result.organizationId} -> ${result.organizationName}`);
            return result;
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


