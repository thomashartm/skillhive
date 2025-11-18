'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppLayout } from '../../components/layout/AppLayout';

interface Curriculum {
  id: number;
  title: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

const sidebarItems = [
  { href: '/curricula/create', label: 'Create Curriculum' },
  { href: '/curricula/my-curricula', label: 'My Curricula' },
];

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

      const response = await fetch('/api/v1/curricula?onlyMine=true');

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

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this curriculum?')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/curricula/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete curriculum');
      }

      // Refresh the list
      fetchCurricula();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleTogglePublic = async (curriculum: Curriculum) => {
    try {
      const response = await fetch(`/api/v1/curricula/${curriculum.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isPublic: !curriculum.isPublic,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update curriculum');
      }

      // Refresh the list
      fetchCurricula();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <AppLayout sidebarItems={sidebarItems} sidebarTitle="Curricula">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">My Curricula</h1>
          <Link
            href="/curricula/create"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Create New Curriculum
          </Link>
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
                <p className="text-muted-foreground mb-4">
                  You haven't created any curricula yet.
                </p>
                <Link
                  href="/curricula/create"
                  className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Create Your First Curriculum
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {curricula.map((curriculum) => (
                  <div
                    key={curriculum.id}
                    className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
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

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/curricula/${curriculum.id}`}
                        className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
                      >
                        View
                      </Link>
                      <Link
                        href={`/curricula/${curriculum.id}/edit`}
                        className="px-3 py-1.5 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleTogglePublic(curriculum)}
                        className="px-3 py-1.5 text-sm border border-border rounded hover:bg-muted"
                      >
                        {curriculum.isPublic ? 'Make Private' : 'Make Public'}
                      </button>
                      <button
                        onClick={() => handleDelete(curriculum.id)}
                        className="px-3 py-1.5 text-sm text-destructive border border-destructive rounded hover:bg-destructive/10"
                      >
                        Delete
                      </button>
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
