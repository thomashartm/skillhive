/**
 * oEmbed API Client
 */

import { httpClient } from '../http/client';
import type { OEmbedResponse } from '../../types/api';

export const oembed = {
  /**
   * Fetch video metadata from oEmbed providers
   * Supports YouTube, Facebook, Instagram
   */
  async fetch(url: string): Promise<OEmbedResponse> {
    const params = new URLSearchParams({ url });
    const response = await httpClient.get<OEmbedResponse>(
      `/oembed?${params.toString()}`,
      { skipAuth: true }
    );
    return response.data;
  },
};
