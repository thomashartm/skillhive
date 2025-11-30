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
  ParseBoolPipe,
  Logger,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CurriculaService } from './curricula.service';
import { CreateCurriculumDto } from './dto/create-curriculum.dto';
import { UpdateCurriculumDto } from './dto/update-curriculum.dto';

@ApiTags('curricula')
@Controller('curricula')
export class CurriculaController {
  private readonly logger = new Logger(CurriculaController.name);

  constructor(private readonly curriculaService: CurriculaService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new curriculum' })
  @ApiResponse({ status: 201, description: 'Curriculum created successfully' })
  create(@Body() createCurriculumDto: CreateCurriculumDto, @Req() req: any) {
    this.logger.log(`Creating curriculum. User: ${JSON.stringify(req.user)}`);
    this.logger.debug(`Auth Header: ${req.headers.authorization ? 'Present' : 'Missing'}`);
    return this.curriculaService.create(createCurriculumDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all curricula' })
  @ApiQuery({ name: 'createdBy', required: false, type: Number })
  @ApiQuery({ name: 'isPublic', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of all curricula' })
  findAll(
    @Req() req: any,
    @Query('createdBy', new ParseIntPipe({ optional: true })) createdBy?: number,
    @Query('isPublic', new ParseBoolPipe({ optional: true })) isPublic?: boolean,
  ) {
    this.logger.log(`Finding all curricula. User: ${JSON.stringify(req.user)}`);
    return this.curriculaService.findAll(createdBy, isPublic);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a curriculum by ID' })
  @ApiResponse({ status: 200, description: 'Curriculum found' })
  @ApiResponse({ status: 404, description: 'Curriculum not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.curriculaService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a curriculum' })
  @ApiResponse({ status: 200, description: 'Curriculum updated successfully' })
  @ApiResponse({ status: 404, description: 'Curriculum not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCurriculumDto: UpdateCurriculumDto,
  ) {
    return this.curriculaService.update(id, updateCurriculumDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a curriculum' })
  @ApiResponse({ status: 200, description: 'Curriculum deleted successfully' })
  @ApiResponse({ status: 404, description: 'Curriculum not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.curriculaService.remove(id);
  }
}
