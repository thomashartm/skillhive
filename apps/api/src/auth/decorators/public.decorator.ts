import { SetMetadata } from '@nestjs/common';

// Metadata key for public routes
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as public (no authentication required)
 * @example
 * @Public()
 * @Get('health')
 * healthCheck() { return { status: 'ok' }; }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
