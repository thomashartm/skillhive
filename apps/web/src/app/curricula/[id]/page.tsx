'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/lib/components/layout/AppLayout';
import { sidebarItems, useCurriculumDetail, useCurriculumElements } from '@/lib/components/curricula';
import { LoadingState } from '../_components/LoadingState';
import { ErrorState } from '../_components/ErrorState';

export default function CurriculumDetailPage() {
  const params = useParams();
  const router = useRouter();
  const curriculumId = params.id as string;

  const { curriculum, loading: curriculumLoading, error } = useCurriculumDetail(curriculumId);
  const { elements, loading: elementsLoading } = useCurriculumElements(curriculumId);

  const loading = curriculumLoading || elementsLoading;

  if (loading) {
    return (
      <AppLayout sidebarItems={sidebarItems} sidebarTitle="Curricula">
        <div className="container mx-auto py-8 px-4">
          <LoadingState />
        </div>
      </AppLayout>
    );
  }

  if (error || !curriculum) {
    return (
      <AppLayout sidebarItems={sidebarItems} sidebarTitle="Curricula">
        <div className="container mx-auto py-8 px-4">
          <ErrorState
            error={error || 'Curriculum not found'}
            onRetry={() => router.push('/curricula/my-curricula')}
          />
        </div>
      </AppLayout>
    );
  }

  // Sort elements by ord for display
  const sortedElements = [...elements].sort((a, b) => a.ord - b.ord);

  return (
    <AppLayout sidebarItems={sidebarItems} sidebarTitle="Curricula">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">{curriculum.title}</h1>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  curriculum.isPublic
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                }`}
              >
                {curriculum.isPublic ? 'Public' : 'Private'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Last updated {new Date(curriculum.updatedAt).toLocaleDateString()}
            </p>
          </div>
          <Link
            href={`/curricula/${curriculum.id}/edit`}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Edit
          </Link>
        </div>

        {curriculum.description && (
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">Description</h2>
            <div className="text-foreground whitespace-pre-wrap">{curriculum.description}</div>
          </div>
        )}

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Curriculum Elements ({sortedElements.length})
            </h2>
          </div>

          {sortedElements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-4">No elements added yet.</p>
              <Link
                href={`/curricula/${curriculum.id}/edit`}
                className="text-primary hover:underline"
              >
                Add elements to this curriculum
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedElements.map((element, index) => (
                <div
                  key={element.id}
                  className="flex gap-4 p-4 bg-background border border-border rounded-lg"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          element.kind === 'technique'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : element.kind === 'asset'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {element.kind}
                      </span>
                    </div>
                    <div className="font-medium text-foreground">
                      {element.kind === 'text' && element.text}
                      {element.kind === 'technique' && `Technique ID: ${element.techniqueId}`}
                      {element.kind === 'asset' && `Asset ID: ${element.assetId}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8">
          <Link href="/curricula/my-curricula" className="text-primary hover:underline">
            ← Back to My Curricula
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
