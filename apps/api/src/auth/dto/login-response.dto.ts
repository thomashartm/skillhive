import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@trainhive/shared';

export class LoginResponseDto {
  @ApiProperty({
    description: 'JWT access token - use in Authorization header as Bearer token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Token type',
    example: 'Bearer',
  })
  tokenType: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 604800,
  })
  expiresIn: number;

  @ApiProperty({
    description: 'Authenticated user information',
  })
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    scopes: string[];
  };
}
