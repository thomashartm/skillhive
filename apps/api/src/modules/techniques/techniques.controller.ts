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
  @ApiResponse({ status: 200, description: 'List of all techniques' })
  findAll(@Query('disciplineId', new ParseIntPipe({ optional: true })) disciplineId?: number) {
    return this.techniquesService.findAll(disciplineId);
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
