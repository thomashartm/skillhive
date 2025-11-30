'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppLayout } from '../../components/layout/AppLayout';
import { sidebarItems } from '../../components/curricula';
import {
  EditActionLink,
  ViewActionLink,
  ToogleVisibilityButton,
  DeleteButton,
  CreateLink,
} from '../../components/actionbar';
import { PublicPrivateLabel } from '../../components/labels';
import { apiClient, getErrorMessage } from '@/lib/api';

interface Curriculum {
  id: number;
  title: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function MyCurriculaPage() {
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCurricula();
  }, []);

  const fetchCurricula = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use API client to fetch user's curricula
      const curricula = await apiClient.curricula.list({ onlyMine: true });
      setCurricula(curricula || []);
    } catch (err: any) {
      console.error('Error fetching curricula:', err);
      setError(getErrorMessage(err));
      setCurricula([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this curriculum?')) {
      return;
    }

    try {
      // Use API client to delete curriculum
      await apiClient.curricula.delete(id);

      // Refresh the list
      fetchCurricula();
    } catch (err: any) {
      alert(`Error: ${getErrorMessage(err)}`);
    }
  };

  const handleTogglePublic = async (curriculum: Curriculum) => {
    try {
      // Use API client to update curriculum visibility
      await apiClient.curricula.update(curriculum.id, {
        isPublic: !curriculum.isPublic,
      });

      // Refresh the list
      fetchCurricula();
    } catch (err: any) {
      alert(`Error: ${getErrorMessage(err)}`);
    }
  };

  return (
    <AppLayout sidebarItems={sidebarItems} sidebarTitle="Curricula">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">My Curricula</h1>
          <CreateLink path="/curricula/create" title="New Curriculum" />
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
                fetchCurricula();
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
                <p className="text-muted-foreground mb-4">You haven't created any curricula yet.</p>
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
                      <EditActionLink
                        prefix="curricula"
                        id={curriculum.id}
                        title="Edit curriculum"
                      />
                      <ToogleVisibilityButton
                        onClick={() => handleTogglePublic(curriculum)}
                        title={curriculum.isPublic ? 'Make private' : 'Make public'}
                        isPublic={curriculum.isPublic}
                      />
                      <DeleteButton onClick={() => handleDelete(curriculum.id)} title="Delete" />
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
