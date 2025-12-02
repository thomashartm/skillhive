'use client';

import { AppLayout } from '@/lib/components/layout/AppLayout';
import { SaveVideoForm } from '@/lib/components/videos/SaveVideoForm';
import { sidebarItems } from '@/lib/components/videos';

export default function SaveVideoPage() {
  // TODO: Get disciplineId from user preferences or context
  // For now, using a default disciplineId of 1
  const disciplineId = 1;

  return (
    <AppLayout sidebarItems={sidebarItems} sidebarTitle="Videos">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Save Video</h1>
          <p className="text-muted-foreground">
            Quickly save and organize video links with automatic metadata extraction
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <SaveVideoForm
            disciplineId={disciplineId}
            onSuccess={() => {
              console.log('Video saved successfully!');
            }}
          />
        </div>
      </div>
    </AppLayout>
  );
}
