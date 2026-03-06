import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const logInfo = (message: string, data: any = {}, event?: APIGatewayProxyEvent) => {
    console.log(JSON.stringify({
        level: 'INFO',
        message,
        data,
        requestId: event?.requestContext?.requestId,
        path: event?.path,
        method: event?.httpMethod,
        timestamp: new Date().toISOString(),
    }));
};

export const logError = (message: string, error: any, event?: APIGatewayProxyEvent) => {
    console.error(JSON.stringify({
        level: 'ERROR',
        message,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        requestId: event?.requestContext?.requestId,
        path: event?.path,
        method: event?.httpMethod,
        timestamp: new Date().toISOString(),
    }));
};

/**
 * リクエストのOriginヘッダーを許可リストと照合し、CORSヘッダーを返す
 */
export const getCorsHeaders = (event: APIGatewayProxyEvent): Record<string, string> => {
    const origin = event.headers?.Origin || event.headers?.origin || '';
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
    const allowedOrigin = allowedOrigins.includes(origin) ? origin : (allowedOrigins[0] || '');

    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Credentials': 'true',
    };
};

export const handleError = (error: any, event: APIGatewayProxyEvent, context: string): APIGatewayProxyResult => {
    logError(`Error in ${context}`, error, event);

    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';

    return {
        statusCode,
        headers: getCorsHeaders(event),
        body: JSON.stringify({
            success: false,
            error: {
                message,
                code: error.code || 'INTERNAL_SERVER_ERROR',
            },
            requestId: event.requestContext.requestId,
        }),
    };
};
