import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, MaxLength } from 'class-validator';

export class CreateTagDto {
  @ApiProperty({ example: 1, description: 'Discipline ID' })
  @IsNumber()
  @IsNotEmpty()
  disciplineId: number;

  @ApiProperty({ example: 'Beginner Friendly', description: 'Tag name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'beginner-friendly', description: 'URL-friendly slug', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  slug?: string;

  @ApiProperty({ example: 'Techniques suitable for beginners', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '#4CAF50', description: 'Hex color code for UI display', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  color?: string;
}
