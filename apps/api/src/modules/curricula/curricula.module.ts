import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Curriculum, CurriculumElement } from '@trainhive/db';
import { CurriculaController } from './curricula.controller';
import { CurriculaService } from './curricula.service';

@Module({
  imports: [TypeOrmModule.forFeature([Curriculum, CurriculumElement])],
  controllers: [CurriculaController],
  providers: [CurriculaService],
  exports: [CurriculaService],
})
export class CurriculaModule {}
