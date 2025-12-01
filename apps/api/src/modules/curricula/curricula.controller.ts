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
  Logger,
  Req,
  UseInterceptors,
  Put,
} from '@nestjs/common';
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CurriculaService } from './curricula.service';
import { CreateCurriculumDto } from './dto/create-curriculum.dto';
import { UpdateCurriculumDto } from './dto/update-curriculum.dto';
import { CreateCurriculumElementDto } from './dto/create-curriculum-element.dto';
import { UpdateCurriculumElementDto } from './dto/update-curriculum-element.dto';
import { ReorderElementsDto } from './dto/reorder-elements.dto';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('CurriculaRequest');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    this.logger.log(`[BEFORE VALIDATION] ${request.method} ${request.url}`);
    this.logger.log(`[BEFORE VALIDATION] Query params: ${JSON.stringify(request.query)}`);
    this.logger.log(`[BEFORE VALIDATION] Headers: ${JSON.stringify(request.headers)}`);
    return next.handle().pipe(
      tap(() => this.logger.log(`[AFTER HANDLER] Request completed successfully`))
    );
  }
}

@ApiTags('curricula')
@Controller('curricula')
@UseInterceptors(LoggingInterceptor)
export class CurriculaController {
  private readonly logger = new Logger(CurriculaController.name);

  constructor(private readonly curriculaService: CurriculaService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new curriculum' })
  @ApiResponse({ status: 201, description: 'Curriculum created successfully' })
  create(@Body() createCurriculumDto: CreateCurriculumDto, @Req() req: any) {
    this.logger.log(`Creating curriculum. User: ${JSON.stringify(req.user)}`);
    this.logger.debug(`Auth Header: ${req.headers.authorization ? 'Present' : 'Missing'}`);

    // Extract user ID from authenticated session and add to DTO
    const userId = parseInt(req.user.id, 10);
    const dtoWithUser = { ...createCurriculumDto, createdBy: userId };

    this.logger.log(`Creating curriculum with createdBy: ${userId}`);
    return this.curriculaService.create(dtoWithUser);
  }

  @Get()
  @ApiOperation({ summary: 'Get all curricula' })
  @ApiQuery({ name: 'createdBy', required: false, type: Number })
  @ApiQuery({ name: 'isPublic', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of all curricula' })
  findAll(
    @Req() req: any,
    @Query('createdBy') createdByRaw?: string,
    @Query('isPublic') isPublicRaw?: string,
  ) {
    this.logger.log(`[GET /curricula] Raw query: ${JSON.stringify(req.query)}`);

    // Parse query params manually to handle optional values properly
    const createdBy = createdByRaw !== undefined ? parseInt(createdByRaw, 10) : undefined;
    const isPublic = isPublicRaw !== undefined ? isPublicRaw === 'true' : undefined;

    // Validate parsed values
    if (createdBy !== undefined && isNaN(createdBy)) {
      throw new Error('createdBy must be a valid number');
    }

    this.logger.log(`[GET /curricula] Parsed params - createdBy: ${createdBy}, isPublic: ${isPublic}`);
    this.logger.log(`[GET /curricula] User: ${JSON.stringify(req.user)}`);
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

  // ============================================================================
  // Curriculum Element Routes
  // ============================================================================

  @Post(':id/elements')
  @ApiOperation({ summary: 'Add an element to a curriculum' })
  @ApiResponse({ status: 201, description: 'Element added successfully' })
  @ApiResponse({ status: 404, description: 'Curriculum not found' })
  @ApiResponse({ status: 400, description: 'Invalid element data' })
  addElement(
    @Param('id', ParseIntPipe) id: number,
    @Body() createElementDto: CreateCurriculumElementDto,
  ) {
    return this.curriculaService.addElement(id, createElementDto);
  }

  @Get(':id/elements')
  @ApiOperation({ summary: 'List all elements in a curriculum' })
  @ApiResponse({ status: 200, description: 'List of curriculum elements' })
  @ApiResponse({ status: 404, description: 'Curriculum not found' })
  listElements(@Param('id', ParseIntPipe) id: number) {
    return this.curriculaService.listElements(id);
  }

  @Put(':id/elements/:elementId')
  @ApiOperation({ summary: 'Update a curriculum element' })
  @ApiResponse({ status: 200, description: 'Element updated successfully' })
  @ApiResponse({ status: 404, description: 'Element or curriculum not found' })
  updateElement(
    @Param('id', ParseIntPipe) id: number,
    @Param('elementId', ParseIntPipe) elementId: number,
    @Body() updateElementDto: UpdateCurriculumElementDto,
  ) {
    return this.curriculaService.updateElement(id, elementId, updateElementDto);
  }

  @Delete(':id/elements/:elementId')
  @ApiOperation({ summary: 'Delete a curriculum element' })
  @ApiResponse({ status: 200, description: 'Element deleted successfully' })
  @ApiResponse({ status: 404, description: 'Element or curriculum not found' })
  removeElement(
    @Param('id', ParseIntPipe) id: number,
    @Param('elementId', ParseIntPipe) elementId: number,
  ) {
    return this.curriculaService.removeElement(id, elementId);
  }

  @Put(':id/elements/reorder')
  @ApiOperation({ summary: 'Reorder curriculum elements' })
  @ApiResponse({ status: 200, description: 'Elements reordered successfully' })
  @ApiResponse({ status: 404, description: 'Curriculum not found' })
  @ApiResponse({ status: 400, description: 'Invalid element IDs' })
  reorderElements(
    @Param('id', ParseIntPipe) id: number,
    @Body() reorderDto: ReorderElementsDto,
  ) {
    return this.curriculaService.reorderElements(id, reorderDto);
  }
}
