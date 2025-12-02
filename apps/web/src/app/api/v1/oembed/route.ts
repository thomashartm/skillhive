import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const oembedRequestSchema = z.object({
  url: z.string().url(),
  provider: z.enum(['youtube', 'facebook', 'instagram']).optional(),
});

interface OEmbedResponse {
  type: string;
  version: string;
  title?: string;
  author_name?: string;
  author_url?: string;
  provider_name?: string;
  provider_url?: string;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
  html?: string;
  width?: number;
  height?: number;
}

// Detect video provider from URL
function detectProvider(url: string): 'youtube' | 'facebook' | 'instagram' | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return 'youtube';
    }
    if (hostname.includes('facebook.com') || hostname.includes('fb.com')) {
      return 'facebook';
    }
    if (hostname.includes('instagram.com')) {
      return 'instagram';
    }

    return null;
  } catch {
    return null;
  }
}

// Get oEmbed endpoint for provider
function getOEmbedEndpoint(provider: string, videoUrl: string): string | null {
  switch (provider) {
    case 'youtube':
      return `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
    case 'facebook':
      // Facebook requires an app access token for oEmbed
      return `https://www.facebook.com/plugins/video/oembed.json/?url=${encodeURIComponent(videoUrl)}`;
    case 'instagram':
      // Instagram oEmbed (may require app registration)
      return `https://api.instagram.com/oembed?url=${encodeURIComponent(videoUrl)}`;
    default:
      return null;
  }
}

// GET /api/v1/oembed?url=<video_url>
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const providerParam = searchParams.get('provider');

    const validationResult = oembedRequestSchema.safeParse({
      url,
      provider: providerParam || undefined,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request parameters',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { url: videoUrl, provider: requestedProvider } = validationResult.data;

    // Detect provider from URL if not specified
    const provider = requestedProvider || detectProvider(videoUrl);

    if (!provider) {
      return NextResponse.json(
        { error: 'Unable to detect video provider from URL' },
        { status: 400 }
      );
    }

    // Get oEmbed endpoint
    const oembedEndpoint = getOEmbedEndpoint(provider, videoUrl);

    if (!oembedEndpoint) {
      return NextResponse.json(
        { error: `oEmbed not supported for provider: ${provider}` },
        { status: 400 }
      );
    }

    // Fetch oEmbed data
    const response = await fetch(oembedEndpoint, {
      headers: {
        'User-Agent': 'SkillHive/1.0',
      },
    });

    if (!response.ok) {
      console.error(`oEmbed fetch failed: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: 'Failed to fetch video metadata from provider' },
        { status: response.status }
      );
    }

    const oembedData: OEmbedResponse = await response.json();

    // Return standardized response
    return NextResponse.json({
      provider,
      title: oembedData.title || '',
      author: oembedData.author_name || '',
      authorUrl: oembedData.author_url || '',
      thumbnailUrl: oembedData.thumbnail_url || '',
      embedHtml: oembedData.html || '',
      width: oembedData.width,
      height: oembedData.height,
      rawData: oembedData,
    });
  } catch (error: any) {
    console.error('Error fetching oEmbed data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video metadata', message: error.message },
      { status: 500 }
    );
  }
}
