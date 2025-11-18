import { NextRequest, NextResponse } from 'next/server';
import { AppDataSource, Technique, ReferenceAsset, AssetType } from '@trainhive/db';
import { z } from 'zod';
import { generateSlug } from '@trainhive/shared';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@trainhive/auth';

const authOptions = getAuthOptions();

const saveVideoSchema = z.object({
  url: z.string().url().min(1).max(2000),
  title: z.string().min(1).max(255),
  videoType: z.enum(['short', 'full', 'instructional', 'seminar']),
  description: z.string().nullable().optional(),
  authorName: z.string().max(255).nullable().optional(),
  authorUrl: z.string().url().nullable().optional().or(z.literal('')),
  embedHtml: z.string().nullable().optional(),
  disciplineId: z.coerce.number().int().positive(),
  techniqueId: z.coerce.number().int().positive().nullable().optional(),
  newTechniqueName: z.string().min(1).max(255).nullable().optional(),
});

// POST /api/v1/videos
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const body = await request.json();
    const validationResult = saveVideoSchema.safeParse(body);

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
      const referenceAssetRepo = queryRunner.manager.getRepository(ReferenceAsset);

      let techniqueId = data.techniqueId;

      // Create new technique if needed
      if (!techniqueId && data.newTechniqueName) {
        const slug = generateSlug(data.newTechniqueName);

        const newTechnique = techniqueRepo.create({
          disciplineId: data.disciplineId,
          name: data.newTechniqueName,
          slug: slug,
          description: null,
        });

        await techniqueRepo.save(newTechnique);
        techniqueId = newTechnique.id;
      }

      // Get the highest ord value for this technique (if technique is specified)
      let ord = 0;
      if (techniqueId) {
        const existingAssets = await referenceAssetRepo.find({
          where: { techniqueId },
          order: { ord: 'DESC' },
        });

        if (existingAssets.length > 0) {
          ord = existingAssets[0].ord + 1;
        }
      }

      // Create the reference asset (video)
      const referenceAsset = referenceAssetRepo.create({
        techniqueId: techniqueId || null,
        type: 'video' as AssetType,
        url: data.url,
        title: data.title || null,
        description: data.description || null,
        videoType: data.videoType,
        originator: data.authorName || null,
        ord: ord,
        createdBy: Number((session.user as { id?: string | number }).id),
      });

      await referenceAssetRepo.save(referenceAsset);

      await queryRunner.commitTransaction();

      return NextResponse.json(
        {
          message: 'Video saved successfully',
          video: referenceAsset,
          technique: techniqueId ? { id: techniqueId } : null,
        },
        { status: 201 }
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  } catch (error: any) {
    console.error('Error saving video:', error);
    return NextResponse.json(
      { error: 'Failed to save video', message: error.message },
      { status: 500 }
    );
  }
}

// GET /api/v1/videos?disciplineId=<id>&techniqueId=<id>&search=<q>&ids=1,2,3
export async function GET(request: NextRequest) {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const { searchParams } = new URL(request.url);

    const querySchema = z.object({
      disciplineId: z.coerce.number().int().positive().optional(),
      techniqueId: z.coerce.number().int().positive().optional(),
      search: z.string().min(1).max(255).optional(),
      ids: z.string().optional(),
    });

    const raw = {
      disciplineId: searchParams.get('disciplineId') ?? undefined,
      techniqueId: searchParams.get('techniqueId') ?? undefined,
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

    const { disciplineId, techniqueId, search, ids } = parsed.data;
    const idList = ids
      ? ids
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n) && n > 0)
      : undefined;

    const referenceAssetRepo = AppDataSource.getRepository(ReferenceAsset);
    const techniqueRepo = AppDataSource.getRepository(Technique);

    // Build query to fetch video reference assets
    let query = referenceAssetRepo
      .createQueryBuilder('asset')
      .where('asset.type = :type', { type: 'video' });

    if (search) {
      query = query.andWhere('asset.title LIKE :search', { search: `%${search}%` });
    }

    if (idList && idList.length > 0) {
      query = query.andWhere('asset.id IN (:...ids)', { ids: idList });
    }

    // Filter by technique/discipline if provided
    if (techniqueId) {
      query = query.andWhere('asset.techniqueId = :techniqueId', {
        techniqueId: Number(techniqueId),
      });
    } else if (disciplineId) {
      // If no techniqueId but disciplineId provided, join with techniques
      query = query
        .leftJoin(Technique, 'technique', 'technique.id = asset.techniqueId')
        .andWhere('(technique.disciplineId = :disciplineId OR asset.techniqueId IS NULL)', {
          disciplineId: Number(disciplineId),
        });
    }

    query = query.orderBy('asset.createdAt', 'DESC');

    const videos = await query.getMany();

    // Fetch technique details for each video
    const videosWithTechniques = await Promise.all(
      videos.map(async (video) => {
        let technique = null;
        if (video.techniqueId) {
          technique = await techniqueRepo.findOne({
            where: { id: video.techniqueId },
          });
        }

        return {
          ...video,
          technique,
        };
      })
    );

    return NextResponse.json(videosWithTechniques);
  } catch (error: any) {
    console.error('Error fetching videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos', message: error.message },
      { status: 500 }
    );
  }
}
