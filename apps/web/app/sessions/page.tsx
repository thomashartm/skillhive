import { AppLayout } from '../components/layout/AppLayout';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Training Sessions - SkillHive',
  description: 'View and manage your training sessions',
};

const sidebarItems = [
  { href: '/sessions', label: 'All Sessions' },
  { href: '/sessions/upcoming', label: 'Upcoming' },
  { href: '/sessions/past', label: 'Past Sessions' },
  { href: '/sessions/create', label: 'Create Session' },
];

export default function SessionsPage() {
  return (
    <AppLayout sidebarItems={sidebarItems} sidebarTitle="Sessions">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Training Sessions</h1>
          <p className="text-muted-foreground">View and manage your training sessions</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">Training sessions content coming soon...</p>
        </div>
      </div>
    </AppLayout>
  );
}
