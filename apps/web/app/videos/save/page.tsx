import { AppLayout } from '../../components/layout/AppLayout';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Save Video - TrainHive',
  description: 'Add and enrich video URLs with metadata',
};

const sidebarItems = [
  { href: '/videos/save', label: 'Add Video' },
  { href: '/videos/my-videos', label: 'My Videos' },
  { href: '/videos/recent', label: 'Recent' },
];

export default function SaveVideoPage() {
  return (
    <AppLayout sidebarItems={sidebarItems} sidebarTitle="Videos">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Save Video</h1>
          <p className="text-muted-foreground">Add and enrich video URLs with metadata</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-8">
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4">
            <p className="text-muted-foreground">Video player will appear here</p>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Video saving form coming soon...
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
