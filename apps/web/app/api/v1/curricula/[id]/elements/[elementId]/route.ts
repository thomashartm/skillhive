import { NextRequest, NextResponse } from 'next/server';
// Note: TypeORM data source/entities are dynamically imported within handlers to avoid bundling/decorator issues
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@trainhive/auth';
import { z } from 'zod';
import { isAdmin } from '@trainhive/shared';

const authOptions = getAuthOptions();

const updateElementSchema = z.object({
  techniqueId: z.number().nullable().optional(),
  assetId: z.number().nullable().optional(),
  title: z.string().max(255).nullable().optional(),
  details: z.string().nullable().optional(),
});

// PUT /api/v1/curricula/[id]/elements/[id] - Update an element
export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; elementId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { AppDataSource, Curriculum, CurriculumElement } = await import('@trainhive/db');
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const { id, elementId } = await params;
    const curriculumId = Number(id);
    const elementIdNum = Number(elementId);

    if (isNaN(curriculumId) || isNaN(elementIdNum)) {
      return NextResponse.json({ error: 'Invalid curriculum or element ID' }, { status: 400 });
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
        { error: 'Access denied - you can only update elements in your own curricula' },
        { status: 403 }
      );
    }

    // Get element
    const elementRepo = AppDataSource.getRepository(CurriculumElement);
    const element = await elementRepo.findOne({
      where: { id: elementIdNum, curriculumId },
    });

    if (!element) {
      return NextResponse.json({ error: 'Element not found' }, { status: 404 });
    }

    const body = await request.json();
    const validationResult = updateElementSchema.safeParse(body);

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

    // Update fields if provided
    if (data.techniqueId !== undefined) {
      element.techniqueId = data.techniqueId;
    }
    if (data.assetId !== undefined) {
      element.assetId = data.assetId;
    }
    if (data.title !== undefined) {
      element.title = data.title;
    }
    if (data.details !== undefined) {
      element.details = data.details;
    }

    await elementRepo.save(element);

    return NextResponse.json({
      message: 'Element updated successfully',
      element,
    });
  } catch (error: any) {
    console.error('Error updating curriculum element:', error);
    return NextResponse.json(
      { error: 'Failed to update element', message: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/curricula/[id]/elements/[id] - Delete an element
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; elementId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { AppDataSource, Curriculum, CurriculumElement } = await import('@trainhive/db');
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const { id, elementId } = await params;
    const curriculumId = Number(id);
    const elementIdNum = Number(elementId);

    if (isNaN(curriculumId) || isNaN(elementIdNum)) {
      return NextResponse.json({ error: 'Invalid curriculum or element ID' }, { status: 400 });
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
        { error: 'Access denied - you can only delete elements from your own curricula' },
        { status: 403 }
      );
    }

    // Get element
    const elementRepo = AppDataSource.getRepository(CurriculumElement);
    const element = await elementRepo.findOne({
      where: { id: elementIdNum, curriculumId },
    });

    if (!element) {
      return NextResponse.json({ error: 'Element not found' }, { status: 404 });
    }

    await elementRepo.remove(element);

    return NextResponse.json({
      message: 'Element deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting curriculum element:', error);
    return NextResponse.json(
      { error: 'Failed to delete element', message: error.message },
      { status: 500 }
    );
  }
}
