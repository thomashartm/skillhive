import { NextRequest, NextResponse } from 'next/server';
import { wrapDb } from '@app/lib/wrapDb';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@trainhive/auth';
import { z } from 'zod';
import { isAdmin } from '@trainhive/shared';

const authOptions = getAuthOptions();

const updateCurriculumSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  isPublic: z.boolean().optional(),
});

// GET /api/v1/curricula/[id] - Get a specific curriculum
export const GET = wrapDb(
  async (
    AppDataSource: any,
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const session = await getServerSession(authOptions);
      if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { Curriculum } = await import('@trainhive/db');

      const { id } = await params;
      const curriculumId = Number(id);
      if (isNaN(curriculumId)) {
        return NextResponse.json({ error: 'Invalid curriculum ID' }, { status: 400 });
      }

      const curriculumRepo = AppDataSource.getRepository(Curriculum);
      const curriculum = await curriculumRepo.findOne({
        where: { id: curriculumId },
      });

      if (!curriculum) {
        return NextResponse.json({ error: 'Curriculum not found' }, { status: 404 });
      }

      // Check access: owner, public, or admin override
      const { id: sid, role: userRole } = session.user as { id?: string | number; role?: string };
      const userId = Number(sid);
      const isUserAdmin = isAdmin(userRole as any);
      if (!isUserAdmin && curriculum.createdBy !== userId && !curriculum.isPublic) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      return NextResponse.json({ curriculum });
    } catch (error: any) {
      console.error('Error fetching curriculum:', error);
      return NextResponse.json(
        { error: 'Failed to fetch curriculum', message: error?.message },
        { status: 500 }
      );
    }
  }
);

// PUT /api/v1/curricula/[id] - Update a curriculum
export const PUT = wrapDb(
  async (
    AppDataSource: any,
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const session = await getServerSession(authOptions);
      if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { Curriculum } = await import('@trainhive/db');

      const { id } = await params;
      const curriculumId = Number(id);
      if (isNaN(curriculumId)) {
        return NextResponse.json({ error: 'Invalid curriculum ID' }, { status: 400 });
      }

      const body = await request.json();
      const validationResult = updateCurriculumSchema.safeParse(body);

      if (!validationResult.success) {
        return NextResponse.json(
          {
            error: 'Invalid request data',
            details: validationResult.error.issues,
          },
          { status: 400 }
        );
      }

      const curriculumRepo = AppDataSource.getRepository(Curriculum);
      const curriculum = await curriculumRepo.findOne({
        where: { id: curriculumId },
      });

      if (!curriculum) {
        return NextResponse.json({ error: 'Curriculum not found' }, { status: 404 });
      }

      // Check ownership (admin override)
      const { id: sid, role: userRole } = session.user as { id?: string | number; role?: string };
      const userId = Number(sid);
      const isUserAdmin = isAdmin(userRole as any);
      if (!isUserAdmin && curriculum.createdBy !== userId) {
        return NextResponse.json(
          { error: 'Access denied - you can only update your own curricula' },
          { status: 403 }
        );
      }

      const data = validationResult.data;

      // Update fields if provided
      if (data.title !== undefined) {
        curriculum.title = data.title;
      }
      if (data.description !== undefined) {
        curriculum.description = data.description;
      }
      if (data.isPublic !== undefined) {
        curriculum.isPublic = data.isPublic;
      }

      await curriculumRepo.save(curriculum);

      return NextResponse.json({
        message: 'Curriculum updated successfully',
        curriculum,
      });
    } catch (error: any) {
      console.error('Error updating curriculum:', error);
      return NextResponse.json(
        { error: 'Failed to update curriculum', message: error?.message },
        { status: 500 }
      );
    }
  }
);

// DELETE /api/v1/curricula/[id] - Delete a curriculum
export const DELETE = wrapDb(
  async (
    AppDataSource: any,
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const session = await getServerSession(authOptions);
      if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { Curriculum } = await import('@trainhive/db');

      const { id } = await params;
      const curriculumId = Number(id);
      if (isNaN(curriculumId)) {
        return NextResponse.json({ error: 'Invalid curriculum ID' }, { status: 400 });
      }

      const curriculumRepo = AppDataSource.getRepository(Curriculum);
      const curriculum = await curriculumRepo.findOne({
        where: { id: curriculumId },
      });

      if (!curriculum) {
        return NextResponse.json({ error: 'Curriculum not found' }, { status: 404 });
      }

      // Check ownership (admin override)
      const { id: sid, role: userRole } = session.user as { id?: string | number; role?: string };
      const userId = Number(sid);
      const isUserAdmin = isAdmin(userRole as any);
      if (!isUserAdmin && curriculum.createdBy !== userId) {
        return NextResponse.json(
          { error: 'Access denied - you can only delete your own curricula' },
          { status: 403 }
        );
      }

      await curriculumRepo.remove(curriculum);

      return NextResponse.json({
        message: 'Curriculum deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting curriculum:', error);
      return NextResponse.json(
        { error: 'Failed to delete curriculum', message: error?.message },
        { status: 500 }
      );
    }
  }
);
