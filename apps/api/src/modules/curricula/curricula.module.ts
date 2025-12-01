import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Curriculum, CurriculumElement, Technique, ReferenceAsset } from '@trainhive/db';
import { CurriculaController } from './curricula.controller';
import { CurriculaService } from './curricula.service';

@Module({
  imports: [TypeOrmModule.forFeature([Curriculum, CurriculumElement, Technique, ReferenceAsset])],
  controllers: [CurriculaController],
  providers: [CurriculaService],
  exports: [CurriculaService],
})
export class CurriculaModule {}
