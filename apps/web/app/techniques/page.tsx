import { AppLayout } from '../components/layout/AppLayout';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Techniques - TrainHive',
  description: 'Browse and manage your technique library',
};

const sidebarItems = [
  { href: '/techniques', label: 'All Techniques' },
  { href: '/techniques/categories', label: 'By Category' },
  { href: '/techniques/favorites', label: 'Favorites' },
  { href: '/techniques/create', label: 'Add Technique' },
];

export default function TechniquesPage() {
  return (
    <AppLayout sidebarItems={sidebarItems} sidebarTitle="Techniques">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Techniques</h1>
          <p className="text-muted-foreground">Browse and manage your technique library</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">Techniques content coming soon...</p>
        </div>
      </div>
    </AppLayout>
  );
}
