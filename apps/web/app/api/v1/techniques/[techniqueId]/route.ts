import { NextRequest, NextResponse } from 'next/server';
import { wrapDb } from '@app/lib/wrapDb';
import { z } from 'zod';

// Schemas
const referenceAssetSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  type: z.enum(['video', 'web', 'image']),
  url: z.string().min(1).max(2000),
  title: z.string().max(255).nullable().optional(),
  description: z.string().nullable().optional(),
  videoType: z.enum(['short', 'full', 'instructional', 'seminar']).nullable().optional(),
  originator: z.string().max(255).nullable().optional(),
  ord: z.coerce.number().int().default(0),
  tagIds: z.array(z.coerce.number().int().positive()).default([]),
});

const updateTechniqueSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  categoryIds: z.array(z.coerce.number().int().positive()).optional(),
  tagIds: z.array(z.coerce.number().int().positive()).optional(),
  referenceAssets: z.array(referenceAssetSchema).optional(),
});

// Helpers
function mapAssetType(str: 'video' | 'web' | 'image', AssetType: any) {
  switch (str) {
    case 'video':
      return AssetType.VIDEO ?? 'video';
    case 'web':
      return AssetType.WEB ?? 'web';
    case 'image':
      return AssetType.IMAGE ?? 'image';
    default:
      return str;
  }
}

function mapVideoType(str: 'short' | 'full' | 'instructional' | 'seminar' | null | undefined) {
  // We can't import VideoType (not exported by db index), but entity expects string enum values.
  // Return the same string; TypeORM column is string-based. Cast to any to satisfy TS.
  if (!str) return null as any;
  if (str === 'short' || str === 'full' || str === 'instructional' || str === 'seminar') {
    return str as any;
  }
  return null as any;
}

/**
 * GET /api/v1/techniques/:techniqueId
 * Supports both numeric id and slug
 */
export const GET = wrapDb(
  async (
    AppDataSource: any,
    _request: NextRequest,
    { params }: { params: Promise<{ techniqueId: string }> }
  ) => {
    try {
      const { techniqueId } = await params;

      const {
        Technique,
        TechniqueCategory,
        TechniqueTag,
        ReferenceAsset,
        ReferenceAssetTag,
        Category,
        Tag,
      } = await import('@trainhive/db');

      const techniqueRepo = AppDataSource.getRepository(Technique);
      const techniqueCategoryRepo = AppDataSource.getRepository(TechniqueCategory);
      const techniqueTagRepo = AppDataSource.getRepository(TechniqueTag);
      const referenceAssetRepo = AppDataSource.getRepository(ReferenceAsset);
      const referenceAssetTagRepo = AppDataSource.getRepository(ReferenceAssetTag);

      // Support both ID and slug lookups
      const isNumericId = /^\d+$/.test(techniqueId);
      const technique = isNumericId
        ? await techniqueRepo.findOne({ where: { id: Number(techniqueId) } })
        : await techniqueRepo.findOne({ where: { slug: techniqueId } });

      if (!technique) {
        return NextResponse.json({ error: 'Technique not found' }, { status: 404 });
      }

      // Fetch related data
      const techniqueCategoryAssocs = await techniqueCategoryRepo.find({
        where: { techniqueId: technique.id },
      });

      const techniqueTagAssocs = await techniqueTagRepo.find({
        where: { techniqueId: technique.id },
      });

      const assets = await referenceAssetRepo.find({
        where: { techniqueId: technique.id },
        order: { ord: 'ASC' },
      });

      // Fetch tag associations for each asset
      const assetsWithTags = await Promise.all(
        assets.map(async (asset: any) => {
          const assetTags = await referenceAssetTagRepo.find({
            where: { assetId: asset.id },
          });
          return {
            ...asset,
            tagIds: assetTags.map((at: { tagId: number }) => at.tagId),
          };
        })
      );

      // Fetch actual category and tag names (for convenience in UI)
      const categoryRepo = AppDataSource.getRepository(Category);
      const tagRepo = AppDataSource.getRepository(Tag);

      const categories = (
        await Promise.all(
          techniqueCategoryAssocs.map(async (assoc: any) => {
            const category = await categoryRepo.findOne({ where: { id: assoc.categoryId } });
            return category ? { id: category.id, name: category.name, slug: category.slug } : null;
          })
        )
      ).filter(Boolean);

      const tags = (
        await Promise.all(
          techniqueTagAssocs.map(async (assoc: any) => {
            const tag = await tagRepo.findOne({ where: { id: assoc.tagId } });
            return tag ? { id: tag.id, name: tag.name, slug: tag.slug, color: tag.color } : null;
          })
        )
      ).filter(Boolean);

      return NextResponse.json({
        ...technique,
        categoryIds: techniqueCategoryAssocs.map((a: any) => a.categoryId),
        tagIds: techniqueTagAssocs.map((a: any) => a.tagId),
        categories,
        tags,
        referenceAssets: assetsWithTags,
      });
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Error fetching technique:', error);
      return NextResponse.json(
        { error: 'Failed to fetch technique', message: error?.message },
        { status: 500 }
      );
    }
  }
);

/**
 * PATCH /api/v1/techniques/:techniqueId
 * Update core fields, categories, tags, and reference assets (replace all assets)
 */
export const PATCH = wrapDb(
  async (
    AppDataSource: any,
    request: NextRequest,
    { params }: { params: Promise<{ techniqueId: string }> }
  ) => {
    try {
      const { techniqueId } = await params;
      const body = await request.json();
      const validationResult = updateTechniqueSchema.safeParse(body);

      if (!validationResult.success) {
        return NextResponse.json(
          {
            error: 'Invalid request data',
            details: validationResult.error.issues,
          },
          { status: 400 }
        );
      }

      const data = validationResult.data;

      // Transaction
      const queryRunner = AppDataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const {
          Technique,
          TechniqueCategory,
          TechniqueTag,
          ReferenceAsset,
          ReferenceAssetTag,
          AssetType,
        } = await import('@trainhive/db');

        const techniqueRepo = queryRunner.manager.getRepository(Technique);
        const techniqueCategoryRepo = queryRunner.manager.getRepository(TechniqueCategory);
        const techniqueTagRepo = queryRunner.manager.getRepository(TechniqueTag);
        const referenceAssetRepo = queryRunner.manager.getRepository(ReferenceAsset);
        const referenceAssetTagRepo = queryRunner.manager.getRepository(ReferenceAssetTag);

        const technique = await techniqueRepo.findOne({
          where: { id: Number(techniqueId) },
        });

        if (!technique) {
          await queryRunner.rollbackTransaction();
          return NextResponse.json({ error: 'Technique not found' }, { status: 404 });
        }

        // Update basic fields
        if (data.name !== undefined) technique.name = data.name;
        if (data.slug !== undefined) technique.slug = data.slug;
        if (data.description !== undefined) technique.description = data.description;

        await techniqueRepo.save(technique);

        // Update category associations if provided
        if (data.categoryIds !== undefined) {
          await techniqueCategoryRepo.delete({ techniqueId: technique.id });

          if (data.categoryIds.length > 0) {
            const categoryAssociations = data.categoryIds.map((categoryId, index) =>
              techniqueCategoryRepo.create({
                techniqueId: technique.id,
                categoryId,
                primary: index === 0,
              })
            );
            await techniqueCategoryRepo.save(categoryAssociations);
          }
        }

        // Update tag associations if provided
        if (data.tagIds !== undefined) {
          await techniqueTagRepo.delete({ techniqueId: technique.id });

          if (data.tagIds.length > 0) {
            const tagAssociations = data.tagIds.map((tagId) =>
              techniqueTagRepo.create({
                techniqueId: technique.id,
                tagId,
              })
            );
            await techniqueTagRepo.save(tagAssociations);
          }
        }

        // Update reference assets if provided (replace all)
        if (data.referenceAssets !== undefined) {
          const existingAssets = await referenceAssetRepo.find({
            where: { techniqueId: technique.id },
          });

          for (const asset of existingAssets) {
            await referenceAssetTagRepo.delete({ assetId: asset.id });
          }

          await referenceAssetRepo.delete({ techniqueId: technique.id });

          for (const assetData of data.referenceAssets) {
            const created = referenceAssetRepo.create({
              techniqueId: technique.id,
              type: mapAssetType(assetData.type, AssetType),
              url: assetData.url,
              title: assetData.title ?? null,
              description: assetData.description ?? null,
              videoType: mapVideoType(assetData.videoType ?? null),
              originator: assetData.originator ?? null,
              ord: assetData.ord,
            });

            const savedAsset = await referenceAssetRepo.save(created);

            if (assetData.tagIds.length > 0) {
              const assetTagAssociations = assetData.tagIds.map((tagId) =>
                referenceAssetTagRepo.create({
                  assetId: savedAsset.id,
                  tagId,
                })
              );
              await referenceAssetTagRepo.save(assetTagAssociations);
            }
          }
        }

        await queryRunner.commitTransaction();
        return NextResponse.json(technique);
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Error updating technique:', error);
      return NextResponse.json(
        { error: 'Failed to update technique', message: error?.message },
        { status: 500 }
      );
    }
  }
);

/**
 * DELETE /api/v1/techniques/:techniqueId
 * Remove a technique (CASCADE should clean related rows per schema)
 */
export const DELETE = wrapDb(
  async (
    AppDataSource: any,
    _request: NextRequest,
    { params }: { params: Promise<{ techniqueId: string }> }
  ) => {
    try {
      const { techniqueId } = await params;
      const { Technique } = await import('@trainhive/db');

      const techniqueRepo = AppDataSource.getRepository(Technique);

      const technique = await techniqueRepo.findOne({
        where: { id: Number(techniqueId) },
      });

      if (!technique) {
        return NextResponse.json({ error: 'Technique not found' }, { status: 404 });
      }

      await techniqueRepo.remove(technique);

      return NextResponse.json({ message: 'Technique deleted successfully' });
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Error deleting technique:', error);
      return NextResponse.json(
        { error: 'Failed to delete technique', message: error?.message },
        { status: 500 }
      );
    }
  }
);
