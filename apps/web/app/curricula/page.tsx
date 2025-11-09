import { AppLayout } from '../components/layout/AppLayout';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Curricula - TrainHive',
  description: 'Create and organize your training curricula',
};

const sidebarItems = [
  { href: '/curricula', label: 'All Curricula' },
  { href: '/curricula/my-curricula', label: 'My Curricula' },
  { href: '/curricula/shared', label: 'Shared with Me' },
  { href: '/curricula/create', label: 'Create Curriculum' },
];

export default function CurriculaPage() {
  return (
    <AppLayout sidebarItems={sidebarItems} sidebarTitle="Curricula">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Curricula</h1>
          <p className="text-muted-foreground">Create and organize your training curricula</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">Curricula content coming soon...</p>
        </div>
      </div>
    </AppLayout>
  );
}
