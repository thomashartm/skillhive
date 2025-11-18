import { NextRequest, NextResponse } from 'next/server';
import { AppDataSource, Technique, TechniqueCategory, TechniqueTag, ReferenceAsset, ReferenceAssetTag, AssetType, Category, Tag } from '@trainhive/db';
import { z } from 'zod';

const referenceAssetSchema = z.object({
  id: z.coerce.number().int().positive().optional(), // For updating existing assets
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

// GET /api/v1/techniques/:techniqueId
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ techniqueId: string }> }
) {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const { techniqueId } = await params;
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
      assets.map(async (asset) => {
        const assetTags = await referenceAssetTagRepo.find({
          where: { assetId: asset.id },
        });
        return {
          ...asset,
          tagIds: assetTags.map(at => at.tagId),
        };
      })
    );

    // Fetch actual category and tag names
    const categoryRepo = AppDataSource.getRepository(Category);
    const tagRepo = AppDataSource.getRepository(Tag);

    const categories = await Promise.all(
      techniqueCategoryAssocs.map(async (assoc) => {
        const category = await categoryRepo.findOne({ where: { id: assoc.categoryId } });
        return category ? { id: category.id, name: category.name, slug: category.slug } : null;
      })
    );

    const tags = await Promise.all(
      techniqueTagAssocs.map(async (assoc) => {
        const tag = await tagRepo.findOne({ where: { id: assoc.tagId } });
        return tag ? { id: tag.id, name: tag.name, slug: tag.slug, color: tag.color } : null;
      })
    );

    return NextResponse.json({
      ...technique,
      categoryIds: techniqueCategoryAssocs.map(a => a.categoryId),
      tagIds: techniqueTagAssocs.map(a => a.tagId),
      categories: categories.filter(c => c !== null),
      tags: tags.filter(t => t !== null),
      referenceAssets: assetsWithTags,
    });
  } catch (error) {
    console.error('Error fetching technique:', error);
    return NextResponse.json({ error: 'Failed to fetch technique' }, { status: 500 });
  }
}

// PATCH /api/v1/techniques/:techniqueId
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ techniqueId: string }> }
) {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const { techniqueId } = await params;
    const body = await request.json();
    const validationResult = updateTechniqueSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: validationResult.error.issues,
      }, { status: 400 });
    }

    const data = validationResult.data;

    // Start a transaction
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const techniqueRepo = queryRunner.manager.getRepository(Technique);
      const techniqueCategoryRepo = queryRunner.manager.getRepository(TechniqueCategory);
      const techniqueTagRepo = queryRunner.manager.getRepository(TechniqueTag);
      const referenceAssetRepo = queryRunner.manager.getRepository(ReferenceAsset);
      const referenceAssetTagRepo = queryRunner.manager.getRepository(ReferenceAssetTag);

      const technique = await techniqueRepo.findOne({ where: { id: Number(techniqueId) } });

      if (!technique) {
        throw new Error('Technique not found');
      }

      // Update basic fields
      if (data.name !== undefined) technique.name = data.name;
      if (data.slug !== undefined) technique.slug = data.slug;
      if (data.description !== undefined) technique.description = data.description;

      await techniqueRepo.save(technique);

      // Update category associations if provided
      if (data.categoryIds !== undefined) {
        // Delete existing associations
        await techniqueCategoryRepo.delete({ techniqueId: technique.id });

        // Create new associations
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
        // Delete existing associations
        await techniqueTagRepo.delete({ techniqueId: technique.id });

        // Create new associations
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

      // Update reference assets if provided
      if (data.referenceAssets !== undefined) {
        // Delete all existing assets and their tag associations
        const existingAssets = await referenceAssetRepo.find({
          where: { techniqueId: technique.id },
        });

        for (const asset of existingAssets) {
          await referenceAssetTagRepo.delete({ assetId: asset.id });
        }

        await referenceAssetRepo.delete({ techniqueId: technique.id });

        // Create new assets
        for (const assetData of data.referenceAssets) {
          const asset = referenceAssetRepo.create({
            techniqueId: technique.id,
            type: assetData.type as AssetType,
            url: assetData.url,
            title: assetData.title ?? null,
            description: assetData.description ?? null,
            videoType: assetData.videoType ?? null,
            originator: assetData.originator ?? null,
            ord: assetData.ord,
          });

          await referenceAssetRepo.save(asset);

          // Create asset tag associations
          if (assetData.tagIds.length > 0) {
            const assetTagAssociations = assetData.tagIds.map((tagId) =>
              referenceAssetTagRepo.create({
                assetId: asset.id,
                tagId,
              })
            );
            await referenceAssetTagRepo.save(assetTagAssociations);
          }
        }
      }

      await queryRunner.commitTransaction();

      return NextResponse.json(technique);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  } catch (error: any) {
    console.error('Error updating technique:', error);
    if (error.message === 'Technique not found') {
      return NextResponse.json({ error: 'Technique not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update technique' }, { status: 500 });
  }
}

// DELETE /api/v1/techniques/:techniqueId
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ techniqueId: string }> }
) {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const { techniqueId } = await params;
    const techniqueRepo = AppDataSource.getRepository(Technique);

    const technique = await techniqueRepo.findOne({ where: { id: Number(techniqueId) } });

    if (!technique) {
      return NextResponse.json({ error: 'Technique not found' }, { status: 404 });
    }

    // Due to CASCADE delete, all related records will be automatically deleted
    await techniqueRepo.remove(technique);

    return NextResponse.json({ message: 'Technique deleted successfully' });
  } catch (error) {
    console.error('Error deleting technique:', error);
    return NextResponse.json({ error: 'Failed to delete technique' }, { status: 500 });
  }
}
