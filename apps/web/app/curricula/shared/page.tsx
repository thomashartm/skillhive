'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { sidebarItems } from '../../components/curricula';
import { ViewActionLink } from '../../components/actionbar';
import { PublicPrivateLabel } from '../../components/labels';
import { apiClient, getErrorMessage } from '@/lib/api';

interface Curriculum {
  id: number;
  title: string;
  description: string | null;
  isPublic: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: number;
}

export default function SharedCurriculaPage() {
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    fetchSharedCurricula();
  }, []);

  const fetchSharedCurricula = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user ID
      const currentUser = await apiClient.users.getMe();
      setCurrentUserId(currentUser.id);

      // Fetch all public curricula
      const allPublicCurricula = await apiClient.curricula.list({ isPublic: true });

      // Filter out curricula created by the current user
      const sharedCurricula = (allPublicCurricula || []).filter(
        (curriculum) => curriculum.createdBy !== currentUser.id
      );

      setCurricula(sharedCurricula);
    } catch (err: any) {
      console.error('Error fetching shared curricula:', err);
      setError(getErrorMessage(err));
      setCurricula([]);
    } finally {
      setLoading(false);
    }
  };

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

        {/* Loading state */}
        {loading && <div className="text-center py-8 text-muted-foreground">Loading...</div>}

        {/* Error state */}
        {!loading && error && curricula.length === 0 && (
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4 mb-4">
            <p className="text-destructive text-sm">{error}</p>
            <button
              onClick={() => {
                setError(null);
                fetchSharedCurricula();
              }}
              className="mt-2 text-sm text-destructive hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Curricula Grid */}
        {!loading && (
          <>
            {curricula.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  No public curricula shared by other users yet.
                </p>
                <p className="text-sm text-muted-foreground">
                  Public curricula created by other users will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {curricula.map((curriculum) => (
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

                    {/* Icon action bar at bottom */}
                    <div className="flex items-center justify-end gap-2 mt-auto pt-4 border-t border-border">
                      <ViewActionLink
                        prefix="curricula"
                        id={curriculum.id}
                        title="View curriculum"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
