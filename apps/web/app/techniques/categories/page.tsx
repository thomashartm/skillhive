import { AppLayout } from '../../components/layout/AppLayout';
import { CategoryManager } from '../../components/categories/CategoryManager';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Technique Categories - TrainHive',
  description: 'Organize techniques into hierarchical categories',
};

const sidebarItems = [
  { href: '/techniques', label: 'All Techniques' },
  { href: '/techniques/categories', label: 'By Category' },
  { href: '/techniques/favorites', label: 'Favorites' },
  { href: '/techniques/create', label: 'Add Technique' },
];

// Default BJJ discipline ID (placeholder - should be replaced with actual discipline ID)
const BJJ_DISCIPLINE_ID = '00000000-0000-0000-0000-000000000001';

export default function TechniqueCategoriesPage() {
  return (
    <AppLayout sidebarItems={sidebarItems} sidebarTitle="Techniques">
      <CategoryManager disciplineId={BJJ_DISCIPLINE_ID} maxLevel={5} />
    </AppLayout>
  );
}
