'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { sidebarItems, useCurriculaList } from '../../components/curricula';
import { ViewActionLink } from '../../components/actionbar';
import { PublicPrivateLabel } from '../../components/labels';
import { CurriculumGrid } from '../_components/CurriculumGrid';
import { apiClient } from '@/lib/api';

export default function SharedCurriculaPage() {
  const { curricula: allPublicCurricula, loading, error, refresh } = useCurriculaList({ isPublic: true });
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const currentUser = await apiClient.users.getMe();
      setCurrentUserId(currentUser.id);
    };
    fetchCurrentUser();
  }, []);

  // Filter out curricula created by the current user
  const sharedCurricula = allPublicCurricula.filter(
    (curriculum) => currentUserId && curriculum.createdBy !== currentUserId
  );

  return (
    <AppLayout sidebarItems={sidebarItems} sidebarTitle="Curricula">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Shared with Me</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Public curricula shared by other users
            </p>
          </div>
        </div>

        <CurriculumGrid
          curricula={sharedCurricula}
          loading={loading}
          error={error}
          emptyMessage="No public curricula shared by other users yet. Public curricula created by other users will appear here."
          onRetry={refresh}
          renderCard={(curriculum) => (
            <div
              key={curriculum.id}
              className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-xl font-semibold text-foreground flex-1">
                  {curriculum.title}
                </h2>
                <PublicPrivateLabel
                  isPublic={curriculum.isPublic}
                  title={curriculum.isPublic ? 'Public' : 'Private'}
                />
              </div>

              {curriculum.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {curriculum.description}
                </p>
              )}

              <div className="text-xs text-muted-foreground mb-4">
                Updated {new Date(curriculum.updatedAt).toLocaleDateString()}
              </div>

              <div className="flex items-center justify-end gap-2 mt-auto pt-4 border-t border-border">
                <ViewActionLink prefix="curricula" id={curriculum.id} title="View curriculum" />
              </div>
            </div>
          )}
        />
      </div>
    </AppLayout>
  );
}
