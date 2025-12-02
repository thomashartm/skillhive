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
  Request,
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

  @Get('my-assets')
  @ApiOperation({ summary: 'Get current user\'s reference assets with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'title', required: false, type: String })
  @ApiQuery({ name: 'techniqueName', required: false, type: String })
  @ApiQuery({ name: 'categoryName', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'Paginated list of user\'s assets' })
  getMyAssets(@Query() query: any, @Request() req: any) {
    const userId = req.user.userId;
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 10;
    const title = query.title;
    const techniqueName = query.techniqueName;
    const categoryName = query.categoryName;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = (query.sortOrder as 'asc' | 'desc') || 'desc';

    return this.assetsService.findUserAssets(userId, {
      page,
      limit,
      title,
      techniqueName,
      categoryName,
      sortBy,
      sortOrder,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all reference assets' })
  @ApiQuery({ name: 'techniqueId', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'title', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of reference assets (paginated if page param provided)' })
  findAll(@Query() query: any) {
    const techniqueId = query.techniqueId ? parseInt(query.techniqueId, 10) : undefined;
    const page = query.page ? parseInt(query.page, 10) : undefined;
    const limit = query.limit ? parseInt(query.limit, 10) : undefined;
    const sortBy = query.sortBy;
    const sortOrder = query.sortOrder as 'asc' | 'desc' | undefined;
    const title = query.title;

    return this.assetsService.findAll({
      techniqueId,
      page,
      limit,
      sortBy,
      sortOrder,
      title,
    });
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
