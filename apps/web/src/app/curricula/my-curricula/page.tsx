'use client';

import { AppLayout } from '@/lib/components/layout/AppLayout';
import { useCurriculaList, useCurriculumDetail } from '@/lib/components/curricula';
import {
  EditActionLink,
  ViewActionLink,
  ToogleVisibilityButton,
  DeleteButton,
  CreateLink,
} from '@/lib/components/actionbar';
import { PublicPrivateLabel } from '@/lib/components/labels';
import { CurriculumGrid } from '../_components/CurriculumGrid';
import { getErrorMessage } from '@/lib/backend';
import { CurriculumSidebarItems } from '@/lib/components/navigation/SidebarConfig';

export default function MyCurriculaPage() {
  const { curricula, loading, error, refresh } = useCurriculaList({ onlyMine: true });

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this curriculum?')) {
      return;
    }

    try {
      const { deleteCurriculum } = useCurriculumDetail(id, { autoFetch: false });
      await deleteCurriculum();
      refresh();
    } catch (err: any) {
      alert(`Error: ${getErrorMessage(err)}`);
    }
  };

  const handleTogglePublic = async (id: number) => {
    try {
      const { togglePublic } = useCurriculumDetail(id, { autoFetch: false });
      await togglePublic();
      refresh();
    } catch (err: any) {
      alert(`Error: ${getErrorMessage(err)}`);
    }
  };

  return (
    <AppLayout sidebarItems={CurriculumSidebarItems} sidebarTitle="Curricula">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">My Curricula</h1>
          <CreateLink path="/curricula/create" title="New Curriculum" />
        </div>

        <CurriculumGrid
          curricula={curricula}
          loading={loading}
          error={error}
          emptyMessage="You haven't created any curricula yet."
          onRetry={refresh}
          renderCard={(curriculum) => (
            <div
              key={curriculum.id}
              className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-xl font-semibold text-foreground flex-1">
                  {curriculum.title}
                </h2>
                <PublicPrivateLabel
                  isPublic={curriculum.isPublic}
                  title={curriculum.isPublic ? 'Public' : 'Private'}
                />
              </div>

              {curriculum.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {curriculum.description}
                </p>
              )}

              <div className="text-xs text-muted-foreground mb-4">
                Updated {new Date(curriculum.updatedAt).toLocaleDateString()}
              </div>

              <div className="flex items-center justify-end gap-2 mt-auto pt-4 border-t border-border">
                <ViewActionLink prefix="curricula" id={curriculum.id} title="View curriculum" />
                <EditActionLink prefix="curricula" id={curriculum.id} title="Edit curriculum" />
                <ToogleVisibilityButton
                  onClick={() => handleTogglePublic(curriculum.id)}
                  title={curriculum.isPublic ? 'Make private' : 'Make public'}
                  isPublic={curriculum.isPublic}
                />
                <DeleteButton onClick={() => handleDelete(curriculum.id)} title="Delete" />
              </div>
            </div>
          )}
        />
      </div>
    </AppLayout>
  );
}
