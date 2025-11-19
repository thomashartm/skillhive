import { NextRequest, NextResponse } from 'next/server';
import {
  AppDataSource,
  Technique,
  TechniqueCategory,
  TechniqueTag,
  ReferenceAsset,
  ReferenceAssetTag,
  AssetType,
} from '@trainhive/db';
import { z } from 'zod';

const referenceAssetSchema = z.object({
  type: z.enum(['video', 'web', 'image']),
  url: z.string().min(1).max(2000),
  title: z.string().max(255).nullable().optional(),
  description: z.string().nullable().optional(),
  videoType: z.enum(['short', 'full', 'instructional', 'seminar']).nullable().optional(),
  originator: z.string().max(255).nullable().optional(),
  ord: z.coerce.number().int().default(0),
  tagIds: z.array(z.coerce.number().int().positive()).default([]),
});

const createTechniqueSchema = z.object({
  disciplineId: z.coerce.number().int().positive(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  categoryIds: z.array(z.coerce.number().int().positive()).default([]),
  tagIds: z.array(z.coerce.number().int().positive()).default([]),
  referenceAssets: z.array(referenceAssetSchema).default([]),
});

// GET /api/v1/techniques?disciplineId=<id>
export async function GET(request: NextRequest) {
  try {
    if (!AppDataSource.isInitialized) {
      try {
        await AppDataSource.initialize();
      } catch (initError: any) {
        // If already initializing or initialized, ignore the error
        if (initError.message?.includes('already') || initError.message?.includes('exist')) {
          // Connection is being initialized by another request, wait a bit and continue
          await new Promise((resolve) => setTimeout(resolve, 100));
        } else {
          throw initError;
        }
      }
    }

    const { searchParams } = new URL(request.url);
    const querySchema = z.object({
      disciplineId: z.coerce.number().int().positive().default(1), // Default to BJJ (disciplineId 1)
      categoryId: z.coerce.number().int().positive().optional(),
      tagId: z.coerce.number().int().positive().optional(),
      search: z.string().min(1).max(255).optional(),
      ids: z.string().optional(),
    });
    const raw = {
      disciplineId: searchParams.get('disciplineId') ?? undefined,
      categoryId: searchParams.get('categoryId') ?? undefined,
      tagId: searchParams.get('tagId') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      ids: searchParams.get('ids') ?? undefined,
    };
    const parsed = querySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.issues },
        { status: 400 }
      );
    }
    const { disciplineId, categoryId, tagId, search, ids } = parsed.data;
    const idList = ids
      ? ids
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n) && n > 0)
      : undefined;

    const techniqueRepo = AppDataSource.getRepository(Technique);
    const techniqueCategoryRepo = AppDataSource.getRepository(TechniqueCategory);
    const techniqueTagRepo = AppDataSource.getRepository(TechniqueTag);
    const referenceAssetRepo = AppDataSource.getRepository(ReferenceAsset);

    // Build the base query
    let query = techniqueRepo
      .createQueryBuilder('technique')
      .where('technique.disciplineId = :disciplineId', { disciplineId: Number(disciplineId) });
    if (search) {
      query = query.andWhere('technique.name LIKE :search', { search: `%${search}%` });
    }
    if (idList && idList.length > 0) {
      query = query.andWhere('technique.id IN (:...ids)', { ids: idList });
    }
    query = query.orderBy('technique.name', 'ASC');

    // Filter by category if provided
    if (categoryId) {
      query = query
        .innerJoin(TechniqueCategory, 'tc', 'tc.techniqueId = technique.id')
        .andWhere('tc.categoryId = :categoryId', { categoryId: Number(categoryId) });
    }

    // Filter by tag if provided
    if (tagId) {
      query = query
        .innerJoin(TechniqueTag, 'tt', 'tt.techniqueId = technique.id')
        .andWhere('tt.tagId = :tagId', { tagId: Number(tagId) });
    }

    const techniques = await query.getMany();

    // Fetch related data for each technique
    const techniquesWithRelations = await Promise.all(
      techniques.map(async (technique) => {
        const categories = await techniqueCategoryRepo.find({
          where: { techniqueId: technique.id },
        });

        const tags = await techniqueTagRepo.find({
          where: { techniqueId: technique.id },
        });

        const assets = await referenceAssetRepo.find({
          where: { techniqueId: technique.id },
          order: { ord: 'ASC' },
        });

        return {
          ...technique,
          categoryIds: categories.map((c) => c.categoryId),
          tagIds: tags.map((t) => t.tagId),
          referenceAssets: assets,
        };
      })
    );

    return NextResponse.json(techniquesWithRelations);
  } catch (error: any) {
    console.error('Error fetching techniques:', error);
    // Return empty array on error to prevent UI from breaking
    if (error.message?.includes('connection') || error.message?.includes('closed state')) {
      console.warn('Database connection issue, returning empty result');
      return NextResponse.json([]);
    }
    return NextResponse.json({ error: 'Failed to fetch techniques' }, { status: 500 });
  }
}

// POST /api/v1/techniques
export async function POST(request: NextRequest) {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const body = await request.json();
    const validationResult = createTechniqueSchema.safeParse(body);

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

      // Create technique
      const technique = techniqueRepo.create({
        disciplineId: data.disciplineId,
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
      });

      await techniqueRepo.save(technique);

      // Create category associations
      if (data.categoryIds.length > 0) {
        const categoryAssociations = data.categoryIds.map((categoryId, index) =>
          techniqueCategoryRepo.create({
            techniqueId: technique.id,
            categoryId,
            primary: index === 0, // First category is primary
          })
        );
        await techniqueCategoryRepo.save(categoryAssociations);
      }

      // Create tag associations
      if (data.tagIds.length > 0) {
        const tagAssociations = data.tagIds.map((tagId) =>
          techniqueTagRepo.create({
            techniqueId: technique.id,
            tagId,
          })
        );
        await techniqueTagRepo.save(tagAssociations);
      }

      // Create reference assets and their tag associations
      if (data.referenceAssets.length > 0) {
        for (const assetData of data.referenceAssets) {
          const typeMapped =
            assetData.type === 'video'
              ? AssetType.VIDEO
              : assetData.type === 'web'
                ? AssetType.WEB
                : AssetType.IMAGE;

          const asset = referenceAssetRepo.create({
            techniqueId: technique.id,
            type: typeMapped as any,
            url: assetData.url,
            title: assetData.title ?? null,
            description: assetData.description ?? null,
            videoType: (assetData.videoType ?? null) as any,
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

      return NextResponse.json(technique, { status: 201 });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    console.error('Error creating technique:', error);
    return NextResponse.json({ error: 'Failed to create technique' }, { status: 500 });
  }
}
