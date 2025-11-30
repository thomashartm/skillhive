import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Technique, TechniqueCategory } from '@trainhive/db';
import { TechniquesController } from './techniques.controller';
import { TechniquesService } from './techniques.service';

@Module({
  imports: [TypeOrmModule.forFeature([Technique, TechniqueCategory])],
  controllers: [TechniquesController],
  providers: [TechniquesService],
  exports: [TechniquesService],
})
export class TechniquesModule {}
