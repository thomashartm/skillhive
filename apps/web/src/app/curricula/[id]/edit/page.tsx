'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/lib/components/layout/AppLayout';
import {
  sidebarItems,
  useCurriculumDetail,
  useCurriculumElements,
  CurriculumElementsSection,
  TechniqueSelectionModal,
  AssetSelectionModal,
} from '@/lib/components/curricula';
import { LoadingState } from '../../_components/LoadingState';
import { ErrorState } from '../../_components/ErrorState';
import { apiClient, getErrorMessage } from '@/lib/backend';

export default function EditCurriculumPage() {
  const params = useParams();
  const router = useRouter();
  const curriculumId = params.id as string;

  const { curriculum, loading: curriculumLoading, error, update } = useCurriculumDetail(curriculumId);
  const {
    elements,
    techniqueMap,
    videoMap,
    disciplineId,
    loading: elementsLoading,
    addElement,
    updateElement,
    deleteElement,
    reorderElements,
  } = useCurriculumElements(curriculumId);

  const [editingCurriculum, setEditingCurriculum] = useState(false);
  const [curriculumForm, setCurriculumForm] = useState({
    title: curriculum?.title || '',
    description: curriculum?.description || '',
    isPublic: curriculum?.isPublic || false,
  });
  const [saving, setSaving] = useState(false);

  const [techniqueModal, setTechniqueModal] = useState<{ open: boolean; elementId: string | null }>({
    open: false,
    elementId: null,
  });
  const [assetModal, setAssetModal] = useState<{ open: boolean; elementId: string | null }>({
    open: false,
    elementId: null,
  });

  const [techniqueResults, setTechniqueResults] = useState<any[]>([]);
  const [assetResults, setAssetResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ elementId: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Update form when curriculum loads
  if (curriculum && !editingCurriculum && curriculumForm.title === '') {
    setCurriculumForm({
      title: curriculum.title,
      description: curriculum.description || '',
      isPublic: curriculum.isPublic,
    });
  }

  const handleSaveCurriculum = async () => {
    try {
      setSaving(true);
      await update({
        title: curriculumForm.title,
        description: curriculumForm.description || null,
        isPublic: curriculumForm.isPublic,
      });
      setEditingCurriculum(false);
      showNotification('success', 'Curriculum updated successfully');
    } catch (err: any) {
      showNotification('error', `Error: ${getErrorMessage(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddElement = async (kind: 'text' | 'technique' | 'asset') => {
    if (elements.length >= 50) {
      showNotification('error', 'Maximum 50 elements allowed per curriculum');
      return;
    }

    try {
      if (kind === 'text') {
        await addElement('text');
      } else if (kind === 'technique') {
        setTechniqueModal({ open: true, elementId: 'new' });
        setTechniqueResults([]);
      } else if (kind === 'asset') {
        setAssetModal({ open: true, elementId: 'new' });
        setAssetResults([]);
      }
    } catch (err: any) {
      showNotification('error', `Error: ${err.message}`);
    }
  };

  const handleDeleteElement = (elementId: string) => {
    setDeleteConfirmation({ elementId });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;

    try {
      await deleteElement(Number(deleteConfirmation.elementId));
      setDeleteConfirmation(null);
      showNotification('success', 'Element deleted successfully');
    } catch (err: any) {
      setDeleteConfirmation(null);
      showNotification('error', `Error: ${getErrorMessage(err)}`);
    }
  };

  if (curriculumLoading || elementsLoading) {
    return (
      <AppLayout sidebarItems={sidebarItems} sidebarTitle="Curricula">
        <div className="container mx-auto py-8 px-4">
          <LoadingState />
        </div>
      </AppLayout>
    );
  }

  if (error || !curriculum) {
    return (
      <AppLayout sidebarItems={sidebarItems} sidebarTitle="Curricula">
        <div className="container mx-auto py-8 px-4">
          <ErrorState
            error={error || 'Curriculum not found'}
            onRetry={() => router.push('/curricula/my-curricula')}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout sidebarItems={sidebarItems} sidebarTitle="Curricula">
      {deleteConfirmation && (
        <div className="fixed top-0 left-0 right-0 z-50 px-4 py-3 bg-yellow-500 text-white">
          <div className="container mx-auto flex items-center justify-between max-w-5xl">
            <span>Are you sure you want to delete this element?</span>
            <div className="flex items-center gap-2">
              <button
                onClick={confirmDelete}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="px-3 py-1 bg-white text-gray-800 rounded hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div
          className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 ${
            notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          <div className="container mx-auto flex items-center justify-between max-w-5xl">
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-4 text-white hover:text-gray-200"
              aria-label="Close notification"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="container mx-auto py-8 px-4 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Edit Curriculum</h2>
          <Link
            href={`/curricula/${curriculum.id}`}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
          >
            View Mode
          </Link>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-foreground">Curriculum Information</h4>
            {!editingCurriculum && (
              <button
                onClick={() => setEditingCurriculum(true)}
                className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                Edit Info
              </button>
            )}
          </div>

          {editingCurriculum ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Title <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={curriculumForm.title}
                  onChange={(e) => setCurriculumForm({ ...curriculumForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                <textarea
                  rows={4}
                  value={curriculumForm.description}
                  onChange={(e) => setCurriculumForm({ ...curriculumForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground resize-y"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-isPublic"
                  checked={curriculumForm.isPublic}
                  onChange={(e) => setCurriculumForm({ ...curriculumForm, isPublic: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="edit-isPublic" className="text-sm text-foreground">
                  Make this curriculum public
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveCurriculum}
                  disabled={saving}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setEditingCurriculum(false);
                    setCurriculumForm({
                      title: curriculum.title,
                      description: curriculum.description || '',
                      isPublic: curriculum.isPublic,
                    });
                  }}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-3">
                <span className="text-foreground font-medium">{curriculum.title}</span>
              </div>
              {curriculum.description && (
                <div className="mb-3">
                  <p className="text-foreground mt-1">{curriculum.description}</p>
                </div>
              )}
              <div>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    curriculum.isPublic
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                  }`}
                >
                  {curriculum.isPublic ? 'Public' : 'Private'}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="mb-6">
          <CurriculumElementsSection
            elements={elements}
            techniqueMap={techniqueMap}
            videoMap={videoMap}
            onAddElement={handleAddElement}
            onEditElement={(elementId) => {
              const element = elements.find((e) => e.id === elementId);
              if (!element) return;

              if (element.kind === 'technique') {
                setTechniqueModal({ open: true, elementId });
                setTechniqueResults([]);
              } else if (element.kind === 'asset') {
                setAssetModal({ open: true, elementId });
                setAssetResults([]);
              }
            }}
            onDeleteElement={handleDeleteElement}
            onReorderElements={reorderElements}
            onPickTechnique={(elementId) => {
              setTechniqueModal({ open: true, elementId });
              setTechniqueResults([]);
            }}
            onPickAsset={(elementId) => {
              setAssetModal({ open: true, elementId });
              setAssetResults([]);
            }}
            onTextChange={async (elementId, text) => {
              try {
                await updateElement(Number(elementId), { title: text });
              } catch (e) {
                console.error('Failed to update text element:', e);
              }
            }}
          />

          <TechniqueSelectionModal
            open={techniqueModal.open}
            currentTechnique={
              techniqueModal.elementId && techniqueModal.elementId !== 'new'
                ? (() => {
                    const element = elements.find((e) => e.id === techniqueModal.elementId);
                    return element?.techniqueId ? techniqueMap[element.techniqueId] : null;
                  })()
                : null
            }
            onClose={() => setTechniqueModal({ open: false, elementId: null })}
            onSelect={async (techId) => {
              if (!techniqueModal.elementId) return;

              try {
                if (techniqueModal.elementId === 'new') {
                  await addElement('technique', { techniqueId: techId });
                } else {
                  await updateElement(Number(techniqueModal.elementId), { techniqueId: techId });
                }
                setTechniqueModal({ open: false, elementId: null });
              } catch (e: any) {
                console.error('Failed to set technique on element:', e);
                alert(`Error: ${getErrorMessage(e)}`);
              }
            }}
            onSearch={async (q) => {
              if (!q || q.trim().length === 0) {
                setTechniqueResults([]);
                return;
              }

              setSearchLoading(true);
              try {
                const results = await apiClient.techniques.list({
                  disciplineId: disciplineId || undefined,
                  search: q.trim(),
                });
                setTechniqueResults(Array.isArray(results) ? results : []);
              } catch (err) {
                console.error('Failed to search techniques:', err);
                setTechniqueResults([]);
              } finally {
                setSearchLoading(false);
              }
            }}
            results={techniqueResults}
            loading={searchLoading}
          />

          <AssetSelectionModal
            open={assetModal.open}
            currentAsset={
              assetModal.elementId && assetModal.elementId !== 'new'
                ? (() => {
                    const element = elements.find((e) => e.id === assetModal.elementId);
                    return element?.assetId ? videoMap[element.assetId] : null;
                  })()
                : null
            }
            onClose={() => setAssetModal({ open: false, elementId: null })}
            onSelect={async (assetId) => {
              if (!assetModal.elementId) return;

              try {
                if (assetModal.elementId === 'new') {
                  await addElement('asset', { assetId });
                } else {
                  await updateElement(Number(assetModal.elementId), { assetId });
                }
                setAssetModal({ open: false, elementId: null });
              } catch (e) {
                console.error('Failed to set asset on element:', e);
              }
            }}
            onSearch={async (q) => {
              setSearchLoading(true);
              try {
                const data = await apiClient.videos.list({
                  title: q || undefined,
                });
                setAssetResults(data.videos || []);
              } catch (err) {
                console.error('Failed to search videos:', err);
                setAssetResults([]);
              } finally {
                setSearchLoading(false);
              }
            }}
            results={assetResults}
            loading={searchLoading}
          />
        </div>

        <div className="mt-8">
          <Link href="/curricula/my-curricula" className="text-primary hover:underline">
            ← Back to My Curricula
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
