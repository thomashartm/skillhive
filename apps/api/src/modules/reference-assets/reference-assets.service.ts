import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReferenceAsset } from '@trainhive/db';
import { CreateReferenceAssetDto } from './dto/create-reference-asset.dto';
import { UpdateReferenceAssetDto } from './dto/update-reference-asset.dto';

@Injectable()
export class ReferenceAssetsService {
  constructor(
    @InjectRepository(ReferenceAsset)
    private assetRepository: Repository<ReferenceAsset>,
  ) {}

  async create(createAssetDto: CreateReferenceAssetDto): Promise<ReferenceAsset> {
    const asset = this.assetRepository.create(createAssetDto);
    return this.assetRepository.save(asset);
  }

  async findAll(techniqueId?: number): Promise<ReferenceAsset[]> {
    const query = this.assetRepository.createQueryBuilder('asset');

    if (techniqueId) {
      query.where('asset.techniqueId = :techniqueId', { techniqueId });
    }

    return query.orderBy('asset.ord', 'ASC')
      .addOrderBy('asset.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: number): Promise<ReferenceAsset> {
    const asset = await this.assetRepository.findOne({ where: { id } });
    if (!asset) {
      throw new NotFoundException(`Reference asset with ID ${id} not found`);
    }
    return asset;
  }

  async update(id: number, updateAssetDto: UpdateReferenceAssetDto): Promise<ReferenceAsset> {
    const asset = await this.findOne(id);
    Object.assign(asset, updateAssetDto);
    return this.assetRepository.save(asset);
  }

  async remove(id: number): Promise<void> {
    const asset = await this.findOne(id);
    await this.assetRepository.remove(asset);
  }
}
