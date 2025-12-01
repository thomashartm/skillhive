'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '../../components/layout/AppLayout';
import { CurriculumElementsSection, sidebarItems } from '../../components/curricula';
import { apiClient, getErrorMessage } from '@/lib/api';

export default function CreateCurriculumPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    isPublic: false,
  });
  const [created, setCreated] = useState<{ id: number } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Use API client to create curriculum
      const curriculum = await apiClient.curricula.create({
        title: formData.title,
        description: formData.description || null,
        isPublic: formData.isPublic,
      });

      // Show inline builder (DnD list) on this page
      setCreated({ id: curriculum.id });
    } catch (err: any) {
      console.error('Error creating curriculum:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout sidebarItems={sidebarItems} sidebarTitle="Curricula">
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">Create New Curriculum</h1>

        {error && (
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4 mb-6">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {created && (
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Elements (0/50)</h2>
              <button
                type="button"
                onClick={() => router.push(`/curricula/${created.id}/edit`)}
                className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                Open full editor
              </button>
            </div>
            <CurriculumElementsSection
              elements={[]}
              onAddElement={() => router.push(`/curricula/${created.id}/edit`)}
              onReorderElements={() => router.push(`/curricula/${created.id}/edit`)}
            />
          </div>
        )}
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6">
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">
                Title <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                id="title"
                required
                maxLength={255}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Brazilian Jiu-Jitsu Fundamentals"
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Description
              </label>
              <textarea
                id="description"
                rows={6}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this curriculum covers... (supports markdown)"
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                You can use markdown for formatting (bold, italics, lists, etc.)
              </p>
            </div>

            {/* Is Public */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="isPublic"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                className="mt-1 w-4 h-4 border-border rounded bg-background text-primary focus:ring-2 focus:ring-primary"
              />
              <div>
                <label htmlFor="isPublic" className="block text-sm font-medium text-foreground">
                  Make this curriculum public
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  Public curricula can be viewed by other users. You can change this later.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 mt-8 pt-6 border-t border-border">
            <button
              type="submit"
              disabled={loading || !formData.title.trim()}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Curriculum'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/curricula/my-curricula')}
              className="px-6 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
