'use client';

import { useState, useEffect } from 'react';
import { RichTextEditor } from '../common/RichTextEditor';
import { TechniqueSearchAutocomplete } from './TechniqueSearchAutocomplete';
import { generateSlug } from '@trainhive/shared';
import { apiClient } from '@/lib/backend';

interface Technique {
  id: number;
  name: string;
  slug: string;
}

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

interface SaveVideoFormProps {
  disciplineId: number;
  onSuccess?: () => void;
}

export function SaveVideoForm({ disciplineId, onSuccess }: SaveVideoFormProps) {
  const [videoUrl, setVideoUrl] = useState('');
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorUrl, setAuthorUrl] = useState('');
  const [embedHtml, setEmbedHtml] = useState('');

  // Technique association
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);
  const [newTechniqueName, setNewTechniqueName] = useState<string | null>(null);

  // Video preview
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Error and success messages
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
        // Use API client to fetch oEmbed metadata
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

  const handleCreateNewTechnique = (name: string) => {
    setNewTechniqueName(name);
    setSelectedTechnique(null);
  };

  const handleSelectTechnique = (technique: Technique | null) => {
    setSelectedTechnique(technique);
    setNewTechniqueName(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous messages
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation
    if (!videoUrl) {
      setErrorMessage('Please enter a video URL');
      return;
    }

    if (!title) {
      setErrorMessage('Please enter a title');
      return;
    }

    setIsSaving(true);

    try {
      // Use API client to save video
      await apiClient.videos.create({
        type: 'video',
        url: videoUrl,
        title: title || undefined,
        description: description || undefined,
        originator: authorName || undefined,
        techniqueId: selectedTechnique?.id,
      });

      // Reset form on success
      setVideoUrl('');
      setTitle('');
      setDescription('');
      setAuthorName('');
      setAuthorUrl('');
      setEmbedHtml('');
      setSelectedTechnique(null);
      setNewTechniqueName(null);
      setVideoMetadata(null);

      setSuccessMessage('Video saved successfully!');

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error saving video:', error);
      setErrorMessage(error.message || 'Failed to save video. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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

      {/* Success Banner */}
      {successMessage && (
        <div className="rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-200">Success</h3>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">{successMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
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

      {/* Technique Association */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Associate with Technique (Optional)
        </label>
        <p className="text-sm text-muted-foreground mb-2">
          Search for an existing technique or create a new one
        </p>
        <TechniqueSearchAutocomplete
          disciplineId={disciplineId}
          selectedTechnique={selectedTechnique}
          onSelect={handleSelectTechnique}
          onCreateNew={handleCreateNewTechnique}
        />
        {newTechniqueName && (
          <p className="mt-2 text-sm text-primary">
            Will create new technique: &quot;{newTechniqueName}&quot;
          </p>
        )}
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="authorName" className="block text-sm font-medium text-foreground mb-1">
            Author Name
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

        <div>
          <label htmlFor="authorUrl" className="block text-sm font-medium text-foreground mb-1">
            Author Link
          </label>
          <input
            type="url"
            id="authorUrl"
            value={authorUrl}
            onChange={(e) => setAuthorUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Embed HTML */}
      <div>
        <label htmlFor="embedHtml" className="block text-sm font-medium text-foreground mb-1">
          Embed HTML
        </label>
        <textarea
          id="embedHtml"
          value={embedHtml}
          onChange={(e) => setEmbedHtml(e.target.value)}
          placeholder="<iframe>...</iframe>"
          rows={4}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono text-xs"
        />
        <p className="mt-1 text-sm text-muted-foreground">
          Embed code is automatically filled from video metadata. You can modify it if needed.
        </p>
      </div>

     

      {/* Submit Button */}
      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          disabled={isSaving || !videoUrl || !title}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save Video'}
        </button>
        <button
          type="button"
          onClick={() => {
            setVideoUrl('');
            setTitle('');
            setDescription('');
            setAuthorName('');
            setAuthorUrl('');
            setEmbedHtml('');
            setSelectedTechnique(null);
            setNewTechniqueName(null);
            setVideoMetadata(null);
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Clear
        </button>
      </div>
    </form>
  );
}
