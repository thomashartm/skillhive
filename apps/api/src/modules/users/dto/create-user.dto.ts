import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEmail, IsEnum, MaxLength, IsUrl } from 'class-validator';
import { UserRole } from '@trainhive/shared';

export class CreateUserDto {
  @ApiProperty({ example: 'john.doe', description: 'User handle/username', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  handle?: string;

  @ApiProperty({ example: 'John Doe', description: 'Full name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'john@example.com', description: 'Email address' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  @ApiProperty({ enum: UserRole, example: UserRole.USER, description: 'User role', required: false })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', description: 'Avatar URL', required: false })
  @IsUrl()
  @IsOptional()
  @MaxLength(500)
  avatarUrl?: string;

  @ApiProperty({ example: 'securePassword123', description: 'User password', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  password?: string;
}
