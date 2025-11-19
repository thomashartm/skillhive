import { NextRequest, NextResponse } from 'next/server';
import { wrapDb } from '@app/lib/wrapDb';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@trainhive/auth';
import { z } from 'zod';

const authOptions = getAuthOptions();

const createElementSchema = z
  .object({
    type: z.enum(['technique', 'asset', 'text']),
    techniqueId: z.number().int().positive().nullable().optional(),
    assetId: z.number().int().positive().nullable().optional(),
    title: z.string().max(255).nullable().optional(),
    details: z.string().nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'text') {
        return typeof data.title === 'string' && data.title.trim().length > 0;
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
      message: 'Text requires title; Technique requires techniqueId; Asset requires assetId',
      path: ['type'],
    }
  );

function isAdminRole(role?: string | null): boolean {
  return typeof role === 'string' && role.toLowerCase() === 'admin';
}

/**
 * GET /api/v1/curricula/[id]/elements
 * List all elements for a curriculum (with enriched technique/asset summaries)
 */
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

      const { id } = await params;
      const curriculumId = Number(id);
      if (!Number.isFinite(curriculumId)) {
        return NextResponse.json({ error: 'Invalid curriculum ID' }, { status: 400 });
      }

      const { Curriculum, CurriculumElement, Technique, ReferenceAsset } = await import(
        '@trainhive/db'
      );

      // Access checks
      const curriculumRepo = AppDataSource.getRepository(Curriculum);
      const curriculum = await curriculumRepo.findOne({
        where: { id: curriculumId },
      });
      if (!curriculum) {
        return NextResponse.json({ error: 'Curriculum not found' }, { status: 404 });
      }

      const { id: sid, role } = session.user as {
        id?: string | number;
        role?: string;
      };
      const userId = Number(sid);
      const isAdmin = isAdminRole(role);
      if (!isAdmin && curriculum.createdBy !== userId && !curriculum.isPublic) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      // Fetch elements
      const elementRepo = AppDataSource.getRepository(CurriculumElement);
      const techniqueRepo = AppDataSource.getRepository(Technique);
      const assetRepo = AppDataSource.getRepository(ReferenceAsset);

      const elements = await elementRepo.find({
        where: { curriculumId },
        order: { ord: 'ASC' },
      });

      // Enrich
      const enriched = await Promise.all(
        elements.map(async (el: any) => {
          const base = {
            id: el.id,
            curriculumId: el.curriculumId,
            type: el.type,
            ord: el.ord,
            techniqueId: el.techniqueId,
            assetId: el.assetId,
            title: el.title,
            details: el.details,
            createdAt: el.createdAt,
            updatedAt: el.updatedAt,
          };

          if (el.type === 'technique' && el.techniqueId) {
            const t = await techniqueRepo.findOne({
              where: { id: el.techniqueId },
            });
            if (t) {
              return {
                ...base,
                technique: {
                  id: t.id,
                  name: t.name,
                  slug: t.slug,
                  description: t.description,
                  disciplineId: t.disciplineId,
                },
              };
            }
          }

          if (el.type === 'asset' && el.assetId) {
            const a = await assetRepo.findOne({ where: { id: el.assetId } });
            if (a) {
              return {
                ...base,
                asset: {
                  id: a.id,
                  url: a.url,
                  title: a.title,
                  description: a.description,
                  type: a.type,
                  videoType: a.videoType,
                  originator: a.originator,
                  ord: a.ord,
                },
              };
            }
          }

          return base;
        })
      );

      return NextResponse.json({ elements: enriched }, { status: 200 });
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Error fetching curriculum elements:', error);
      return NextResponse.json(
        { error: 'Failed to fetch elements', message: error?.message },
        { status: 500 }
      );
    }
  }
);

/**
 * POST /api/v1/curricula/[id]/elements
 * Add a new element to the curriculum
 */
export const POST = wrapDb(
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

      const { id } = await params;
      const curriculumId = Number(id);
      if (!Number.isFinite(curriculumId)) {
        return NextResponse.json({ error: 'Invalid curriculum ID' }, { status: 400 });
      }

      const { Curriculum, CurriculumElement } = await import('@trainhive/db');

      const curriculumRepo = AppDataSource.getRepository(Curriculum);
      const elementRepo = AppDataSource.getRepository(CurriculumElement);

      // Verify curriculum
      const curriculum = await curriculumRepo.findOne({
        where: { id: curriculumId },
      });
      if (!curriculum) {
        return NextResponse.json({ error: 'Curriculum not found' }, { status: 404 });
      }

      // Ownership/admin check
      const { id: sid, role } = session.user as {
        id?: string | number;
        role?: string;
      };
      const userId = Number(sid);
      const isAdmin = isAdminRole(role);
      if (!isAdmin && curriculum.createdBy !== userId) {
        return NextResponse.json(
          {
            error: 'Access denied - you can only add elements to your own curricula',
          },
          { status: 403 }
        );
      }

      // Count limit
      const count = await elementRepo.count({ where: { curriculumId } });
      if (count >= 50) {
        return NextResponse.json(
          { error: 'Curriculum cannot have more than 50 elements' },
          { status: 400 }
        );
      }

      // Validate input
      const body = await request.json();
      const parsed = createElementSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            error: 'Invalid request data',
            details: parsed.error.issues,
          },
          { status: 400 }
        );
      }

      const data = parsed.data;

      // Compute next ord
      const last = await elementRepo.findOne({
        where: { curriculumId },
        order: { ord: 'DESC' as any },
      });
      const nextOrd = last ? last.ord + 1 : 0;

      // Create element
      const element = elementRepo.create({
        curriculumId,
        type: data.type,
        ord: nextOrd,
        techniqueId: data.type === 'technique' ? Number(data.techniqueId) : null,
        assetId: data.type === 'asset' ? Number(data.assetId) : null,
        title: data.type === 'text' ? (data.title ?? null) : null,
        details: data.details ?? null,
      });

      const saved = await elementRepo.save(element);

      return NextResponse.json(
        { message: 'Element added successfully', element: saved },
        { status: 201 }
      );
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Error creating curriculum element:', error);
      return NextResponse.json(
        { error: 'Failed to create element', message: error?.message },
        { status: 500 }
      );
    }
  }
);
