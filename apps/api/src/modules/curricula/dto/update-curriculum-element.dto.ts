import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, MaxLength } from 'class-validator';

export class UpdateCurriculumElementDto {
  @ApiProperty({
    example: 1,
    description: 'ID of technique',
    required: false
  })
  @IsNumber()
  @IsOptional()
  techniqueId?: number | null;

  @ApiProperty({
    example: 1,
    description: 'ID of reference asset',
    required: false
  })
  @IsNumber()
  @IsOptional()
  assetId?: number | null;

  @ApiProperty({
    example: 'Updated title',
    description: 'Title for text elements',
    required: false
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string | null;

  @ApiProperty({
    example: 'Updated details',
    description: 'Additional details or notes',
    required: false
  })
  @IsString()
  @IsOptional()
  details?: string | null;
}
