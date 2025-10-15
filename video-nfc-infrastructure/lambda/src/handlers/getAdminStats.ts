import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { parseAuthUser } from '../lib/permissions';
import { handleError, logInfo } from '../lib/errorHandler';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

interface MonthlyStats {
  month: string;      // "2025-01"
  count: number;
  size: number;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logInfo('統計データ取得開始', {}, event);
    
    const user = parseAuthUser(event);
    
    // 権限チェック
    if (!user.groups.includes('system-admin')) {
      throw new Error('システム管理者のみアクセスできます（権限不足）');
    }
    // 全動画取得
    const videosResult = await dynamodb.send(new ScanCommand({
      TableName: process.env.DYNAMODB_TABLE_VIDEO,
      FilterExpression: '#status = :active',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':active': 'active' },
    }));
    
    const videos = videosResult.Items || [];
    
    // 全組織取得
    const orgsResult = await dynamodb.send(new ScanCommand({
      TableName: process.env.DYNAMODB_TABLE_ORGANIZATION,
      FilterExpression: '#status = :active',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':active': 'active' },
    }));
    
    const organizations = orgsResult.Items || [];
    
    // 統計計算
    const totalVideos = videos.length;
    const totalStorage = videos.reduce((sum, v) => sum + (v.fileSize || 0), 0);
    const agencyCount = organizations.filter(o => o.organizationType === 'agency').length;
    const storeCount = organizations.filter(o => o.organizationType === 'store').length;
    
    // 今月のアップロード数
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // "2025-10"
    const thisMonthVideos = videos.filter(v => 
      v.uploadDate && v.uploadDate.slice(0, 7) === currentMonth
    );
    
    // 過去12ヶ月の月次データ
    const monthlyStats: Record<string, MonthlyStats> = {};
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toISOString().slice(0, 7);
      monthlyStats[monthKey] = { month: monthKey, count: 0, size: 0 };
    }
    
    videos.forEach(v => {
      if (!v.uploadDate) return;
      const month = v.uploadDate.slice(0, 7);
      if (monthlyStats[month]) {
        monthlyStats[month].count++;
        monthlyStats[month].size += v.fileSize || 0;
      }
    });
    
    const monthlyData = Object.values(monthlyStats).sort((a, b) => 
      a.month.localeCompare(b.month)
    );
    
    const response = {
      totalVideos,
      totalStorage,
      agencyCount,
      storeCount,
      thisMonthUploads: thisMonthVideos.length,
      monthlyStats: monthlyData,
    };
    
    logInfo('統計データ取得成功', { totalVideos, agencyCount, storeCount }, event);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: response,
      }),
    };
    
  } catch (error) {
    return handleError(error, event, 'getAdminStats');
  }
};
