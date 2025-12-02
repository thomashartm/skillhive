'use client';

import { AppLayout } from '@/lib/components/layout/AppLayout';
import { CategoryManager } from '@/lib/components/categories/CategoryManager';
import { sidebarItems } from '@/lib/components/techniques/constants';

export const dynamic = 'force-dynamic';


// Default BJJ discipline ID (placeholder - should be replaced with actual discipline ID)
const BJJ_DISCIPLINE_ID = 1;

export default function TechniqueCategoriesPage() {
  return (
    <AppLayout sidebarItems={sidebarItems} sidebarTitle="Techniques">
      <CategoryManager disciplineId={BJJ_DISCIPLINE_ID} maxLevel={10} />
    </AppLayout>
  );
}
