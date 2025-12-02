'use client';

import { AppLayout } from '@/lib/components/layout/AppLayout';
import { CategoryManager } from '@/lib/components/categories/CategoryManager';

export const dynamic = 'force-dynamic';

const sidebarItems = [
  { href: '/techniques', label: 'All Techniques' },
  { href: '/techniques/categories', label: 'Categories' },
  { href: '/techniques/create', label: 'Add Technique' },
];

// Default BJJ discipline ID (placeholder - should be replaced with actual discipline ID)
const BJJ_DISCIPLINE_ID = 1;

export default function TechniqueCategoriesPage() {
  return (
    <AppLayout sidebarItems={sidebarItems} sidebarTitle="Techniques">
      <CategoryManager disciplineId={BJJ_DISCIPLINE_ID} maxLevel={10} />
    </AppLayout>
  );
}
