import { NextRequest, NextResponse } from 'next/server';
import { AppDataSource, Tag } from '@trainhive/db';
import { z } from 'zod';

const updateTagSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  color: z.string().max(50).nullable().optional(),
});

// PATCH /api/v1/tags/:id
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const { id } = await params;
    const body = await request.json();
    const validationResult = updateTagSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: validationResult.error.issues,
      }, { status: 400 });
    }

    const data = validationResult.data;
    const tagRepo = AppDataSource.getRepository(Tag);

    const tag = await tagRepo.findOne({ where: { id: Number(id) } });

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // If slug is being updated, check for duplicates
    if (data.slug && data.slug !== tag.slug) {
      const existing = await tagRepo.findOne({
        where: {
          disciplineId: tag.disciplineId,
          slug: data.slug,
        },
      });

      if (existing) {
        return NextResponse.json({ error: 'Tag with this slug already exists in this discipline' }, { status: 409 });
      }
    }

    // Update fields if provided
    if (data.name !== undefined) tag.name = data.name;
    if (data.slug !== undefined) tag.slug = data.slug;
    if (data.description !== undefined) tag.description = data.description;
    if (data.color !== undefined) tag.color = data.color;

    await tagRepo.save(tag);

    return NextResponse.json(tag);
  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 });
  }
}

// DELETE /api/v1/tags/:id
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const { id } = await params;
    const tagRepo = AppDataSource.getRepository(Tag);

    const tag = await tagRepo.findOne({ where: { id: Number(id) } });

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    await tagRepo.remove(tag);

    return NextResponse.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
  }
}
