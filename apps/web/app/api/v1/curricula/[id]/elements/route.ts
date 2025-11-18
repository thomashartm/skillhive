import { NextRequest, NextResponse } from 'next/server';
/**
 * Note: TypeORM data source/entities are dynamically imported within handlers
 * to avoid bundling/decorator issues in Next.js.
 */
import type { ElementType } from '@trainhive/db';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@trainhive/auth';
import { z } from 'zod';
import { isAdmin } from '@trainhive/shared';

const authOptions = getAuthOptions();

const createElementSchema = z
  .object({
    type: z.enum(['technique', 'asset', 'text']),
    techniqueId: z.number().nullable().optional(),
    assetId: z.number().nullable().optional(),
    title: z.string().max(255).nullable().optional(),
    details: z.string().nullable().optional(),
  })
  .refine(
    (data) => {
      // Validate based on type
      if (data.type === 'text') {
        return data.title && data.title.trim().length > 0;
      }
      if (data.type === 'technique') {
        return data.techniqueId !== null && data.techniqueId !== undefined;
      }
      if (data.type === 'asset') {
        return data.assetId !== null && data.assetId !== undefined;
      }
      return true;
    },
    {
      message:
        'Text elements must have a title, technique elements must have techniqueId, and asset elements must have assetId',
    }
  );

// GET /api/v1/curricula/[id]/elements - List all elements for a curriculum
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { AppDataSource, Curriculum, CurriculumElement } = await import('@trainhive/db');
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const { id } = await params;
    const curriculumId = Number(id);
    if (isNaN(curriculumId)) {
      return NextResponse.json({ error: 'Invalid curriculum ID' }, { status: 400 });
    }

    // Check curriculum access
    const curriculumRepo = AppDataSource.getRepository(Curriculum);
    const curriculum = await curriculumRepo.findOne({
      where: { id: curriculumId },
    });

    if (!curriculum) {
      return NextResponse.json({ error: 'Curriculum not found' }, { status: 404 });
    }

    const { id: sid, role: userRole } = session.user as { id?: string | number; role?: string };
    const userId = Number(sid);
    const isUserAdmin = isAdmin(userRole as any);
    if (!isUserAdmin && curriculum.createdBy !== userId && !curriculum.isPublic) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get elements
    const elementRepo = AppDataSource.getRepository(CurriculumElement);
    const elements = await elementRepo.find({
      where: { curriculumId },
      order: { ord: 'ASC' },
    });

    return NextResponse.json({ elements });
  } catch (error: any) {
    console.error('Error fetching curriculum elements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch elements', message: error.message },
      { status: 500 }
    );
  }
}

// POST /api/v1/curricula/[id]/elements - Add a new element
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { AppDataSource, Curriculum, CurriculumElement } = await import('@trainhive/db');
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const { id } = await params;
    const curriculumId = Number(id);
    if (isNaN(curriculumId)) {
      return NextResponse.json({ error: 'Invalid curriculum ID' }, { status: 400 });
    }

    // Check curriculum ownership
    const curriculumRepo = AppDataSource.getRepository(Curriculum);
    const curriculum = await curriculumRepo.findOne({
      where: { id: curriculumId },
    });

    if (!curriculum) {
      return NextResponse.json({ error: 'Curriculum not found' }, { status: 404 });
    }

    const { id: sid, role: userRole } = session.user as { id?: string | number; role?: string };
    const userId = Number(sid);
    const isUserAdmin = isAdmin(userRole as any);
    if (!isUserAdmin && curriculum.createdBy !== userId) {
      return NextResponse.json(
        { error: 'Access denied - you can only add elements to your own curricula' },
        { status: 403 }
      );
    }

    // Check element count limit (max 50)
    const elementRepo = AppDataSource.getRepository(CurriculumElement);
    const elementCount = await elementRepo.count({
      where: { curriculumId },
    });

    if (elementCount >= 50) {
      return NextResponse.json(
        { error: 'Curriculum cannot have more than 50 elements' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validationResult = createElementSchema.safeParse(body);

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

    // Get the next order value
    const lastElement = await elementRepo.findOne({
      where: { curriculumId },
      order: { ord: 'DESC' },
    });
    const nextOrd = lastElement ? lastElement.ord + 1 : 0;

    const element = elementRepo.create({
      curriculumId,
      type: data.type as ElementType,
      ord: nextOrd,
      techniqueId: data.techniqueId || null,
      assetId: data.assetId || null,
      title: data.title || null,
      details: data.details || null,
    });

    await elementRepo.save(element);

    return NextResponse.json(
      {
        message: 'Element added successfully',
        element,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating curriculum element:', error);
    return NextResponse.json(
      { error: 'Failed to create element', message: error.message },
      { status: 500 }
    );
  }
}
