'use client';

import { AppLayout } from '@/lib/components/layout/AppLayout';
import { TechniqueManager } from '@/lib/components/techniques/TechniqueManager';
import { TechniqueSidebarItems } from '@/lib/components/navigation/SidebarConfig';

export const dynamic = 'force-dynamic';


// Default BJJ discipline ID (placeholder - should be replaced with actual discipline ID)
const BJJ_DISCIPLINE_ID = 1;

export default function TechniquesPage() {
  return (
    <AppLayout sidebarItems={TechniqueSidebarItems} sidebarTitle="Techniques">
      <TechniqueManager disciplineId={BJJ_DISCIPLINE_ID} />
    </AppLayout>
  );
}
