import { SetMetadata } from '@nestjs/common';

// Metadata key for required scopes
export const SCOPES_KEY = 'scopes';

/**
 * Requires one or more OAuth scopes for route access
 * @param scopes - Scopes that are required to access this route
 * @example
 * @Scopes('write:techniques', 'write:curricula')
 * @Post()
 * createTechnique(@Body() dto: CreateTechniqueDto) { ... }
 */
export const Scopes = (...scopes: string[]) => SetMetadata(SCOPES_KEY, scopes);
