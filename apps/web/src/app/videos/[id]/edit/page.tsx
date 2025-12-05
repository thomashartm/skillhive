'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/lib/components/layout/AppLayout';
import { VideoAssetSidebarItems } from '@/lib/components/navigation/SidebarConfig';
import { apiClient, getErrorMessage } from '@/lib/backend';
import { ReferenceAsset } from '@/lib/types/api';

interface Technique {
  id: number;
  name: string;
  slug: string;
}

export default function VideoEditPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;

  const [video, setVideo] = useState<ReferenceAsset | null>(null);
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [videoType, setVideoType] = useState<'short' | 'full' | 'instructional' | 'seminar'>(
    'full'
  );
  const [description, setDescription] = useState('');
  const [originator, setOriginator] = useState('');
  const [techniqueId, setTechniqueId] = useState<string>('');

  useEffect(() => {
    fetchVideo();
    fetchTechniques();
  }, [videoId]);

  const fetchVideo = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use API client to fetch video by ID
      const data = await apiClient.videos.getById(parseInt(videoId));
      setVideo(data);

      // Set form values
      setTitle(data.title || '');
      setVideoType(data.videoType || 'full');
      setDescription(data.description || '');
      setOriginator(data.originator || '');
      setTechniqueId(data.techniqueId ? data.techniqueId.toString() : '');
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchTechniques = async () => {
    try {
      // Use API client to fetch techniques
      const data = await apiClient.techniques.list({});
      setTechniques(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch techniques:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Use API client to update video
      await apiClient.videos.update(parseInt(videoId), {
        title,
        videoType,
        description: description || undefined,
        originator: originator || undefined,
        techniqueId: techniqueId ? parseInt(techniqueId) : undefined,
      });

      router.push(`/videos/${videoId}`);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout sidebarItems={VideoAssetSidebarItems} sidebarTitle="Videos">
        <div className="container mx-auto py-8 px-4">
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (error && !video) {
    return (
      <AppLayout sidebarItems={VideoAssetSidebarItems} sidebarTitle="Videos">
        <div className="container mx-auto py-8 px-4">
          <div className="text-center py-12 text-destructive">{error}</div>
          <div className="text-center mt-4">
            <Link href="/videos/my-videos" className="text-primary hover:underline">
              Back to My Videos
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout sidebarItems={VideoAssetSidebarItems} sidebarTitle="Videos">
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/videos/${videoId}`}
            className="text-primary hover:underline flex items-center gap-1"
          >
            ← Back to Video
          </Link>
          <h1 className="text-3xl font-bold text-foreground mt-4">Edit Video</h1>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-lg p-6 space-y-6"
        >
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive rounded-md text-destructive text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">
              Title <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
            />
          </div>

          <div>
            <label htmlFor="videoType" className="block text-sm font-medium text-foreground mb-2">
              Video Type <span className="text-destructive">*</span>
            </label>
            <select
              id="videoType"
              value={videoType}
              onChange={(e) => setVideoType(e.target.value as any)}
              required
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
            >
              <option value="short">Short</option>
              <option value="full">Full</option>
              <option value="instructional">Instructional</option>
              <option value="seminar">Seminar</option>
            </select>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              placeholder="Optional description..."
            />
          </div>

          <div>
            <label htmlFor="originator" className="block text-sm font-medium text-foreground mb-2">
              Author/Source
            </label>
            <input
              type="text"
              id="originator"
              value={originator}
              onChange={(e) => setOriginator(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              placeholder="e.g., John Danaher, Gordon Ryan"
            />
          </div>

          <div>
            <label htmlFor="techniqueId" className="block text-sm font-medium text-foreground mb-2">
              Associated Technique
            </label>
            <select
              id="techniqueId"
              value={techniqueId}
              onChange={(e) => setTechniqueId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
            >
              <option value="">None</option>
              {techniques.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
            <Link
              href={`/videos/${videoId}`}
              className="px-6 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
