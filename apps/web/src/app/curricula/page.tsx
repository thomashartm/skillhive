'use client';

import { AppLayout } from '@/lib/components/layout/AppLayout';
import { ViewActionLink } from '@/lib/components/actionbar';
import { useCurriculaList } from '@/lib/components/curricula';
import { CurriculumGrid } from './_components/CurriculumGrid';
import { CurriculumCard } from './_components/CurriculumCard';
import { CurriculumSidebarItems } from '@/lib/components/navigation/SidebarConfig';

export const dynamic = 'force-dynamic';

export default function CurriculaPage() {
  const { curricula, loading, error, refresh } = useCurriculaList();

  return (
    <AppLayout sidebarItems={CurriculumSidebarItems} sidebarTitle="Curricula">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Curricula</h1>
          <p className="text-muted-foreground">Create and organize your training curricula</p>
        </div>

        <CurriculumGrid
          curricula={curricula}
          loading={loading}
          error={error}
          emptyMessage="There aren't any curricula yet."
          onRetry={refresh}
          renderCard={(curriculum) => (
            <CurriculumCard
              key={curriculum.id}
              curriculum={curriculum}
              actions={
                <ViewActionLink prefix="curricula" id={String(curriculum.id)} title="View curriculum" />
              }
            />
          )}
        />
      </div>
    </AppLayout>
  );
}
