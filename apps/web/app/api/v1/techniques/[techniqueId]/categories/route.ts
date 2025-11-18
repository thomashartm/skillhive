import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const associateCategorySchema = z.object({
  categoryId: z.number().int().positive(),
  primary: z.boolean().default(false),
});

type RouteContext = {
  params: Promise<{ techniqueId: string }>;
};

// POST /api/v1/techniques/:techniqueId/categories - Associate technique with category
export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { techniqueId: techIdParam } = await context.params;
    const techniqueId = parseInt(techIdParam, 10);

    if (isNaN(techniqueId)) {
      return NextResponse.json(
        { error: 'Invalid technique ID' },
        { status: 400 },
      );
    }
    const body = await request.json();
    const validationResult = associateCategorySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.issues },
        { status: 400 },
      );
    }

    const { categoryId, primary } = validationResult.data;

    const dbModule = await import('@trainhive/db');
    const {
      AppDataSource, Technique, Category, TechniqueCategory,
    } = dbModule;

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const techniqueRepo = AppDataSource.getRepository(Technique);
    const categoryRepo = AppDataSource.getRepository(Category);
    const techniqueCategoryRepo = AppDataSource.getRepository(TechniqueCategory);

    // Verify technique exists
    const technique = await techniqueRepo.findOne({
      where: { id: techniqueId },
    });

    if (!technique) {
      return NextResponse.json(
        { error: 'Technique not found' },
        { status: 404 },
      );
    }

    // Verify category exists
    const category = await categoryRepo.findOne({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 },
      );
    }

    // Check if association already exists
    const existingAssociation = await techniqueCategoryRepo.findOne({
      where: { techniqueId, categoryId },
    });

    if (existingAssociation) {
      return NextResponse.json(
        { error: 'Technique is already associated with this category' },
        { status: 400 },
      );
    }

    // If marking as primary, remove primary flag from other associations
    if (primary) {
      await techniqueCategoryRepo.update(
        { techniqueId },
        { primary: false },
      );
    }

    // Create association
    const association = techniqueCategoryRepo.create({
      techniqueId,
      categoryId,
      primary,
    });

    await techniqueCategoryRepo.save(association);

    return NextResponse.json(association, { status: 201 });
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Error associating technique with category:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to associate technique with category', details: process.env.NODE_ENV === 'development' ? errorMessage : undefined },
      { status: 500 },
    );
  }
}

// GET /api/v1/techniques/:techniqueId/categories - Get all categories for a technique
export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { techniqueId: techIdParam } = await context.params;
    const techniqueId = parseInt(techIdParam, 10);

    if (isNaN(techniqueId)) {
      return NextResponse.json(
        { error: 'Invalid technique ID' },
        { status: 400 },
      );
    }

    const dbModule = await import('@trainhive/db');
    const { AppDataSource, Technique, TechniqueCategory } = dbModule;

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const techniqueRepo = AppDataSource.getRepository(Technique);
    const techniqueCategoryRepo = AppDataSource.getRepository(TechniqueCategory);

    // Verify technique exists
    const technique = await techniqueRepo.findOne({
      where: { id: techniqueId },
    });

    if (!technique) {
      return NextResponse.json(
        { error: 'Technique not found' },
        { status: 404 },
      );
    }

    // Get all category associations
    const associations = await techniqueCategoryRepo.find({
      where: { techniqueId },
      relations: ['category'],
    });

    const categories = associations.map((assoc) => ({
      ...assoc.category,
      primary: assoc.primary,
    }));

    return NextResponse.json(categories, { status: 200 });
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Error fetching technique categories:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch technique categories', details: process.env.NODE_ENV === 'development' ? errorMessage : undefined },
      { status: 500 },
    );
  }
}
