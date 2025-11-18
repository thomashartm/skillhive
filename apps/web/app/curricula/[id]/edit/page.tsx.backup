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

const sidebarItems = [
  { href: '/curricula/create', label: 'Create Curriculum' },
  { href: '/curricula/my-curricula', label: 'My Curricula' },
];

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

  useEffect(() => {
    if (curriculumId) {
      fetchCurriculum();
      fetchElements();
    }
  }, [curriculumId]);

  // Load previews for techniques and assets whenever the element list changes
  useEffect(() => {
    const tIds = Array.from(
      new Set(elements.map((e) => e.techniqueId).filter((x): x is number => typeof x === 'number'))
    );
    const aIds = Array.from(
      new Set(elements.map((e) => e.assetId).filter((x): x is number => typeof x === 'number'))
    );

    async function loadPreviews() {
      try {
        // Batch load assets (videos)
        if (aIds.length > 0) {
          const res = await fetch(`/api/v1/videos?ids=${aIds.join(',')}`);
          if (res.ok) {
            const vids = await res.json();
            const vmap: Record<number, any> = {};
            vids.forEach((v: any) => {
              vmap[v.id] = v;
            });
            setVideoMap(vmap);
          } else {
            setVideoMap({});
          }
        } else {
          setVideoMap({});
        }

        // Load techniques individually (disciplineId not known here)
        if (tIds.length > 0) {
          const tmap: Record<number, any> = {};
          for (const id of tIds) {
            const tr = await fetch(`/api/v1/techniques/${id}`);
            if (tr.ok) {
              const t = await tr.json();
              tmap[t.id] = t;
              if (disciplineId == null && typeof t.disciplineId === 'number') {
                setDisciplineId(t.disciplineId);
              }
            }
          }
          setTechniqueMap(tmap);
        } else {
          setTechniqueMap({});
        }
      } catch (e) {
        console.error('Error loading previews:', e);
      }
    }

    if (elements.length > 0) {
      loadPreviews();
    } else {
      setTechniqueMap({});
      setVideoMap({});
    }
  }, [elements]);

  const fetchCurriculum = async () => {
    try {
      const response = await fetch(`/api/v1/curricula/${curriculumId}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      setCurriculum(data.curriculum);
      setCurriculumForm({
        title: data.curriculum.title,
        description: data.curriculum.description || '',
        isPublic: data.curriculum.isPublic,
      });
    } catch (err: any) {
      console.error('Error fetching curriculum:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchElements = async () => {
    try {
      const response = await fetch(`/api/v1/curricula/${curriculumId}/elements`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      setElements(data.elements || []);
    } catch (err: any) {
      console.error('Error fetching elements:', err);
    }
  };

  const handleSaveCurriculum = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/v1/curricula/${curriculumId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: curriculumForm.title,
          description: curriculumForm.description || null,
          isPublic: curriculumForm.isPublic,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update curriculum');
      }

      await fetchCurriculum();
      setEditingCurriculum(false);
      alert('Curriculum updated successfully');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddElement = async (kind: 'text' | 'technique' | 'asset') => {
    if (elements.length >= 50) {
      alert('Maximum 50 elements allowed per curriculum');
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

      const response = await fetch(`/api/v1/curricula/${curriculumId}/elements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add element');
      }

      const result = await response.json();
      const newElementId = String(result.element.id);

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
      alert(`Error: ${err.message}`);
    }
  };


  const handleDeleteElement = async (elementId: number) => {
    if (!confirm('Are you sure you want to delete this element?')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/curricula/${curriculumId}/elements/${elementId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete element');
      }

      await fetchElements();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleReorderElements = async (newOrder: CurriculumElement[]) => {
    try {
      const elementIds = newOrder.map((e) => e.id);

      const response = await fetch(`/api/v1/curricula/${curriculumId}/elements/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elementIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to reorder elements');
      }

      await fetchElements();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
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
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        {/* Enhanced Elements UI with previews and selection modals */}
        <div className="mb-6">
          <CurriculumElementsSection
            elements={elements.map((el) => ({
              id: String(el.id),
              ord: el.ord,
              kind: el.type as 'text' | 'technique' | 'asset',
              techniqueId: el.techniqueId ?? undefined,
              assetId: el.assetId ?? undefined,
              text: el.type === 'text' ? el.title || '' : undefined,
            }))}
            techniqueMap={techniqueMap}
            videoMap={videoMap}
            onAddElement={handleAddElement}
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
                await fetch(`/api/v1/curricula/${curriculumId}/elements/${numId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ title: text }),
                });
                await fetchElements();
              } catch (e) {
                console.error('Failed to update text element:', e);
              }
            }}
          />
          <TechniqueSelectionModal
            open={techniqueModal.open}
            onClose={() => setTechniqueModal({ open: false, elementId: null })}
            onSelect={async (techId) => {
              if (!techniqueModal.elementId) return;
              const numId = Number(techniqueModal.elementId);
              try {
                await fetch(`/api/v1/curricula/${curriculumId}/elements/${numId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ techniqueId: techId }),
                });
                setTechniqueModal({ open: false, elementId: null });
                await fetchElements();
              } catch (e) {
                console.error('Failed to set technique on element:', e);
              }
            }}
            onSearch={async (q) => {
              if (!disciplineId) return;
              setSearchLoading(true);
              try {
                const res = await fetch(
                  `/api/v1/techniques?disciplineId=${disciplineId}&search=${encodeURIComponent(q)}`
                );
                if (res.ok) {
                  const json = await res.json();
                  setTechniqueResults(json);
                } else {
                  setTechniqueResults([]);
                }
              } finally {
                setSearchLoading(false);
              }
            }}
            results={techniqueResults}
            loading={searchLoading}
          />
          <AssetSelectionModal
            open={assetModal.open}
            onClose={() => setAssetModal({ open: false, elementId: null })}
            onSelect={async (assetId) => {
              if (!assetModal.elementId) return;
              const numId = Number(assetModal.elementId);
              try {
                await fetch(`/api/v1/curricula/${curriculumId}/elements/${numId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ assetId }),
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
                const res = await fetch(`/api/v1/videos?search=${encodeURIComponent(q)}`);
                if (res.ok) {
                  const json = await res.json();
                  setAssetResults(json);
                } else {
                  setAssetResults([]);
                }
              } finally {
                setSearchLoading(false);
              }
            }}
            results={assetResults}
            loading={searchLoading}
          />
        </div>
        {/* Curriculum Info */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Curriculum Details</h2>
          <Link
            href={`/curricula/${curriculum.id}`}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
          >
            View Mode
          </Link>
        </div>
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Curriculum Information</h2>
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
                <span className="text-sm text-muted-foreground">Title: </span>
                <span className="text-foreground font-medium">{curriculum.title}</span>
              </div>
              {curriculum.description && (
                <div className="mb-3">
                  <span className="text-sm text-muted-foreground">Description: </span>
                  <p className="text-foreground mt-1">{curriculum.description}</p>
                </div>
              )}
              <div>
                <span className="text-sm text-muted-foreground">Visibility: </span>
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
