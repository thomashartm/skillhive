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

  const handleCreate = async (data: TechniqueFormData) => {
    try {
      setIsCreating(true);

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
      alert(getErrorMessage(err));
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
