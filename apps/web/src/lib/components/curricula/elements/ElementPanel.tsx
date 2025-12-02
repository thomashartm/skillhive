/**
 * Individual element panel component
 */

import React from 'react';
import { DragHandle } from '../buttons/DragHandle';
import { ElementActions } from '../buttons/ElementActions';
import { ElementContent } from './ElementContent';
import type { CurriculumElement, TechniqueMap, VideoMap } from '../types';

export interface ElementPanelProps {
  element: CurriculumElement;
  techniqueMap?: TechniqueMap;
  videoMap?: VideoMap;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onStartTechniquePick?: (id: string) => void;
  onStartAssetPick?: (id: string) => void;
  onTextChange?: (id: string, text: string) => void;
  renderDragHandle?: (node: React.ReactNode) => React.ReactNode;
}

export function ElementPanel({
  element,
  techniqueMap,
  videoMap,
  onEdit,
  onDelete,
  onStartTechniquePick,
  onStartAssetPick,
  onTextChange,
  renderDragHandle,
}: ElementPanelProps) {
  const drag = (
    <DragHandle
      aria-label={`Drag ${element.kind} element to reorder`}
      data-element-id={element.id}
    />
  );

  return (
    <div
      className="w-full flex items-start gap-3 p-3 rounded border border-gray-200 bg-white hover:shadow-sm transition-shadow"
      role="group"
      aria-label={`Curriculum element ${element.id}`}
    >
      <div className="pt-0.5">{renderDragHandle ? renderDragHandle(drag) : drag}</div>
      <ElementContent
        element={element}
        techniqueMap={techniqueMap}
        videoMap={videoMap}
        onStartTechniquePick={
          onStartTechniquePick ? () => onStartTechniquePick(element.id) : undefined
        }
        onStartAssetPick={onStartAssetPick ? () => onStartAssetPick(element.id) : undefined}
        onTextChange={onTextChange ? (t) => onTextChange(element.id, t) : undefined}
      />
      <ElementActions
        onEdit={onEdit ? () => onEdit(element.id) : undefined}
        onDelete={onDelete ? () => onDelete(element.id) : undefined}
      />
    </div>
  );
}
