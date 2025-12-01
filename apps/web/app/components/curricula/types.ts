/**
 * Type definitions for curricula feature
 */

export type ElementKind = 'text' | 'technique' | 'asset';

export interface CurriculumElement {
  id: string;
  ord: number;
  kind: ElementKind;
  techniqueId?: number | null;
  assetId?: number | null;
  text?: string | null;
}

export interface TechniqueSummary {
  id: number;
  name: string;
  categoryIds?: number[];
  description?: string | null;
}

export interface VideoSummary {
  id: number;
  title: string;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  techniqueId?: number | null;
  originator?: string | null;
}

export type TechniqueMap = Record<number, TechniqueSummary>;
export type VideoMap = Record<number, VideoSummary>;

export interface ElementReorderPayload {
  orderedIds: string[];
}

export interface Curriculum {
  id: number;
  title: string;
  description: string | null;
  isPublic: boolean;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}
