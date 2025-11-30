import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferenceAsset } from '@trainhive/db';
import { ReferenceAssetsController } from './reference-assets.controller';
import { ReferenceAssetsService } from './reference-assets.service';

@Module({
  imports: [TypeOrmModule.forFeature([ReferenceAsset])],
  controllers: [ReferenceAssetsController],
  providers: [ReferenceAssetsService],
  exports: [ReferenceAssetsService],
})
export class ReferenceAssetsModule {}
