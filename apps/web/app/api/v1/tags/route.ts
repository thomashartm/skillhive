import { NextRequest, NextResponse } from 'next/server';
import { AppDataSource, Tag } from '@trainhive/db';
import { z } from 'zod';

const createTagSchema = z.object({
  disciplineId: z.coerce.number().int().positive(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  color: z.string().max(50).nullable().optional(),
});

// GET /api/v1/tags?disciplineId=<id>
export async function GET(request: NextRequest) {
  try {
    if (!AppDataSource.isInitialized) {
      try {
        await AppDataSource.initialize();
      } catch (initError: any) {
        // If already initializing or initialized, ignore the error
        if (initError.message?.includes('already') || initError.message?.includes('exist')) {
          // Connection is being initialized by another request, wait a bit and continue
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          throw initError;
        }
      }
    }

    const { searchParams } = new URL(request.url);
    const disciplineId = searchParams.get('disciplineId');

    if (!disciplineId) {
      return NextResponse.json({ error: 'disciplineId is required' }, { status: 400 });
    }

    const tagRepo = AppDataSource.getRepository(Tag);
    const tags = await tagRepo.find({
      where: { disciplineId: Number(disciplineId) },
      order: { name: 'ASC' },
    });

    return NextResponse.json(tags);
  } catch (error: any) {
    console.error('Error fetching tags:', error);
    // Return empty array on error to prevent UI from breaking
    if (error.message?.includes('connection') || error.message?.includes('closed state')) {
      console.warn('Database connection issue, returning empty result');
      return NextResponse.json([]);
    }
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

// POST /api/v1/tags
export async function POST(request: NextRequest) {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const body = await request.json();
    const validationResult = createTagSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: validationResult.error.issues,
      }, { status: 400 });
    }

    const data = validationResult.data;
    const tagRepo = AppDataSource.getRepository(Tag);

    // Check for duplicate slug within the discipline
    const existing = await tagRepo.findOne({
      where: {
        disciplineId: data.disciplineId,
        slug: data.slug,
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Tag with this slug already exists in this discipline' }, { status: 409 });
    }

    const tag = tagRepo.create({
      disciplineId: data.disciplineId,
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      color: data.color ?? null,
    });

    await tagRepo.save(tag);

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }
}
