import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 1, description: 'Discipline ID' })
  @IsNumber()
  @IsNotEmpty()
  disciplineId: number;

  @ApiProperty({ example: 'Guard Passes', description: 'Category name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'guard-passes', description: 'URL-friendly slug', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  slug?: string;

  @ApiProperty({ example: 'Techniques for passing the guard', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 1, description: 'Parent category ID', required: false })
  @IsNumber()
  @IsOptional()
  parentId?: number;
}
