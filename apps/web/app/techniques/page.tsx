'use client';

import { AppLayout } from '../components/layout/AppLayout';
import { TechniqueManager } from '../components/techniques/TechniqueManager';

export const dynamic = 'force-dynamic';

const sidebarItems = [
  { href: '/techniques', label: 'All Techniques' },
  { href: '/techniques/categories', label: 'By Category' },
  //{ href: '/techniques/favorites', label: 'Favorites' },
];

// Default BJJ discipline ID (placeholder - should be replaced with actual discipline ID)
const BJJ_DISCIPLINE_ID = 1;

export default function TechniquesPage() {
  return (
    <AppLayout sidebarItems={sidebarItems} sidebarTitle="Techniques">
      <TechniqueManager disciplineId={BJJ_DISCIPLINE_ID} />
    </AppLayout>
  );
}
