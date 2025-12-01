/**
 * Main container for curriculum elements section
 */

import React from 'react';
import { AddElementButton } from '../buttons/AddElementButton';
import { ElementList } from './ElementList';
import type {
  CurriculumElement,
  TechniqueMap,
  VideoMap,
  ElementKind,
  ElementReorderPayload,
} from '../types';

export interface CurriculumElementsSectionProps {
  elements: CurriculumElement[];
  techniqueMap?: TechniqueMap;
  videoMap?: VideoMap;
  onAddElement(kind: ElementKind): void;
  onEditElement?: (id: string) => void;
  onDeleteElement?: (id: string) => void;
  onReorderElements?: (payload: ElementReorderPayload) => void;
  onPickTechnique?: (elementId: string) => void;
  onPickAsset?: (elementId: string) => void;
  onTextChange?: (elementId: string, text: string) => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export function CurriculumElementsSection({
  elements,
  techniqueMap,
  videoMap,
  onAddElement,
  onEditElement,
  onDeleteElement,
  onReorderElements,
  onPickTechnique,
  onPickAsset,
  onTextChange,
  header,
  footer,
}: CurriculumElementsSectionProps) {
  return (
    <section aria-label="Curriculum elements" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Elements</div>
        <AddElementButton onAdd={onAddElement} />
      </div>

      {header ?? null}

      <ElementList
        elements={elements}
        techniqueMap={techniqueMap}
        videoMap={videoMap}
        onReorder={onReorderElements}
        onEdit={onEditElement}
        onDelete={onDeleteElement}
        onStartTechniquePick={onPickTechnique}
        onStartAssetPick={onPickAsset}
        onTextChange={onTextChange}
      />

      {footer ?? null}
    </section>
  );
}
