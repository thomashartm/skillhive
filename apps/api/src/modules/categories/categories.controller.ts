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
import { CategoriesService } from './categories.service';
import { TechniquesService } from '../techniques/techniques.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly techniquesService: TechniquesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 409, description: 'Category with slug already exists in discipline' })
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiQuery({ name: 'disciplineId', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of all categories' })
  findAll(@Query('disciplineId', new ParseIntPipe({ optional: true })) disciplineId?: number) {
    return this.categoriesService.findAll(disciplineId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a category by ID' })
  @ApiResponse({ status: 200, description: 'Category found' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a category' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 409, description: 'Category with slug already exists' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a category' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.remove(id);
  }

  @Get(':id/techniques')
  @ApiOperation({ summary: 'Get techniques in a category' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'title', required: false, type: String })
  @ApiQuery({ name: 'tagIds', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of techniques in category' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async getTechniques(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: any,
  ) {
    // Verify category exists first
    await this.categoriesService.findOne(id);

    // Parse query parameters
    const tagId = query.tagIds ? parseInt(query.tagIds, 10) : undefined;
    const title = query.title;

    // Call techniques service with categoryId filter
    return this.techniquesService.findAll(
      undefined, // disciplineId
      id, // categoryId
      tagId,
      title,
      undefined, // ids
      undefined, // include
    );
  }
}
