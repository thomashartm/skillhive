import { NextRequest, NextResponse } from 'next/server';
import { wrapDb } from '@app/lib/wrapDb';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@trainhive/auth';

const authOptions = getAuthOptions();

// GET /api/v1/videos/my-videos
export const GET = wrapDb(async (AppDataSource, request: NextRequest) => {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ReferenceAsset, Technique, Category, TechniqueCategory } = await import(
      '@trainhive/db'
    );

    const { searchParams } = new URL(request.url);

    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Filter parameters
    const titleFilter = searchParams.get('title') || '';
    const techniqueFilter = searchParams.get('technique') || '';
    const categoryFilter = searchParams.get('category') || '';

    // Sort parameters
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc').toUpperCase() as 'ASC' | 'DESC';

    const referenceAssetRepo = AppDataSource.getRepository(ReferenceAsset);

    // Build query
    let query = referenceAssetRepo
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.techniqueId', 'technique')
      .where('asset.type = :type', { type: 'video' })
      .andWhere('asset.createdBy = :userId', {
        userId: Number((session.user as { id?: string | number }).id),
      });

    // Apply title filter
    if (titleFilter) {
      query = query.andWhere('asset.title LIKE :title', {
        title: `%${titleFilter}%`,
      });
    }

    // Apply technique filter
    if (techniqueFilter) {
      query = query
        .leftJoin(Technique, 't', 't.id = asset.techniqueId')
        .andWhere('t.name LIKE :techniqueName', {
          techniqueName: `%${techniqueFilter}%`,
        });
    }

    // Apply category filter (need to join through TechniqueCategory)
    if (categoryFilter) {
      query = query
        .leftJoin(TechniqueCategory, 'tc', 'tc.techniqueId = asset.techniqueId')
        .leftJoin(Category, 'c', 'c.id = tc.categoryId')
        .andWhere('c.name LIKE :categoryName', {
          categoryName: `%${categoryFilter}%`,
        });
    }

    // Apply sorting
    switch (sortBy) {
      case 'title':
        query = query.orderBy('asset.title', sortOrder);
        break;
      case 'technique':
        query = query
          .leftJoin(Technique, 'tech', 'tech.id = asset.techniqueId')
          .orderBy('tech.name', sortOrder);
        break;
      case 'category':
        query = query
          .leftJoin(TechniqueCategory, 'tcat', 'tcat.techniqueId = asset.techniqueId')
          .leftJoin(Category, 'cat', 'cat.id = tcat.categoryId')
          .orderBy('cat.name', sortOrder);
        break;
      case 'createdAt':
      default:
        query = query.orderBy('asset.createdAt', sortOrder);
        break;
    }

    // Get total count for pagination
    const totalCount = await query.getCount();

    // Apply pagination
    query = query.skip(offset).take(limit);

    // Execute query
    const videos = await query.getMany();

    // Fetch related data for each video
    const videosWithDetails = await Promise.all(
      videos.map(async (video) => {
        let technique = null;
        let categories: any[] = [];

        if (video.techniqueId) {
          // Fetch technique
          const techniqueRepo = AppDataSource.getRepository(Technique);
          technique = await techniqueRepo.findOne({
            where: { id: video.techniqueId },
          });

          // Fetch categories for this technique
          const techniqueCategoryRepo = AppDataSource.getRepository(TechniqueCategory);
          const categoryRepo = AppDataSource.getRepository(Category);

          const techniqueCategoryAssocs = await techniqueCategoryRepo.find({
            where: { techniqueId: video.techniqueId },
          });

          categories = await Promise.all(
            techniqueCategoryAssocs.map(async (assoc: { categoryId: number }) => {
              const category = await categoryRepo.findOne({
                where: { id: assoc.categoryId },
              });
              return category
                ? { id: category.id, name: category.name, slug: category.slug }
                : null;
            })
          );

          categories = categories.filter((c) => c !== null);
        }

        return {
          ...video,
          technique,
          categories,
        };
      })
    );

    return NextResponse.json({
      videos: videosWithDetails,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching user videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos', message: error.message },
      { status: 500 }
    );
  }
});
