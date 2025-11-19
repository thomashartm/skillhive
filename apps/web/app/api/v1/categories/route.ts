import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateSlug } from '@trainhive/shared';
import { wrapDb } from '@app/lib/wrapDb';

const createCategorySchema = z.object({
  disciplineId: z.coerce.number().int().positive(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).optional(),
  parentId: z.coerce.number().int().positive().nullable().optional(),
  description: z.string().nullable().optional(),
  ord: z.number().int().default(0),
});

// Helper function to build category tree
function buildCategoryTree(categories: any[]): any[] {
  const categoryMap = new Map();
  const rootCategories: any[] = [];

  // First pass: create map of all categories
  categories.forEach((cat) => {
    categoryMap.set(cat.id, { ...cat, children: [] });
  });

  // Second pass: build tree structure
  categories.forEach((cat) => {
    const category = categoryMap.get(cat.id);
    if (cat.parentId) {
      const parent = categoryMap.get(cat.parentId);
      if (parent) {
        parent.children.push(category);
      }
    } else {
      rootCategories.push(category);
    }
  });

  return rootCategories;
}

// GET /api/v1/categories - List all categories or get tree structure
export const GET = wrapDb(async (AppDataSource, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const tree = searchParams.get('tree') === 'true';
    const disciplineId = searchParams.get('disciplineId');

    const { Category } = await import('@trainhive/db');

    const categoryRepo = AppDataSource.getRepository(Category);

    const whereClause: any = {};
    if (disciplineId) {
      whereClause.disciplineId = disciplineId;
    }

    const categories = await categoryRepo.find({
      where: whereClause,
      order: { ord: 'ASC', name: 'ASC' },
    });

    if (tree) {
      const categoryTree = buildCategoryTree(categories);
      return NextResponse.json(categoryTree, { status: 200 });
    }

    return NextResponse.json(categories, { status: 200 });
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Error fetching categories:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to fetch categories',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
});

// POST /api/v1/categories - Create a new category
export const POST = wrapDb(async (AppDataSource, request: NextRequest) => {
  try {
    const body = await request.json();
    const validationResult = createCategorySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { data } = validationResult;

    // Auto-generate slug from name if not provided
    const slug = data.slug || generateSlug(data.name);

    const { Category } = await import('@trainhive/db');

    const categoryRepo = AppDataSource.getRepository(Category);

    // Check if category with same slug already exists in discipline
    const existingCategory = await categoryRepo.findOne({
      where: { disciplineId: data.disciplineId, slug },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category with this slug already exists in this discipline' },
        { status: 400 }
      );
    }

    // If parentId is provided, verify it exists
    if (data.parentId) {
      const parentCategory = await categoryRepo.findOne({
        where: { id: data.parentId },
      });

      if (!parentCategory) {
        return NextResponse.json({ error: 'Parent category not found' }, { status: 404 });
      }

      // Verify parent belongs to same discipline
      if (parentCategory.disciplineId !== data.disciplineId) {
        return NextResponse.json(
          { error: 'Parent category must belong to the same discipline' },
          { status: 400 }
        );
      }
    }

    const newCategory = categoryRepo.create({ ...data, slug });
    const savedCategory = await categoryRepo.save(newCategory);

    return NextResponse.json(savedCategory, { status: 201 });
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Error creating category:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to create category',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
});
