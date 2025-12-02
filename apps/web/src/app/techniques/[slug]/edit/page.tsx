'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/lib/components/layout/AppLayout';
import { TechniqueForm, TechniqueFormData } from '@/lib/components/techniques/TechniqueForm';

const sidebarItems = [
  { href: '/techniques', label: 'All Techniques' },
  { href: '/techniques/categories', label: 'By Category' },
  //{ href: '/techniques/favorites', label: 'Favorites' },
  { href: '/techniques/create', label: 'Add Technique' },
];

// Default BJJ discipline ID (placeholder - should be replaced with actual discipline ID)
const BJJ_DISCIPLINE_ID = 1;

export default function TechniqueEditPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [technique, setTechnique] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  const handleSubmit = async (data: TechniqueFormData) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/v1/techniques/${technique.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update technique');
      }

      // Redirect to technique detail page
      router.push(`/techniques/${slug}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update technique');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/techniques/${slug}`);
  };

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
        <div className="border-b border-border pb-4">
          <h1 className="text-3xl font-bold text-foreground mb-2">Edit Technique</h1>
          <p className="text-muted-foreground">Update technique details and reference materials</p>
        </div>

        <TechniqueForm
          technique={technique}
          disciplineId={BJJ_DISCIPLINE_ID}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />

        {saving && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6">
              <p className="text-foreground">Saving changes...</p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
