import { NextRequest, NextResponse } from 'next/server';
import {
  AppDataSource,
  ReferenceAsset,
  Technique,
  Category,
  TechniqueCategory,
} from '@trainhive/db';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@trainhive/auth';
import { z } from 'zod';
import { isAdmin } from '@trainhive/shared';

const authOptions = getAuthOptions();

const updateVideoSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  videoType: z.enum(['short', 'full', 'instructional', 'seminar']).optional(),
  description: z.string().nullable().optional(),
  originator: z.string().max(255).nullable().optional(),
  techniqueId: z.coerce.number().int().positive().nullable().optional(),
});

// GET /api/v1/videos/[id]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const videoId = parseInt(params.id);
    const referenceAssetRepo = AppDataSource.getRepository(ReferenceAsset);

    const video = await referenceAssetRepo.findOne({
      where: { id: videoId, type: 'video' },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Fetch technique and categories
    let technique = null;
    let categories: any[] = [];

    if (video.techniqueId) {
      const techniqueRepo = AppDataSource.getRepository(Technique);
      technique = await techniqueRepo.findOne({
        where: { id: video.techniqueId },
      });

      const techniqueCategoryRepo = AppDataSource.getRepository(TechniqueCategory);
      const categoryRepo = AppDataSource.getRepository(Category);

      const techniqueCategoryAssocs = await techniqueCategoryRepo.find({
        where: { techniqueId: video.techniqueId },
      });

      categories = await Promise.all(
        techniqueCategoryAssocs.map(async (assoc) => {
          const category = await categoryRepo.findOne({
            where: { id: assoc.categoryId },
          });
          return category ? { id: category.id, name: category.name, slug: category.slug } : null;
        })
      );

      categories = categories.filter((c) => c !== null);
    }

    return NextResponse.json({
      ...video,
      technique,
      categories,
    });
  } catch (error: any) {
    console.error('Error fetching video:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video', message: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/v1/videos/[id]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const { id } = await params;
    const videoId = parseInt(id);
    const body = await request.json();
    const validationResult = updateVideoSchema.safeParse(body);

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
    const referenceAssetRepo = AppDataSource.getRepository(ReferenceAsset);

    // Find the video
    const video = await referenceAssetRepo.findOne({
      where: { id: videoId, type: 'video' },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Check if user owns the video (admin override)
    const { id: sid, role: userRole } = session.user as { id?: string | number; role?: string };
    const userId = Number(sid);
    const isUserAdmin = isAdmin(userRole as any);
    if (!isUserAdmin && video.createdBy !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update video fields
    if (data.title !== undefined) video.title = data.title;
    if (data.videoType !== undefined) video.videoType = data.videoType;
    if (data.description !== undefined) video.description = data.description;
    if (data.originator !== undefined) video.originator = data.originator;
    if (data.techniqueId !== undefined) video.techniqueId = data.techniqueId;

    await referenceAssetRepo.save(video);

    return NextResponse.json({
      message: 'Video updated successfully',
      video,
    });
  } catch (error: any) {
    console.error('Error updating video:', error);
    return NextResponse.json(
      { error: 'Failed to update video', message: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/videos/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const { id } = await params;
    const videoId = parseInt(id);
    const referenceAssetRepo = AppDataSource.getRepository(ReferenceAsset);

    // Find the video
    const video = await referenceAssetRepo.findOne({
      where: { id: videoId, type: 'video' },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Check if user owns the video (admin override)
    const { id: sid, role: userRole } = session.user as { id?: string | number; role?: string };
    const userId = Number(sid);
    const isUserAdmin = isAdmin(userRole as any);
    if (!isUserAdmin && video.createdBy !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete the video
    await referenceAssetRepo.remove(video);

    return NextResponse.json({
      message: 'Video deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting video:', error);
    return NextResponse.json(
      { error: 'Failed to delete video', message: error.message },
      { status: 500 }
    );
  }
}
