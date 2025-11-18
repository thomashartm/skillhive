import { NextRequest, NextResponse } from 'next/server';
// Note: TypeORM data source/entities are dynamically imported within handlers to avoid bundling/decorator issues
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@trainhive/auth';
import { z } from 'zod';

const authOptions = getAuthOptions();

const reorderSchema = z.object({
  elementIds: z.array(z.number()).min(1),
});

// PUT /api/v1/curricula/[id]/elements/reorder - Reorder elements
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id: sid, role: srole } = session.user as { id?: string | number; role?: string };
    const userId = Number(sid);
    const isAdmin = typeof srole === 'string' && srole.toLowerCase() === 'admin';
    if (!isAdmin && curriculum.createdBy !== userId) {
      return NextResponse.json(
        { error: 'Access denied - you can only reorder elements in your own curricula' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = reorderSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { elementIds } = validationResult.data;

    // Get all elements for this curriculum
    const elementRepo = AppDataSource.getRepository(CurriculumElement);
    const elements = await elementRepo.find({
      where: { curriculumId },
    });

    // Validate that all provided IDs belong to this curriculum
    const elementIdSet = new Set(elements.map((e) => e.id));
    const providedIdSet = new Set(elementIds);

    if (elementIdSet.size !== providedIdSet.size) {
      return NextResponse.json(
        { error: 'Element count mismatch - all elements must be included in reorder' },
        { status: 400 }
      );
    }

    for (const id of elementIds) {
      if (!elementIdSet.has(id)) {
        return NextResponse.json(
          { error: `Element ID ${id} does not belong to this curriculum` },
          { status: 400 }
        );
      }
    }

    // Update the ord field for each element based on its position in the array
    const updates: Promise<any>[] = [];

    for (let i = 0; i < elementIds.length; i++) {
      const element = elements.find((e) => e.id === elementIds[i]);
      if (element) {
        element.ord = i;
        updates.push(elementRepo.save(element));
      }
    }

    await Promise.all(updates);

    // Fetch and return the updated elements
    const updatedElements = await elementRepo.find({
      where: { curriculumId },
      order: { ord: 'ASC' },
    });

    return NextResponse.json({
      message: 'Elements reordered successfully',
      elements: updatedElements,
    });
  } catch (error: any) {
    console.error('Error reordering curriculum elements:', error);
    return NextResponse.json(
      { error: 'Failed to reorder elements', message: error.message },
      { status: 500 }
    );
  }
}
