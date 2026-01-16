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

export const handleError = (error: any, event: APIGatewayProxyEvent, context: string): APIGatewayProxyResult => {
    logError(`Error in ${context}`, error, event);

    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';

    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': 'true',
        },
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
