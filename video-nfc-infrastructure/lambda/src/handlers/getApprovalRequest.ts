import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handleError, logInfo } from '../lib/errorHandler';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const APPROVAL_TABLE_NAME = process.env.DYNAMODB_TABLE_APPROVAL_REQUEST!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logInfo('承認申請取得開始', {}, event);
    
    const requestId = event.pathParameters?.requestId;
    
    if (!requestId) {
      throw new Error('requestIdが指定されていません');
    }
    
    // 承認申請を取得
    const getResult = await dynamodb.send(new GetCommand({
      TableName: APPROVAL_TABLE_NAME,
      Key: { requestId },
    }));
    
    const approvalRequest = getResult.Item;
    
    if (!approvalRequest) {
      throw new Error('承認申請が見つかりません');
    }
    
    logInfo('承認申請取得成功', { requestId, status: approvalRequest.status }, event);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: approvalRequest,
      }),
    };
    
  } catch (error) {
    return handleError(error, event, 'getApprovalRequest');
  }
};






