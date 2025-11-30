'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '../../../components/layout/AppLayout';
import {
  CurriculumElementsSection,
  TechniqueSelectionModal,
  AssetSelectionModal,
} from '../../../components/curricula';
import { sidebarItems } from '../../../components/curricula';
import { apiClient, getErrorMessage } from '@/lib/api';

interface Curriculum {
  id: number;
  title: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CurriculumElement {
  id: number;
  curriculumId: number;
  type: 'technique' | 'asset' | 'text';
  ord: number;
  techniqueId: number | null;
  assetId: number | null;
  title: string | null;
  details: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function EditCurriculumPage() {
  const params = useParams();
  const router = useRouter();
  const curriculumId = params.id as string;

  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [elements, setElements] = useState<CurriculumElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Curriculum edit state
  const [editingCurriculum, setEditingCurriculum] = useState(false);
  const [curriculumForm, setCurriculumForm] = useState({
    title: '',
    description: '',
    isPublic: false,
  });

  // Preview maps and selection modal state
  const [techniqueMap, setTechniqueMap] = useState<Record<number, any>>({});
  const [videoMap, setVideoMap] = useState<Record<number, any>>({});
  const [disciplineId, setDisciplineId] = useState<number | null>(null);

  const [techniqueModal, setTechniqueModal] = useState<{ open: boolean; elementId: string | null }>(
    {
      open: false,
      elementId: null,
    }
  );
  const [assetModal, setAssetModal] = useState<{ open: boolean; elementId: string | null }>({
    open: false,
    elementId: null,
  });

  const [techniqueResults, setTechniqueResults] = useState<any[]>([]);
  const [assetResults, setAssetResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Notification banner state
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Confirmation state for delete action
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ elementId: number } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000); // Auto-dismiss after 5 seconds
  };

  useEffect(() => {
    if (curriculumId) {
      fetchCurriculum();
      fetchElements();
    }
  }, [curriculumId]);

  // Build technique and asset maps from elements (they now include the data)
  useEffect(() => {
    const tmap: Record<number, any> = {};
    const vmap: Record<number, any> = {};

    elements.forEach((el: any) => {
      // Extract technique data if present
      if (el.technique) {
        tmap[el.technique.id] = el.technique;
        if (disciplineId == null && typeof el.technique.disciplineId === 'number') {
          setDisciplineId(el.technique.disciplineId);
        }
      }
      // Extract asset data if present
      if (el.asset) {
        vmap[el.asset.id] = el.asset;
      }
    });

    console.log('Built technique map from elements:', tmap);
    console.log('Built video map from elements:', vmap);
    setTechniqueMap(tmap);
    setVideoMap(vmap);
  }, [elements]);

  const fetchCurriculum = async () => {
    try {
      // Use API client to fetch curriculum by ID
      const curriculum = await apiClient.curricula.getById(parseInt(curriculumId));
      setCurriculum(curriculum);
      setCurriculumForm({
        title: curriculum.title,
        description: curriculum.description || '',
        isPublic: curriculum.isPublic,
      });
    } catch (err: any) {
      console.error('Error fetching curriculum:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchElements = async () => {
    try {
      // Use API client to fetch curriculum elements
      const elements = await apiClient.curricula.elements.list(parseInt(curriculumId));
      console.log('Fetched elements:', elements);
      setElements(elements || []);
    } catch (err: any) {
      console.error('Error fetching elements:', err);
    }
  };

  const handleSaveCurriculum = async () => {
    try {
      setSaving(true);

      // Use API client to update curriculum
      await apiClient.curricula.update(parseInt(curriculumId), {
        title: curriculumForm.title,
        description: curriculumForm.description || null,
        isPublic: curriculumForm.isPublic,
      });

      await fetchCurriculum();
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
      const payload: any = {
        type: kind,
        details: null,
      };

      // For text elements, create with empty title
      // For technique/asset, create without ID and open modal
      if (kind === 'text') {
        payload.title = 'Click to add instruction text...';
      } else if (kind === 'technique') {
        payload.techniqueId = null;
      } else if (kind === 'asset') {
        payload.assetId = null;
      }

      // Use API client to create element
      const element = await apiClient.curricula.elements.add(parseInt(curriculumId), payload);
      const newElementId = String(element.id);

      await fetchElements();

      // Open appropriate modal for technique or asset
      if (kind === 'technique') {
        setTechniqueModal({ open: true, elementId: newElementId });
        setTechniqueResults([]);
      } else if (kind === 'asset') {
        setAssetModal({ open: true, elementId: newElementId });
        setAssetResults([]);
      }
    } catch (err: any) {
      showNotification('error', `Error: ${err.message}`);
    }
  };

  const handleDeleteElement = async (elementId: number) => {
    // Show confirmation banner instead of browser confirm
    setDeleteConfirmation({ elementId });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;

    try {
      // Use API client to delete element
      await apiClient.curricula.elements.delete(
        parseInt(curriculumId),
        deleteConfirmation.elementId
      );

      setDeleteConfirmation(null);
      await fetchElements();
      showNotification('success', 'Element deleted successfully');
    } catch (err: any) {
      setDeleteConfirmation(null);
      showNotification('error', `Error: ${getErrorMessage(err)}`);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmation(null);
  };

  const handleReorderElements = async (newOrder: CurriculumElement[]) => {
    try {
      const elementIds = newOrder.map((e) => e.id);

      // Use API client to reorder elements
      await apiClient.curricula.elements.reorder(parseInt(curriculumId), elementIds);

      await fetchElements();
    } catch (err: any) {
      showNotification('error', `Error: ${getErrorMessage(err)}`);
    }
  };

  if (loading) {
    return (
      <AppLayout sidebarItems={sidebarItems} sidebarTitle="Curricula">
        <div className="container mx-auto py-8 px-4">
          <div className="text-center text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (error || !curriculum) {
    return (
      <AppLayout sidebarItems={sidebarItems} sidebarTitle="Curricula">
        <div className="container mx-auto py-8 px-4">
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
            <p className="text-destructive text-sm">{error || 'Curriculum not found'}</p>
            <button
              onClick={() => router.push('/curricula/my-curricula')}
              className="mt-2 text-sm text-primary hover:underline"
            >
              Back to My Curricula
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout sidebarItems={sidebarItems} sidebarTitle="Curricula">
      {/* Delete Confirmation Banner */}
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
                onClick={cancelDelete}
                className="px-3 py-1 bg-white text-gray-800 rounded hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Banner */}
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
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Edit Curriculum</h2>
          <Link
            href={`/curricula/${curriculum.id}`}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
          >
            View Mode
          </Link>
        </div>

        {/* Curriculum Information */}
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
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={curriculumForm.description}
                  onChange={(e) =>
                    setCurriculumForm({ ...curriculumForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground resize-y"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-isPublic"
                  checked={curriculumForm.isPublic}
                  onChange={(e) =>
                    setCurriculumForm({ ...curriculumForm, isPublic: e.target.checked })
                  }
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

        {/* Enhanced Elements UI with previews and selection modals */}
        <div className="mb-6">
          <CurriculumElementsSection
            elements={(() => {
              const mapped = elements.map((el) => ({
                id: String(el.id),
                ord: el.ord,
                kind: el.type as 'text' | 'technique' | 'asset',
                techniqueId: el.techniqueId ?? undefined,
                assetId: el.assetId ?? undefined,
                text: el.type === 'text' ? el.title || '' : undefined,
              }));
              console.log('Passing elements to component:', mapped);
              console.log('Technique map:', techniqueMap);
              console.log('Video map:', videoMap);
              return mapped;
            })()}
            techniqueMap={techniqueMap}
            videoMap={videoMap}
            onAddElement={handleAddElement}
            onEditElement={(elementId) => {
              // Find the element to determine its type
              const element = elements.find((e) => String(e.id) === elementId);
              if (!element) return;

              // Open appropriate modal based on element type
              if (element.type === 'technique') {
                setTechniqueModal({ open: true, elementId });
                setTechniqueResults([]);
              } else if (element.type === 'asset') {
                setAssetModal({ open: true, elementId });
                setAssetResults([]);
              }
              // Text elements are edited inline, no modal needed
            }}
            onDeleteElement={(id) => {
              const numId = Number(id);
              if (Number.isFinite(numId)) handleDeleteElement(numId);
            }}
            onReorderElements={(payload) => {
              const ordered = payload.orderedIds
                .map((id) => elements.find((e) => String(e.id) === id))
                .filter(Boolean) as typeof elements;
              handleReorderElements(ordered);
            }}
            onPickTechnique={(elementId) => {
              setTechniqueModal({ open: true, elementId });
              setTechniqueResults([]);
            }}
            onPickAsset={(elementId) => {
              setAssetModal({ open: true, elementId });
              setAssetResults([]);
            }}
            onTextChange={async (elementId, text) => {
              const numId = Number(elementId);
              if (!Number.isFinite(numId)) return;
              try {
                // Use API client to update text element
                await apiClient.curricula.elements.update(parseInt(curriculumId), numId, {
                  title: text,
                });
                await fetchElements();
              } catch (e) {
                console.error('Failed to update text element:', e);
              }
            }}
          />
          <TechniqueSelectionModal
            open={techniqueModal.open}
            currentTechnique={
              techniqueModal.elementId
                ? (() => {
                    const element = elements.find((e) => String(e.id) === techniqueModal.elementId);
                    return element?.techniqueId ? techniqueMap[element.techniqueId] : null;
                  })()
                : null
            }
            onClose={() => setTechniqueModal({ open: false, elementId: null })}
            onSelect={async (techId) => {
              if (!techniqueModal.elementId) return;
              const numId = Number(techniqueModal.elementId);
              console.log('Updating element', numId, 'with techniqueId', techId);
              try {
                // Use API client to update element with techniqueId
                await apiClient.curricula.elements.update(parseInt(curriculumId), numId, {
                  techniqueId: techId,
                });

                setTechniqueModal({ open: false, elementId: null });
                await fetchElements();
                console.log('Elements refreshed');
              } catch (e: any) {
                console.error('Failed to set technique on element:', e);
                alert(`Error: ${getErrorMessage(e)}`);
              }
            }}
            onSearch={async (q) => {
              // Don't search if query is empty or too short
              if (!q || q.trim().length === 0) {
                setTechniqueResults([]);
                return;
              }

              setSearchLoading(true);
              try {
                // Use API client to search techniques
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
              assetModal.elementId
                ? (() => {
                    const element = elements.find((e) => String(e.id) === assetModal.elementId);
                    return element?.assetId ? videoMap[element.assetId] : null;
                  })()
                : null
            }
            onClose={() => setAssetModal({ open: false, elementId: null })}
            onSelect={async (assetId) => {
              if (!assetModal.elementId) return;
              const numId = Number(assetModal.elementId);
              try {
                // Use API client to update element with assetId
                await apiClient.curricula.elements.update(parseInt(curriculumId), numId, {
                  assetId,
                });
                setAssetModal({ open: false, elementId: null });
                await fetchElements();
              } catch (e) {
                console.error('Failed to set asset on element:', e);
              }
            }}
            onSearch={async (q) => {
              setSearchLoading(true);
              try {
                // Use API client to search videos
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

        {/* Back button */}
        <div className="mt-8">
          <Link href="/curricula/my-curricula" className="text-primary hover:underline">
            ← Back to My Curricula
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
