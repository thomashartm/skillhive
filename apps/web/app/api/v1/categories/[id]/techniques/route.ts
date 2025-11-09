import { NextRequest, NextResponse } from 'next/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/v1/categories/:id/techniques - Get all techniques for a category
export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: categoryId } = await context.params;

    const dbModule = await import('@trainhive/db');
    const { AppDataSource, Category, TechniqueCategory } = dbModule;

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const categoryRepo = AppDataSource.getRepository(Category);
    const techniqueCategoryRepo = AppDataSource.getRepository(TechniqueCategory);

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

    // Get all technique associations
    const associations = await techniqueCategoryRepo.find({
      where: { categoryId },
      relations: ['technique'],
    });

    const techniques = associations.map((assoc) => ({
      ...assoc.technique,
      primary: assoc.primary,
    }));

    return NextResponse.json(techniques, { status: 200 });
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Error fetching category techniques:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch category techniques', details: process.env.NODE_ENV === 'development' ? errorMessage : undefined },
      { status: 500 },
    );
  }
}
