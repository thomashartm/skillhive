'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '../../../components/layout/AppLayout';

interface Video {
  id: number;
  title: string;
  url: string;
  videoType: 'short' | 'full' | 'instructional' | 'seminar';
  description: string | null;
  originator: string | null;
  techniqueId: number | null;
  technique: { id: number; name: string; slug: string } | null;
}

interface Technique {
  id: number;
  name: string;
  slug: string;
}

const sidebarItems = [
  { href: '/videos/save', label: 'Add Video' },
  { href: '/videos/my-videos', label: 'My Videos' },
  { href: '/videos/recent', label: 'Recent' },
];

export default function VideoEditPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;

  const [video, setVideo] = useState<Video | null>(null);
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [videoType, setVideoType] = useState<'short' | 'full' | 'instructional' | 'seminar'>('full');
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

      const response = await fetch(`/api/v1/videos/${videoId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Video not found');
        }
        throw new Error('Failed to fetch video');
      }

      const data = await response.json();
      setVideo(data);

      // Set form values
      setTitle(data.title || '');
      setVideoType(data.videoType || 'full');
      setDescription(data.description || '');
      setOriginator(data.originator || '');
      setTechniqueId(data.techniqueId ? data.techniqueId.toString() : '');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTechniques = async () => {
    try {
      const response = await fetch('/api/v1/techniques');
      if (response.ok) {
        const data = await response.json();
        setTechniques(data);
      }
    } catch (err) {
      console.error('Failed to fetch techniques:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/videos/${videoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          videoType,
          description: description || null,
          originator: originator || null,
          techniqueId: techniqueId ? parseInt(techniqueId) : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update video');
      }

      router.push(`/videos/${videoId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout sidebarItems={sidebarItems} sidebarTitle="Videos">
        <div className="container mx-auto py-8 px-4">
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (error && !video) {
    return (
      <AppLayout sidebarItems={sidebarItems} sidebarTitle="Videos">
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
    <AppLayout sidebarItems={sidebarItems} sidebarTitle="Videos">
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
      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 space-y-6">
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
