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

  async findAll(options?: {
    techniqueId?: number;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    title?: string;
  }): Promise<ReferenceAsset[] | { data: ReferenceAsset[]; pagination: any }> {
    const query = this.assetRepository.createQueryBuilder('asset');

    // Apply filters
    if (options?.techniqueId) {
      query.where('asset.techniqueId = :techniqueId', { techniqueId: options.techniqueId });
    }

    if (options?.title) {
      query.andWhere('asset.title LIKE :title', { title: `%${options.title}%` });
    }

    // Apply sorting
    const sortBy = options?.sortBy || 'ord';
    const sortOrder = options?.sortOrder || 'asc';

    if (sortBy === 'ord') {
      query.orderBy('asset.ord', sortOrder.toUpperCase() as 'ASC' | 'DESC')
        .addOrderBy('asset.createdAt', 'DESC');
    } else {
      query.orderBy(`asset.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');
    }

    // If pagination requested, apply it
    if (options?.page && options?.limit) {
      const page = options.page;
      const limit = options.limit;
      const skip = (page - 1) * limit;

      const [data, total] = await query.skip(skip).take(limit).getManyAndCount();

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    // Otherwise return all (backward compatible)
    return query.getMany();
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

  async findUserAssets(
    userId: number,
    options: {
      page: number;
      limit: number;
      title?: string;
      techniqueName?: string;
      categoryName?: string;
      sortBy: string;
      sortOrder: 'asc' | 'desc';
    },
  ) {
    const query = this.assetRepository
      .createQueryBuilder('asset')
      .where('asset.createdBy = :userId', { userId })
      .leftJoin('techniques', 'technique', 'asset.techniqueId = technique.id')
      .leftJoin('technique_categories', 'techniqueCategory', 'technique.id = techniqueCategory.techniqueId')
      .leftJoin('categories', 'category', 'techniqueCategory.categoryId = category.id')
      .select([
        'asset.id',
        'asset.title',
        'asset.url',
        'asset.videoType',
        'asset.createdAt',
        'technique.id',
        'technique.name',
        'technique.slug',
      ])
      .addSelect('GROUP_CONCAT(DISTINCT category.id)', 'categoryIds')
      .addSelect('GROUP_CONCAT(DISTINCT category.name)', 'categoryNames')
      .addSelect('GROUP_CONCAT(DISTINCT category.slug)', 'categorySlugs')
      .groupBy('asset.id')
      .addGroupBy('technique.id');

    // Apply filters
    if (options.title) {
      query.andWhere('asset.title LIKE :title', { title: `%${options.title}%` });
    }

    if (options.techniqueName) {
      query.andWhere('technique.name LIKE :techniqueName', {
        techniqueName: `%${options.techniqueName}%`,
      });
    }

    if (options.categoryName) {
      query.andWhere('category.name LIKE :categoryName', {
        categoryName: `%${options.categoryName}%`,
      });
    }

    // Apply sorting
    const sortField = options.sortBy === 'technique' ? 'technique.name' : `asset.${options.sortBy}`;
    query.orderBy(sortField, options.sortOrder.toUpperCase() as 'ASC' | 'DESC');

    // Pagination
    const skip = (options.page - 1) * options.limit;
    const rawResults = await query.skip(skip).take(options.limit).getRawMany();

    // Count total (without pagination)
    const countQuery = this.assetRepository
      .createQueryBuilder('asset')
      .where('asset.createdBy = :userId', { userId });

    if (options.title) {
      countQuery.andWhere('asset.title LIKE :title', { title: `%${options.title}%` });
    }

    if (options.techniqueName) {
      countQuery
        .leftJoin('techniques', 'technique', 'asset.techniqueId = technique.id')
        .andWhere('technique.name LIKE :techniqueName', {
          techniqueName: `%${options.techniqueName}%`,
        });
    }

    if (options.categoryName) {
      countQuery
        .leftJoin('techniques', 'technique', 'asset.techniqueId = technique.id')
        .leftJoin('technique_categories', 'techniqueCategory', 'technique.id = techniqueCategory.techniqueId')
        .leftJoin('categories', 'category', 'techniqueCategory.categoryId = category.id')
        .andWhere('category.name LIKE :categoryName', {
          categoryName: `%${options.categoryName}%`,
        });
    }

    const total = await countQuery.getCount();

    // Format response
    const videos = rawResults.map((row) => {
      const categoryIds = row.categoryIds ? row.categoryIds.split(',') : [];
      const categoryNames = row.categoryNames ? row.categoryNames.split(',') : [];
      const categorySlugs = row.categorySlugs ? row.categorySlugs.split(',') : [];

      const categories = categoryIds.map((id: string, index: number) => ({
        id: parseInt(id, 10),
        name: categoryNames[index],
        slug: categorySlugs[index],
      }));

      return {
        id: row.asset_id,
        title: row.asset_title,
        url: row.asset_url,
        videoType: row.asset_videoType || 'video',
        createdAt: row.asset_createdAt,
        technique: row.technique_id
          ? {
              id: row.technique_id,
              name: row.technique_name,
              slug: row.technique_slug,
            }
          : null,
        categories,
      };
    });

    return {
      videos,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        totalPages: Math.ceil(total / options.limit),
      },
    };
  }
}
