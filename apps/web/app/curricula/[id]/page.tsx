'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

interface CurriculumElement {
  id: number;
  curriculumId: number;
  type: 'technique' | 'asset' | 'text';
  ord: number;
  techniqueId: number | null;
  assetId: number | null;
  title: string | null;
  details: string | null;
  createdAt: string;
  updatedAt: string;
}

const sidebarItems = [
  { href: '/curricula/create', label: 'Create Curriculum' },
  { href: '/curricula/my-curricula', label: 'My Curricula' },
];

export default function CurriculumDetailPage() {
  const params = useParams();
  const router = useRouter();
  const curriculumId = params.id as string;

  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [elements, setElements] = useState<CurriculumElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (curriculumId) {
      fetchCurriculum();
      fetchElements();
    }
  }, [curriculumId]);

  const fetchCurriculum = async () => {
    try {
      const response = await fetch(`/api/v1/curricula/${curriculumId}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      setCurriculum(data.curriculum);
    } catch (err: any) {
      console.error('Error fetching curriculum:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchElements = async () => {
    try {
      const response = await fetch(`/api/v1/curricula/${curriculumId}/elements`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      setElements(data.elements || []);
    } catch (err: any) {
      console.error('Error fetching elements:', err);
    }
  };

  const renderElementContent = (element: CurriculumElement) => {
    if (element.type === 'text') {
      return (
        <div>
          <div className="font-medium text-foreground">{element.title}</div>
          {element.details && (
            <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
              {element.details}
            </div>
          )}
        </div>
      );
    }

    if (element.type === 'technique') {
      return (
        <div>
          <div className="font-medium text-foreground">
            Technique ID: {element.techniqueId}
          </div>
          {element.details && (
            <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
              {element.details}
            </div>
          )}
        </div>
      );
    }

    if (element.type === 'asset') {
      return (
        <div>
          <div className="font-medium text-foreground">
            Asset ID: {element.assetId}
          </div>
          {element.details && (
            <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
              {element.details}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <AppLayout sidebarItems={sidebarItems} sidebarTitle="Curricula">
        <div className="container mx-auto py-8 px-4">
          <div className="text-center text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (error || !curriculum) {
    return (
      <AppLayout sidebarItems={sidebarItems} sidebarTitle="Curricula">
        <div className="container mx-auto py-8 px-4">
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
            <p className="text-destructive text-sm">{error || 'Curriculum not found'}</p>
            <button
              onClick={() => router.push('/curricula/my-curricula')}
              className="mt-2 text-sm text-primary hover:underline"
            >
              Back to My Curricula
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout sidebarItems={sidebarItems} sidebarTitle="Curricula">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
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

        {/* Description */}
        {curriculum.description && (
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">Description</h2>
            <div className="text-foreground whitespace-pre-wrap">{curriculum.description}</div>
          </div>
        )}

        {/* Elements */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Curriculum Elements ({elements.length})
            </h2>
          </div>

          {elements.length === 0 ? (
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
              {elements.map((element, index) => (
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
                          element.type === 'technique'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : element.type === 'asset'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {element.type}
                      </span>
                    </div>
                    {renderElementContent(element)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Back button */}
        <div className="mt-8">
          <Link
            href="/curricula/my-curricula"
            className="text-primary hover:underline"
          >
            ← Back to My Curricula
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
