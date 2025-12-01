import { SetMetadata, applyDecorators } from '@nestjs/common';
export const CACHED_META_KEY = 'cached:ttl';
export function Cached(ttlSeconds?: number) { return applyDecorators(SetMetadata(CACHED_META_KEY, ttlSeconds ?? 300)); }

