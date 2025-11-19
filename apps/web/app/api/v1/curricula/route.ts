import { NextRequest, NextResponse } from 'next/server';
import { wrapDb } from '@app/lib/wrapDb';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@trainhive/auth';
import { z } from 'zod';

const authOptions = getAuthOptions();

const createCurriculumSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  isPublic: z.boolean().default(false),
});

/**
 * POST /api/v1/curricula
 * Create a new curriculum
 */
export const POST = wrapDb(async (AppDataSource, request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = createCurriculumSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { Curriculum } = await import('@trainhive/db');

    const data = validationResult.data;
    const curriculumRepo = AppDataSource.getRepository(Curriculum);

    const createdBy = Number((session.user as { id?: string | number }).id);

    const curriculum = curriculumRepo.create({
      title: data.title,
      description: data.description || null,
      isPublic: data.isPublic,
      createdBy,
    });

    await curriculumRepo.save(curriculum);

    return NextResponse.json(
      {
        message: 'Curriculum created successfully',
        curriculum,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating curriculum:', error);
    return NextResponse.json(
      { error: 'Failed to create curriculum', message: error?.message || String(error) },
      { status: 500 }
    );
  }
});

/**
 * GET /api/v1/curricula
 * List curricula (user's own + public ones)
 */
export const GET = wrapDb(async (AppDataSource, request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { Curriculum } = await import('@trainhive/db');

    const { searchParams } = new URL(request.url);
    const onlyMine = searchParams.get('onlyMine') === 'true';

    const curriculumRepo = AppDataSource.getRepository(Curriculum);

    let query = curriculumRepo.createQueryBuilder('curriculum');

    const userId = Number((session.user as { id?: string | number }).id);

    if (onlyMine) {
      // Only user's curricula
      query = query.where('curriculum.createdBy = :userId', {
        userId,
      });
    } else {
      // User's curricula + public ones
      query = query.where('(curriculum.createdBy = :userId OR curriculum.isPublic = :isPublic)', {
        userId,
        isPublic: true,
      });
    }

    query = query.orderBy('curriculum.updatedAt', 'DESC');

    const curricula = await query.getMany();

    return NextResponse.json({ curricula });
  } catch (error: any) {
    console.error('Error fetching curricula:', error);
    return NextResponse.json(
      { error: 'Failed to fetch curricula', message: error?.message || String(error) },
      { status: 500 }
    );
  }
});
