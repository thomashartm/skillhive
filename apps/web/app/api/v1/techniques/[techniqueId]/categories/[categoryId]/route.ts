import { NextRequest, NextResponse } from 'next/server';

type RouteContext = {
  params: Promise<{ techniqueId: string; categoryId: string }>;
};

// DELETE /api/v1/techniques/:techniqueId/categories/:categoryId - Remove association
export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { techniqueId: techIdParam, categoryId: catIdParam } = await context.params;
    const techniqueId = parseInt(techIdParam, 10);
    const categoryId = parseInt(catIdParam, 10);

    if (isNaN(techniqueId) || isNaN(categoryId)) {
      return NextResponse.json(
        { error: 'Invalid technique or category ID' },
        { status: 400 },
      );
    }

    const dbModule = await import('@trainhive/db');
    const { AppDataSource, TechniqueCategory } = dbModule;

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const techniqueCategoryRepo = AppDataSource.getRepository(TechniqueCategory);

    // Find the association
    const association = await techniqueCategoryRepo.findOne({
      where: { techniqueId, categoryId },
    });

    if (!association) {
      return NextResponse.json(
        { error: 'Association not found' },
        { status: 404 },
      );
    }

    await techniqueCategoryRepo.remove(association);

    return NextResponse.json({ message: 'Association removed successfully' }, { status: 200 });
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Error removing association:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to remove association', details: process.env.NODE_ENV === 'development' ? errorMessage : undefined },
      { status: 500 },
    );
  }
}
