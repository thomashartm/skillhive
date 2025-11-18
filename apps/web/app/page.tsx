import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './components/dashboard/Dashboard';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'SkillHive Dashboard',
  description: 'Manage your BJJ training and knowledge',
};

export default function Home() {
  return (
    <AppLayout>
      <Dashboard />
    </AppLayout>
  );
}
