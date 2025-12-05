'use client';

import { useState, useEffect } from 'react';
import { RichTextEditor } from '../common/RichTextEditor';
import { apiClient } from '@/lib/backend';
import { ReferenceAssetFormData } from '../techniques/TechniqueForm';

interface VideoMetadata {
  provider: string;
  title: string;
  author: string;
  authorUrl: string;
  thumbnailUrl: string;
  embedHtml: string;
  width?: number;
  height?: number;
}

interface VideoAssetFormModalProps {
  disciplineId: number;
  onSave: (asset: ReferenceAssetFormData) => void;
  onClose: () => void;
  initialData?: Partial<ReferenceAssetFormData>;
}

export function VideoAssetFormModal({
  disciplineId,
  onSave,
  onClose,
  initialData,
}: VideoAssetFormModalProps) {
  const [videoUrl, setVideoUrl] = useState(initialData?.url || '');
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [authorName, setAuthorName] = useState(initialData?.originator || '');
  const [authorUrl, setAuthorUrl] = useState('');
  const [embedHtml, setEmbedHtml] = useState('');
  const [videoType, setVideoType] = useState<'short' | 'full' | 'instructional' | 'seminar'>(
    initialData?.videoType || 'instructional'
  );

  // Video preview
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Detect if URL is a video platform URL
  const isVideoUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      return (
        hostname.includes('youtube.com') ||
        hostname.includes('youtu.be') ||
        hostname.includes('facebook.com') ||
        hostname.includes('instagram.com')
      );
    } catch {
      return false;
    }
  };

  // Fetch oEmbed metadata when video URL changes
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!videoUrl || !isVideoUrl(videoUrl)) {
        setVideoMetadata(null);
        return;
      }

      setIsLoadingMetadata(true);
      setMetadataError(null);

      try {
        const data: VideoMetadata = await apiClient.oembed.fetch(videoUrl);
        setVideoMetadata(data);

        // Prefill form fields if not already filled
        if (!title && data.title) setTitle(data.title);
        if (!authorName && data.author) setAuthorName(data.author);
        if (!authorUrl && data.authorUrl) setAuthorUrl(data.authorUrl);
        if (!embedHtml && data.embedHtml) setEmbedHtml(data.embedHtml);
      } catch (error: any) {
        console.error('Error fetching video metadata:', error);
        setMetadataError(error.message || 'Failed to fetch video metadata');
        setVideoMetadata(null);
      } finally {
        setIsLoadingMetadata(false);
      }
    };

    // Debounce the fetch
    const timer = setTimeout(fetchMetadata, 500);
    return () => clearTimeout(timer);
  }, [videoUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous messages
    setErrorMessage(null);

    // Validation
    if (!videoUrl) {
      setErrorMessage('Please enter a video URL');
      return;
    }

    if (!title) {
      setErrorMessage('Please enter a title');
      return;
    }

    // Create asset data
    const assetData: ReferenceAssetFormData = {
      type: 'video',
      url: videoUrl,
      title: title || null,
      description: description || null,
      videoType,
      originator: authorName || null,
      ord: initialData?.ord || 0,
      tagIds: initialData?.tagIds || [],
    };

    console.log('VideoAssetFormModal: Submitting asset data:', assetData);
    onSave(assetData);
    console.log('VideoAssetFormModal: onSave called successfully');
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg border border-border shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            {initialData ? 'Edit Video Asset' : 'Add Video Asset'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Banner */}
          {errorMessage && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-destructive mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-destructive">Error</h3>
                  <p className="text-sm text-destructive/90 mt-1">{errorMessage}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-destructive/70 hover:text-destructive"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Video URL Input */}
          <div>
            <label htmlFor="videoUrl" className="block text-sm font-medium text-foreground mb-1">
              Video URL *
            </label>
            <input
              type="url"
              id="videoUrl"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
            {isLoadingMetadata && (
              <p className="mt-1 text-sm text-muted-foreground">Loading video metadata...</p>
            )}
            {metadataError && (
              <p className="mt-1 text-sm text-destructive">{metadataError}</p>
            )}
            {videoMetadata && (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>
                  Detected {videoMetadata.provider} video - metadata loaded
                </span>
              </div>
            )}
          </div>

          {/* Video Preview */}
          {embedHtml && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-medium text-foreground mb-2">Preview</h3>
              <div className="aspect-video bg-muted rounded-md overflow-hidden relative">
                <div
                  className="absolute inset-0 [&>iframe]:w-full [&>iframe]:h-full"
                  dangerouslySetInnerHTML={{ __html: embedHtml }}
                />
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-foreground mb-1">
              Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Video title"
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          {/* Video Type */}
          <div>
            <label htmlFor="videoType" className="block text-sm font-medium text-foreground mb-1">
              Video Type
            </label>
            <select
              id="videoType"
              value={videoType}
              onChange={(e) => setVideoType(e.target.value as any)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="short">Short</option>
              <option value="full">Full</option>
              <option value="instructional">Instructional</option>
              <option value="seminar">Seminar</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
              Description
            </label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Describe the video content..."
              className="min-h-[150px]"
            />
          </div>

          {/* Author Information */}
          <div>
            <label htmlFor="authorName" className="block text-sm font-medium text-foreground mb-1">
              Author / Instructor Name
            </label>
            <input
              type="text"
              id="authorName"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="e.g., John Danaher"
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={!videoUrl || !title}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {initialData ? 'Update Asset' : 'Add Asset'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
