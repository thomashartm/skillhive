import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '@trainhive/db';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { TechniquesModule } from '../techniques/techniques.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category]),
    TechniquesModule,
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
