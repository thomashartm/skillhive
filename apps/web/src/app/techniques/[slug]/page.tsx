'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppLayout } from '@/lib/components/layout/AppLayout';
import { sidebarItems } from '@/lib/components/techniques/constants';

interface Technique {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  categories: Array<{ id: number; name: string; slug: string }>;
  tags: Array<{ id: number; name: string; slug: string; color: string | null }>;
  referenceAssets: ReferenceAsset[];
}

interface ReferenceAsset {
  id: number;
  type: string;
  url: string;
  title: string | null;
  description: string | null;
  videoType: string | null;
  originator: string | null;
  ord: number;
  tagIds: number[];
}

export default function TechniqueDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [technique, setTechnique] = useState<Technique | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTechnique() {
      try {
        setLoading(true);
        const response = await fetch(`/api/v1/techniques/${slug}`);

        if (!response.ok) {
          throw new Error('Technique not found');
        }

        const data = await response.json();
        setTechnique(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load technique');
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      fetchTechnique();
    }
  }, [slug]);

  if (loading) {
    return (
      <AppLayout sidebarItems={sidebarItems} sidebarTitle="Techniques">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading technique...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !technique) {
    return (
      <AppLayout sidebarItems={sidebarItems} sidebarTitle="Techniques">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <p className="text-destructive">{error || 'Technique not found'}</p>
          <a href="/techniques" className="text-primary hover:underline">
            Back to techniques
          </a>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout sidebarItems={sidebarItems} sidebarTitle="Techniques">
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b border-border pb-4">
          <h1 className="text-3xl font-bold text-foreground mb-2">{technique.name}</h1>
          {technique.description && (
            <div
              className="text-muted-foreground prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: technique.description }}
            />
          )}
        </div>

        {/* Instructionals */}
        {technique.referenceAssets && technique.referenceAssets.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Instructionals</h2>
            <div className="space-y-3">
              {technique.referenceAssets
                .sort((a, b) => a.ord - b.ord)
                .map((asset, index) => (
                  <div
                    key={asset.id}
                    className="border border-border rounded-lg p-4 bg-card hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* Number badge */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                        {index + 1}
                      </div>

                      <div className="flex-1 space-y-2">
                        {/* Title and originator */}
                        <div>
                          <a
                            href={asset.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-base font-semibold text-primary hover:underline inline-flex items-center gap-2"
                          >
                            {asset.title || 'Untitled Resource'}
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                              />
                            </svg>
                          </a>
                          {asset.originator && (
                            <div className="text-sm text-muted-foreground mt-1">
                              by {asset.originator}
                            </div>
                          )}
                        </div>

                        {/* Description */}
                        {asset.description && (
                          <div
                            className="text-sm text-muted-foreground prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: asset.description }}
                          />
                        )}

                        {/* Video type badge */}
                        {asset.videoType && (
                          <div className="flex gap-2 pt-1">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                              {asset.videoType}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Categories and Tags */}
        <div className="space-y-4 pt-4 border-t border-border">
          {technique.categories && technique.categories.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {technique.categories.map((category) => (
                  <a
                    key={category.id}
                    href={`/techniques/categories#category-${category.id}`}
                    className="px-3 py-1 text-sm bg-muted text-foreground rounded-md hover:bg-accent transition-colors"
                  >
                    {category.name}
                  </a>
                ))}
              </div>
            </div>
          )}

          {technique.tags && technique.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {technique.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-3 py-1 text-sm rounded-full"
                    style={
                      tag.color
                        ? { backgroundColor: tag.color, color: '#fff' }
                        : {
                          backgroundColor: 'hsl(var(--primary) / 0.1)',
                          color: 'hsl(var(--primary))',
                        }
                    }
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-border">
          <a
            href={`/techniques/${technique.slug}/edit`}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Edit Technique
          </a>
          <a
            href="/techniques"
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
          >
            Back to Techniques
          </a>
        </div>
      </div>
    </AppLayout>
  );
}
