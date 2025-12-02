'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/lib/components/layout/AppLayout';
import { VideoAssetSidebarItems } from '@/lib/components/navigation/SidebarConfig';
import { CreateLink } from '@/lib/components/actionbar';
import { apiClient, getErrorMessage } from '@/lib/backend';

interface Video {
  id: number;
  title: string;
  url: string;
  videoType: string;
  createdAt: string;
  technique: { id: number; name: string; slug: string } | null;
  categories: { id: number; name: string; slug: string }[];
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function MyVideosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [videos, setVideos] = useState<Video[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [titleFilter, setTitleFilter] = useState(searchParams.get('title') || '');
  const [techniqueFilter, setTechniqueFilter] = useState(searchParams.get('technique') || '');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || '');

  // Sort states
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
  );

  // Pagination state
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [pageLimit, setPageLimit] = useState(parseInt(searchParams.get('limit') || '10'));

  // Fetch videos
  useEffect(() => {
    fetchVideos();
  }, [currentPage, pageLimit, sortBy, sortOrder]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use getMyVideos for proper pagination support
      const data = await apiClient.videos.getMyVideos({
        page: currentPage,
        limit: pageLimit,
        sortBy,
        sortOrder,
        title: titleFilter || undefined,
        techniqueName: techniqueFilter || undefined,
        categoryName: categoryFilter || undefined,
      });

      setVideos(data.videos || []);
      setPagination(
        data.pagination || {
          page: currentPage,
          limit: pageLimit,
          total: 0,
          totalPages: 0,
        }
      );
    } catch (err: any) {
      console.error('Error fetching videos:', err);
      setError(getErrorMessage(err));
      setVideos([]);
      setPagination({
        page: currentPage,
        limit: pageLimit,
        total: 0,
        totalPages: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when filtering
    fetchVideos();
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      // Toggle sort order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this video?')) {
      return;
    }

    try {
      // Use API client to delete video
      await apiClient.videos.delete(id);

      // Refresh the list
      fetchVideos();
    } catch (err: any) {
      alert(`Error: ${getErrorMessage(err)}`);
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) {
      return <span className="text-muted-foreground">↕</span>;
    }
    return <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <AppLayout sidebarItems={VideoAssetSidebarItems} sidebarTitle="Videos">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">My Videos</h1>
          <CreateLink path="/videos/save" title="New Video" />
        </div>

        {/* Filters */}
        <form
          onSubmit={handleFilterSubmit}
          className="bg-card border border-border rounded-lg p-6 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">
                Title
              </label>
              <input
                type="text"
                id="title"
                value={titleFilter}
                onChange={(e) => setTitleFilter(e.target.value)}
                placeholder="Filter by title..."
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              />
            </div>

            <div>
              <label htmlFor="technique" className="block text-sm font-medium text-foreground mb-2">
                Technique
              </label>
              <input
                type="text"
                id="technique"
                value={techniqueFilter}
                onChange={(e) => setTechniqueFilter(e.target.value)}
                placeholder="Filter by technique..."
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-foreground mb-2">
                Category
              </label>
              <input
                type="text"
                id="category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                placeholder="Filter by category..."
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Apply Filters
            </button>
            <button
              type="button"
              onClick={() => {
                setTitleFilter('');
                setTechniqueFilter('');
                setCategoryFilter('');
                setCurrentPage(1);
              }}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
            >
              Clear Filters
            </button>
          </div>
        </form>

        {/* Results per page selector */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <label htmlFor="pageLimit" className="text-sm text-foreground">
              Show:
            </label>
            <select
              id="pageLimit"
              value={pageLimit}
              onChange={(e) => {
                setPageLimit(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-1 border border-border rounded-md bg-background text-foreground"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
            <span className="text-sm text-muted-foreground">videos per page</span>
          </div>

          <div className="text-sm text-muted-foreground">
            Showing {videos.length > 0 ? (currentPage - 1) * pageLimit + 1 : 0} to{' '}
            {Math.min(currentPage * pageLimit, pagination.total)} of {pagination.total} videos
          </div>
        </div>

        {/* Loading state */}
        {loading && <div className="text-center py-8 text-muted-foreground">Loading...</div>}

        {/* Error state - only show if there's an actual error */}
        {!loading && error && videos.length === 0 && (
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4 mb-4">
            <p className="text-destructive text-sm">{error}</p>
            <button
              onClick={() => {
                setError(null);
                fetchVideos();
              }}
              className="mt-2 text-sm text-destructive hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Table */}
        {!loading && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold text-foreground cursor-pointer hover:bg-muted"
                      onClick={() => handleSort('title')}
                    >
                      Title <SortIcon column="title" />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                      Video Type
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold text-foreground cursor-pointer hover:bg-muted"
                      onClick={() => handleSort('technique')}
                    >
                      Technique <SortIcon column="technique" />
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold text-foreground cursor-pointer hover:bg-muted"
                      onClick={() => handleSort('category')}
                    >
                      Categories <SortIcon column="category" />
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold text-foreground cursor-pointer hover:bg-muted"
                      onClick={() => handleSort('createdAt')}
                    >
                      Upload Date <SortIcon column="createdAt" />
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {videos.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        No videos found. Try adjusting your filters or add a new video.
                      </td>
                    </tr>
                  ) : (
                    videos.map((video) => (
                      <tr key={video.id} className="border-b border-border hover:bg-muted/30">
                        <td className="px-4 py-3 text-sm text-foreground">
                          <a
                            href={video.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {video.title || 'Untitled'}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {video.videoType}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {video.technique ? (
                            <Link
                              href={`/techniques/${video.technique.slug}`}
                              className="text-primary hover:underline"
                            >
                              {video.technique.name}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {video.categories.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {video.categories.map((cat) => (
                                <span
                                  key={cat.id}
                                  className="inline-block px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground"
                                >
                                  {cat.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(video.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/videos/${video.id}`}
                              className="text-primary hover:underline text-sm"
                            >
                              View
                            </Link>
                            <Link
                              href={`/videos/${video.id}/edit`}
                              className="text-primary hover:underline text-sm"
                            >
                              Edit
                            </Link>
                            <button
                              onClick={() => handleDelete(video.id)}
                              className="text-destructive hover:underline text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-border rounded-md bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
            >
              Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => {
                // Show first page, last page, current page, and pages around current
                if (
                  page === 1 ||
                  page === pagination.totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 border rounded-md ${currentPage === page
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-border hover:bg-muted'
                        }`}
                    >
                      {page}
                    </button>
                  );
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return (
                    <span key={page} className="px-2 text-muted-foreground">
                      ...
                    </span>
                  );
                }
                return null;
              })}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={currentPage === pagination.totalPages}
              className="px-3 py-1 border border-border rounded-md bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
