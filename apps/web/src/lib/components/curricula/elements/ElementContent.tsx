/**
 * Component for rendering element content based on type
 */

import React from 'react';
import { IconText, IconTechnique, IconVideo } from '../icons';
import { InlineTextEditor } from './InlineTextEditor';
import { formatDuration } from '../utils';
import type { CurriculumElement, TechniqueMap, VideoMap } from '../types';

export interface ElementContentProps {
  element: CurriculumElement;
  techniqueMap?: TechniqueMap;
  videoMap?: VideoMap;
  onStartTechniquePick?: () => void;
  onStartAssetPick?: () => void;
  onTextChange?: (next: string) => void;
}

export function ElementContent({
  element,
  techniqueMap,
  videoMap,
  onStartTechniquePick,
  onStartAssetPick,
  onTextChange,
}: ElementContentProps) {
  if (element.kind === 'text') {
    const value = element.text ?? '';
    return (
      <div className="flex-1">
        <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
          <IconText /> Instruction
        </div>
        <InlineTextEditor value={value} onChange={onTextChange} />
      </div>
    );
  }

  if (element.kind === 'technique') {
    const tech = element.techniqueId ? techniqueMap?.[element.techniqueId] : undefined;
    return (
      <div className="flex-1">
        <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
          <IconTechnique /> Technique
        </div>
        {tech ? (
          <div>
            <div className="font-medium">{tech.name}</div>
            {tech.description ? (
              <div className="text-sm text-gray-600 line-clamp-2">{tech.description}</div>
            ) : null}
          </div>
        ) : (
          <div className="text-sm text-gray-400 italic">No technique selected</div>
        )}
      </div>
    );
  }

  // asset
  const vid = element.assetId ? videoMap?.[element.assetId] : undefined;
  return (
    <div className="flex-1">
      <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
        <IconVideo /> Asset
      </div>
      {vid ? (
        <div className="flex items-center gap-3">
          <div className="w-16 h-10 bg-gray-200 rounded overflow-hidden flex items-center justify-center">
            {vid.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={vid.thumbnailUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <IconVideo />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate">{vid.title}</div>
            {typeof vid.durationSeconds === 'number' ? (
              <div className="text-xs text-gray-600">{formatDuration(vid.durationSeconds)}</div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-400 italic">No asset selected</div>
      )}
    </div>
  );
}
