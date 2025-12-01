import { SetMetadata } from '@nestjs/common';

export const PUBLIC_ROUTE_KEY = 'isPublicRoute';
export const PublicRoute = () => SetMetadata(PUBLIC_ROUTE_KEY, true);
