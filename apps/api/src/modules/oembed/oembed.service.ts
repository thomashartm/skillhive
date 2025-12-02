import { Injectable, BadRequestException, HttpException } from '@nestjs/common';
import { VideoProvider } from './dto/oembed-query.dto';

interface RawOEmbedResponse {
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

export interface OEmbedResponse {
  provider: string;
  title: string;
  author: string;
  authorUrl: string;
  thumbnailUrl: string;
  embedHtml: string;
  width?: number;
  height?: number;
  rawData: RawOEmbedResponse;
}

@Injectable()
export class OEmbedService {
  /**
   * Detect video provider from URL
   */
  detectProvider(url: string): VideoProvider | null {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
        return VideoProvider.YOUTUBE;
      }
      if (hostname.includes('facebook.com') || hostname.includes('fb.com')) {
        return VideoProvider.FACEBOOK;
      }
      if (hostname.includes('instagram.com')) {
        return VideoProvider.INSTAGRAM;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get oEmbed endpoint for provider
   */
  getOEmbedEndpoint(provider: VideoProvider, videoUrl: string): string | null {
    switch (provider) {
      case VideoProvider.YOUTUBE:
        return `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
      case VideoProvider.FACEBOOK:
        return `https://www.facebook.com/plugins/video/oembed.json/?url=${encodeURIComponent(videoUrl)}`;
      case VideoProvider.INSTAGRAM:
        return `https://api.instagram.com/oembed?url=${encodeURIComponent(videoUrl)}`;
      default:
        return null;
    }
  }

  /**
   * Fetch video metadata from oEmbed providers
   */
  async fetchMetadata(
    url: string,
    providerHint?: VideoProvider,
  ): Promise<OEmbedResponse> {
    // Detect provider from URL if not specified
    const provider = providerHint || this.detectProvider(url);

    if (!provider) {
      throw new BadRequestException('Unable to detect video provider from URL');
    }

    // Get oEmbed endpoint
    const oembedEndpoint = this.getOEmbedEndpoint(provider, url);

    if (!oembedEndpoint) {
      throw new BadRequestException(`oEmbed not supported for provider: ${provider}`);
    }

    try {
      // Fetch oEmbed data
      const response = await fetch(oembedEndpoint, {
        headers: {
          'User-Agent': 'SkillHive/1.0',
        },
      });

      if (!response.ok) {
        console.error(`oEmbed fetch failed: ${response.status} ${response.statusText}`);
        throw new HttpException(
          'Failed to fetch video metadata from provider',
          response.status,
        );
      }

      const oembedData: RawOEmbedResponse = await response.json();

      // Return standardized response
      return {
        provider,
        title: oembedData.title || '',
        author: oembedData.author_name || '',
        authorUrl: oembedData.author_url || '',
        thumbnailUrl: oembedData.thumbnail_url || '',
        embedHtml: oembedData.html || '',
        width: oembedData.width,
        height: oembedData.height,
        rawData: oembedData,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error fetching oEmbed data:', error);
      throw new HttpException(
        `Failed to fetch video metadata: ${error.message}`,
        500,
      );
    }
  }
}
