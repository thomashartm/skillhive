import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, MaxLength, IsEnum } from 'class-validator';

export enum ElementType {
  TECHNIQUE = 'technique',
  ASSET = 'asset',
  TEXT = 'text',
}

export class CreateCurriculumElementDto {
  @ApiProperty({
    enum: ElementType,
    example: 'technique',
    description: 'Type of curriculum element'
  })
  @IsEnum(ElementType)
  @IsNotEmpty()
  type: ElementType;

  @ApiProperty({
    example: 1,
    description: 'ID of technique (required if type is technique)',
    required: false
  })
  @IsNumber()
  @IsOptional()
  techniqueId?: number | null;

  @ApiProperty({
    example: 1,
    description: 'ID of reference asset (required if type is asset)',
    required: false
  })
  @IsNumber()
  @IsOptional()
  assetId?: number | null;

  @ApiProperty({
    example: 'Introduction',
    description: 'Title for text elements',
    required: false
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string | null;

  @ApiProperty({
    example: 'Additional notes or details for this element',
    description: 'Additional details or notes',
    required: false
  })
  @IsString()
  @IsOptional()
  details?: string | null;
}
