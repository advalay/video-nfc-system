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
        throw new Error('Unauthorized: No authentication claims found');
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
