import { IsString, IsUrl, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum VideoProvider {
  YOUTUBE = 'youtube',
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
}

export class OEmbedQueryDto {
  @ApiProperty({
    description: 'Video URL to fetch metadata for',
    example: 'https://www.youtube.com/watch?v=kPZh0ZZyZj0',
  })
  @IsUrl()
  @IsString()
  url: string;

  @ApiPropertyOptional({
    description: 'Optional provider hint (auto-detected if not specified)',
    enum: VideoProvider,
    example: 'youtube',
  })
  @IsOptional()
  @IsEnum(VideoProvider)
  provider?: VideoProvider;
}
