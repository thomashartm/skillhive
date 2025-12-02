import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { OEmbedService, OEmbedResponse } from './oembed.service';
import { OEmbedQueryDto, VideoProvider } from './dto/oembed-query.dto';

@ApiTags('oembed')
@Controller('oembed')
export class OEmbedController {
  constructor(private readonly oembedService: OEmbedService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Fetch video metadata from oEmbed providers',
    description: 'Supports YouTube, Facebook, and Instagram. Provider is auto-detected from URL.',
  })
  @ApiQuery({ name: 'url', required: true, type: String, description: 'Video URL' })
  @ApiQuery({
    name: 'provider',
    required: false,
    enum: VideoProvider,
    description: 'Optional provider hint (auto-detected if not specified)'
  })
  @ApiResponse({
    status: 200,
    description: 'Video metadata fetched successfully',
    schema: {
      type: 'object',
      properties: {
        provider: { type: 'string', example: 'youtube' },
        title: { type: 'string', example: 'Video Title' },
        author: { type: 'string', example: 'Author Name' },
        authorUrl: { type: 'string', example: 'https://example.com/author' },
        thumbnailUrl: { type: 'string', example: 'https://example.com/thumbnail.jpg' },
        embedHtml: { type: 'string', example: '<iframe>...</iframe>' },
        width: { type: 'number', example: 1280 },
        height: { type: 'number', example: 720 },
        rawData: { type: 'object', description: 'Raw oEmbed response from provider' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid URL or unsupported provider' })
  @ApiResponse({ status: 500, description: 'Failed to fetch video metadata' })
  async getMetadata(@Query() query: OEmbedQueryDto): Promise<OEmbedResponse> {
    return this.oembedService.fetchMetadata(query.url, query.provider);
  }
}
