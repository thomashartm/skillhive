import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateSlug } from '@trainhive/shared';

const updateCategorySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).optional(),
  parentId: z.coerce.number().int().positive().nullable().optional(),
  description: z.string().nullable().optional(),
  ord: z.number().int().optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/v1/categories/:id - Get a single category by ID
export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const categoryId = Number(id);

    if (isNaN(categoryId)) {
      return NextResponse.json(
        { error: 'Invalid category ID' },
        { status: 400 },
      );
    }

    const dbModule = await import('@trainhive/db');
    const { AppDataSource, Category } = dbModule;

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const categoryRepo = AppDataSource.getRepository(Category);
    const category = await categoryRepo.findOne({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(category, { status: 200 });
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Error fetching category:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch category', details: process.env.NODE_ENV === 'development' ? errorMessage : undefined },
      { status: 500 },
    );
  }
}

// PATCH /api/v1/categories/:id - Update a category
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const categoryId = Number(id);

    if (isNaN(categoryId)) {
      return NextResponse.json(
        { error: 'Invalid category ID' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const validationResult = updateCategorySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.issues },
        { status: 400 },
      );
    }

    const { data } = validationResult;

    const dbModule = await import('@trainhive/db');
    const { AppDataSource, Category } = dbModule;

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const categoryRepo = AppDataSource.getRepository(Category);

    // Find the category to update
    const category = await categoryRepo.findOne({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 },
      );
    }

    // Auto-generate slug if name is being updated but slug is not
    if (data.name && !data.slug) {
      data.slug = generateSlug(data.name);
    }

    // If slug is being updated or auto-generated, check for conflicts
    if (data.slug && data.slug !== category.slug) {
      const existingCategory = await categoryRepo.findOne({
        where: { disciplineId: category.disciplineId, slug: data.slug },
      });

      if (existingCategory) {
        return NextResponse.json(
          { error: 'Category with this slug already exists in this discipline' },
          { status: 400 },
        );
      }
    }

    // If parentId is being updated, verify it exists
    if (data.parentId !== undefined && data.parentId !== null) {
      // Prevent self-reference
      if (data.parentId === categoryId) {
        return NextResponse.json(
          { error: 'Category cannot be its own parent' },
          { status: 400 },
        );
      }

      const parentCategory = await categoryRepo.findOne({
        where: { id: data.parentId },
      });

      if (!parentCategory) {
        return NextResponse.json(
          { error: 'Parent category not found' },
          { status: 404 },
        );
      }

      // Verify parent belongs to same discipline
      if (parentCategory.disciplineId !== category.disciplineId) {
        return NextResponse.json(
          { error: 'Parent category must belong to the same discipline' },
          { status: 400 },
        );
      }
    }

    // Update the category
    Object.assign(category, data);
    const updatedCategory = await categoryRepo.save(category);

    return NextResponse.json(updatedCategory, { status: 200 });
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Error updating category:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update category', details: process.env.NODE_ENV === 'development' ? errorMessage : undefined },
      { status: 500 },
    );
  }
}

// DELETE /api/v1/categories/:id - Delete a category
export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const categoryId = Number(id);

    if (isNaN(categoryId)) {
      return NextResponse.json(
        { error: 'Invalid category ID' },
        { status: 400 },
      );
    }

    const dbModule = await import('@trainhive/db');
    const { AppDataSource, Category } = dbModule;

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const categoryRepo = AppDataSource.getRepository(Category);

    // Find the category
    const category = await categoryRepo.findOne({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 },
      );
    }

    // Check if category has children
    const childrenCount = await categoryRepo.count({
      where: { parentId: categoryId },
    });

    if (childrenCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with children. Delete children first or reassign them.' },
        { status: 400 },
      );
    }

    await categoryRepo.remove(category);

    return NextResponse.json({ message: 'Category deleted successfully' }, { status: 200 });
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Error deleting category:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to delete category', details: process.env.NODE_ENV === 'development' ? errorMessage : undefined },
      { status: 500 },
    );
  }
}
