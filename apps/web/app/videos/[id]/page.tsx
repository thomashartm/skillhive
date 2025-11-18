'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '../../components/layout/AppLayout';

interface Video {
  id: number;
  title: string;
  url: string;
  videoType: string;
  description: string | null;
  originator: string | null;
  createdAt: string;
  updatedAt: string;
  technique: { id: number; name: string; slug: string } | null;
  categories: { id: number; name: string; slug: string }[];
}

const sidebarItems = [
  { href: '/videos/save', label: 'Add Video' },
  { href: '/videos/my-videos', label: 'My Videos' },
  { href: '/videos/recent', label: 'Recent' },
];

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;

  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVideo();
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this video?')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/videos/${videoId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete video');
      }

      router.push('/videos/my-videos');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
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

  if (error || !video) {
    return (
      <AppLayout sidebarItems={sidebarItems} sidebarTitle="Videos">
        <div className="container mx-auto py-8 px-4">
          <div className="text-center py-12 text-destructive">
            {error || 'Video not found'}
          </div>
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
      <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/videos/my-videos"
          className="text-primary hover:underline flex items-center gap-1"
        >
          ← Back to My Videos
        </Link>
        <div className="flex gap-2">
          <Link
            href={`/videos/${video.id}/edit`}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Edit
          </Link>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Video Information */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{video.title || 'Untitled Video'}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">
              {video.videoType}
            </span>
            <span>Uploaded {new Date(video.createdAt).toLocaleDateString()}</span>
            {video.updatedAt !== video.createdAt && (
              <span>Updated {new Date(video.updatedAt).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        {video.description && (
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-2">Description</h2>
            <div
              className="text-sm text-muted-foreground prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: video.description }}
            />
          </div>
        )}

        {video.originator && (
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-2">Author/Source</h2>
            <p className="text-sm text-muted-foreground">{video.originator}</p>
          </div>
        )}

        <div>
          <h2 className="text-sm font-semibold text-foreground mb-2">Video URL</h2>
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline break-all"
          >
            {video.url}
          </a>
        </div>

        {video.technique && (
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-2">Associated Technique</h2>
            <Link
              href={`/techniques/${video.technique.slug}`}
              className="text-sm text-primary hover:underline"
            >
              {video.technique.name}
            </Link>
          </div>
        )}

        {video.categories && video.categories.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-2">Categories</h2>
            <div className="flex flex-wrap gap-2">
              {video.categories.map((cat) => (
                <span
                  key={cat.id}
                  className="px-3 py-1 rounded-full text-sm bg-secondary text-secondary-foreground"
                >
                  {cat.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>
    </AppLayout>
  );
}
