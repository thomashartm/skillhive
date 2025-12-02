import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, MaxLength, IsUrl } from 'class-validator';
import { AssetType, VideoType } from '@trainhive/db';

export class CreateReferenceAssetDto {
  @ApiProperty({ example: 1, description: 'Technique ID', required: false })
  @IsNumber()
  @IsOptional()
  techniqueId?: number;

  @ApiProperty({ enum: AssetType, example: AssetType.VIDEO, description: 'Type of asset' })
  @IsEnum(AssetType)
  @IsNotEmpty()
  type: AssetType;

  @ApiProperty({ example: 'https://youtube.com/watch?v=example', description: 'URL of the asset' })
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  @MaxLength(2000)
  url: string;

  @ApiProperty({ example: 'Triangle Choke Tutorial', description: 'Title of the asset', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @ApiProperty({ example: 'Detailed breakdown of triangle choke', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: VideoType, example: VideoType.INSTRUCTIONAL, required: false })
  @IsEnum(VideoType)
  @IsOptional()
  videoType?: VideoType;

  @ApiProperty({ example: 'John Danaher', description: 'Source or creator name', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  originator?: string;

  @ApiProperty({ example: 0, description: 'Display order', required: false })
  @IsNumber()
  @IsOptional()
  ord?: number;

  @ApiProperty({ example: 1, description: 'ID of user who created this asset', required: false })
  @IsNumber()
  @IsOptional()
  createdBy?: number;
}
