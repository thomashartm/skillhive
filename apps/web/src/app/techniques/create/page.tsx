'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/lib/components/layout/AppLayout';
import { TechniqueForm, TechniqueFormData } from '@/lib/components/techniques/TechniqueForm';
import { apiClient, getErrorMessage } from '@/lib/backend';
import { TechniqueSidebarItems } from '@/lib/components/navigation/SidebarConfig';


// Default BJJ discipline ID (placeholder - should be replaced with actual discipline ID)
const BJJ_DISCIPLINE_ID = 1;

export default function CreateTechniquePage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCreate = async (data: TechniqueFormData) => {
    try {
      setIsCreating(true);
      setErrorMessage(null);

      // Step 1: Create the technique with only the fields the API accepts
      const createdTechnique = await apiClient.techniques.create({
        disciplineId: data.disciplineId,
        name: data.name,
        slug: data.slug || undefined,
        description: data.description || undefined,
        categoryIds: data.categoryIds,
      });

      // Step 2: Add tags separately (if any)
      if (data.tagIds && data.tagIds.length > 0) {
        await Promise.all(
          data.tagIds.map((tagId) => apiClient.techniques.addTag(createdTechnique.id, tagId))
        );
      }

      // Step 3: Create reference assets separately (if any)
      if (data.referenceAssets && data.referenceAssets.length > 0) {
        await Promise.all(
          data.referenceAssets.map((asset) =>
            apiClient.referenceAssets.create({
              techniqueId: createdTechnique.id,
              type: asset.type,
              url: asset.url,
              title: asset.title,
              description: asset.description,
              videoType: asset.videoType,
              originator: asset.originator,
              ord: asset.ord,
            })
          )
        );
      }

      // Redirect to the newly created technique's detail page
      if (createdTechnique && createdTechnique.slug) {
        router.push(`/techniques/${createdTechnique.slug}`);
      } else {
        router.push('/techniques');
      }
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    router.push('/techniques');
  };

  return (
    <AppLayout sidebarItems={TechniqueSidebarItems} sidebarTitle="Techniques">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Create New Technique</h1>
          <p className="text-muted-foreground">Add a new technique to your library</p>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-destructive mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-destructive">Error</h3>
                <p className="text-sm text-destructive/90 mt-1">{errorMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-destructive/70 hover:text-destructive"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border bg-card p-6">
          <TechniqueForm
            disciplineId={BJJ_DISCIPLINE_ID}
            onSubmit={handleCreate}
            onCancel={handleCancel}
          />
        </div>
        {isCreating && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card p-6 rounded-lg border border-border shadow-lg">
              <p className="text-foreground">Creating technique...</p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
