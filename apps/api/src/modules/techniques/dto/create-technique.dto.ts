import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, MaxLength, IsArray } from 'class-validator';

export class CreateTechniqueDto {
  @ApiProperty({ example: 1, description: 'Discipline ID' })
  @IsNumber()
  @IsNotEmpty()
  disciplineId: number;

  @ApiProperty({ example: 'Arm Bar from Guard', description: 'Technique name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'arm-bar-from-guard', description: 'URL-friendly slug', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  slug?: string;

  @ApiProperty({ example: 'A submission technique from guard position', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: [1, 2], description: 'Category IDs to associate', required: false, type: [Number] })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  categoryIds?: number[];
}
