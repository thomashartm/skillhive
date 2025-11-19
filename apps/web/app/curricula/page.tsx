'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppLayout } from '../components/layout/AppLayout';
import { HiEye, HiPencil, HiTrash } from 'react-icons/hi';
import { HiGlobeAlt, HiEyeSlash } from 'react-icons/hi2';
import { sidebarItems } from '../components/curricula';

export const dynamic = 'force-dynamic';

export default function CurriculaPage() {
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

      const response = await fetch('/api/v1/curricula');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      setCurricula(data.curricula || []);
    } catch (err: any) {
      console.error('Error fetching curricula:', err);
      setError(err.message);
      setCurricula([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout sidebarItems={sidebarItems} sidebarTitle="Curricula">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Curricula</h1>
          <p className="text-muted-foreground">Create and organize your training curricula</p>
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
                <p className="text-muted-foreground mb-4">There aren't any curricula yet.</p>
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
                      ToDo Place Editbar
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
