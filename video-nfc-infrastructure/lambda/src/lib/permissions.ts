import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export interface AuthUser {
    sub: string;
    email: string;
    groups: string[];
    organizationId?: string;
    organizationName?: string;
    shopId?: string;
    shopName?: string;
}

export const parseAuthUser = (event: APIGatewayProxyEvent): AuthUser => {
    const claims = event.requestContext.authorizer?.claims;

    if (!claims) {
        // Development mode fallback or public access
        const devMode = event.headers['X-Development-Mode'] === 'true' || event.headers['x-development-mode'] === 'true';
        if (devMode || process.env.ENVIRONMENT === 'dev') {
            // Return a mock system admin for dev/testing if no auth
            return {
                sub: 'dev-user',
                email: 'dev@example.com',
                groups: ['system-admin'],
            };
        }
        throw new Error('Unauthorized: No claims found');
    }

    const groups = claims['cognito:groups'] ?
        (Array.isArray(claims['cognito:groups']) ? claims['cognito:groups'] : claims['cognito:groups'].split(','))
        : [];

    return {
        sub: claims.sub,
        email: claims.email,
        groups: groups,
        organizationId: claims['custom:organizationId'],
        organizationName: claims['custom:organizationName'],
        shopId: claims['custom:shopId'],
        shopName: claims['custom:shopName'],
    };
};
