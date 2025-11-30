import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@trainhive/shared';
import { DisciplinesService } from './disciplines.service';
import { CreateDisciplineDto } from './dto/create-discipline.dto';
import { UpdateDisciplineDto } from './dto/update-discipline.dto';
import { Public, Roles, Scopes } from '../../auth/decorators';
import {
  SCOPE_WRITE_DISCIPLINES,
  SCOPE_DELETE_DISCIPLINES,
} from '@trainhive/shared';

@ApiTags('disciplines')
@Controller('disciplines')
export class DisciplinesController {
  constructor(private readonly disciplinesService: DisciplinesService) {}

  @Post()
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Scopes(SCOPE_WRITE_DISCIPLINES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new discipline (MANAGER+ only)' })
  @ApiResponse({ status: 201, description: 'Discipline created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 409, description: 'Discipline with slug already exists' })
  create(@Body() createDisciplineDto: CreateDisciplineDto) {
    return this.disciplinesService.create(createDisciplineDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all disciplines (public)' })
  @ApiResponse({ status: 200, description: 'List of all disciplines' })
  findAll() {
    return this.disciplinesService.findAll();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a discipline by ID (public)' })
  @ApiResponse({ status: 200, description: 'Discipline found' })
  @ApiResponse({ status: 404, description: 'Discipline not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.disciplinesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Scopes(SCOPE_WRITE_DISCIPLINES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a discipline (MANAGER+ only)' })
  @ApiResponse({ status: 200, description: 'Discipline updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Discipline not found' })
  @ApiResponse({ status: 409, description: 'Discipline with slug already exists' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDisciplineDto: UpdateDisciplineDto,
  ) {
    return this.disciplinesService.update(id, updateDisciplineDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @Scopes(SCOPE_DELETE_DISCIPLINES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a discipline (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Discipline deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Discipline not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.disciplinesService.remove(id);
  }
}
