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
import { TechniquesService } from './techniques.service';
import { CreateTechniqueDto } from './dto/create-technique.dto';
import { UpdateTechniqueDto } from './dto/update-technique.dto';

@ApiTags('techniques')
@Controller('techniques')
export class TechniquesController {
  constructor(private readonly techniquesService: TechniquesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new technique' })
  @ApiResponse({ status: 201, description: 'Technique created successfully' })
  @ApiResponse({ status: 409, description: 'Technique with slug already exists in discipline' })
  create(@Body() createTechniqueDto: CreateTechniqueDto) {
    return this.techniquesService.create(createTechniqueDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all techniques' })
  @ApiQuery({ name: 'disciplineId', required: false, type: Number })
  @ApiQuery({ name: 'categoryId', required: false, type: Number })
  @ApiQuery({ name: 'tagId', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'ids', required: false, type: String })
  @ApiQuery({ name: 'include', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of all techniques' })
  findAll(@Query() query: any) {
    const disciplineId = query.disciplineId ? parseInt(query.disciplineId, 10) : undefined;
    const categoryId = query.categoryId ? parseInt(query.categoryId, 10) : undefined;
    const tagId = query.tagId ? parseInt(query.tagId, 10) : undefined;
    const search = query.search;
    const ids = query.ids;
    const include = query.include;

    return this.techniquesService.findAll(
      disciplineId,
      categoryId,
      tagId,
      search,
      ids,
      include,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a technique by ID' })
  @ApiResponse({ status: 200, description: 'Technique found' })
  @ApiResponse({ status: 404, description: 'Technique not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.techniquesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a technique' })
  @ApiResponse({ status: 200, description: 'Technique updated successfully' })
  @ApiResponse({ status: 404, description: 'Technique not found' })
  @ApiResponse({ status: 409, description: 'Technique with slug already exists' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTechniqueDto: UpdateTechniqueDto,
  ) {
    return this.techniquesService.update(id, updateTechniqueDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a technique' })
  @ApiResponse({ status: 200, description: 'Technique deleted successfully' })
  @ApiResponse({ status: 404, description: 'Technique not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.techniquesService.remove(id);
  }
}
