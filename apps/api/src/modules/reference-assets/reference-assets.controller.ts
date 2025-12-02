import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ReferenceAssetsService } from './reference-assets.service';
import { CreateReferenceAssetDto } from './dto/create-reference-asset.dto';
import { UpdateReferenceAssetDto } from './dto/update-reference-asset.dto';

@ApiTags('reference-assets')
@Controller('reference-assets')
export class ReferenceAssetsController {
  constructor(private readonly assetsService: ReferenceAssetsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new reference asset' })
  @ApiResponse({ status: 201, description: 'Reference asset created successfully' })
  create(@Body() createAssetDto: CreateReferenceAssetDto) {
    return this.assetsService.create(createAssetDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all reference assets' })
  @ApiQuery({ name: 'techniqueId', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of all reference assets' })
  findAll(@Query() query: any) {
    const techniqueId = query.techniqueId ? parseInt(query.techniqueId, 10) : undefined;
    return this.assetsService.findAll(techniqueId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a reference asset by ID' })
  @ApiResponse({ status: 200, description: 'Reference asset found' })
  @ApiResponse({ status: 404, description: 'Reference asset not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.assetsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a reference asset' })
  @ApiResponse({ status: 200, description: 'Reference asset updated successfully' })
  @ApiResponse({ status: 404, description: 'Reference asset not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAssetDto: UpdateReferenceAssetDto,
  ) {
    return this.assetsService.update(id, updateAssetDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a reference asset' })
  @ApiResponse({ status: 200, description: 'Reference asset deleted successfully' })
  @ApiResponse({ status: 404, description: 'Reference asset not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.assetsService.remove(id);
  }
}
