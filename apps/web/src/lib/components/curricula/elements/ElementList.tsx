/**
 * Sortable list of curriculum elements with drag-and-drop
 */

import React, { useCallback, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ElementPanel } from './ElementPanel';
import { IconDrag } from '../icons';
import type { CurriculumElement, TechniqueMap, VideoMap, ElementReorderPayload } from '../types';

export interface ElementListProps {
  elements: CurriculumElement[];
  techniqueMap?: TechniqueMap;
  videoMap?: VideoMap;
  onReorder?: (payload: ElementReorderPayload) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onStartTechniquePick?: (id: string) => void;
  onStartAssetPick?: (id: string) => void;
  onTextChange?: (id: string, text: string) => void;
}

export function ElementList({
  elements,
  techniqueMap,
  videoMap,
  onReorder,
  onEdit,
  onDelete,
  onStartTechniquePick,
  onStartAssetPick,
  onTextChange,
}: ElementListProps) {
  // Sort elements by ord to get initial order
  const ordered = useMemo(() => elements.slice().sort((a, b) => a.ord - b.ord), [elements]);
  const ids = useMemo(() => ordered.map((e) => e.id), [ordered]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;

      const nextIds = arrayMove(ids, oldIndex, newIndex);
      onReorder?.({ orderedIds: nextIds });
    },
    [ids, onReorder]
  );

  function SortableItem({ id, index }: { id: string; index: number }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id,
    });

    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.6 : undefined,
    };

    const el = ordered[index];

    return (
      <div ref={setNodeRef} style={style}>
        <ElementPanel
          element={el}
          techniqueMap={techniqueMap}
          videoMap={videoMap}
          onEdit={onEdit}
          onDelete={onDelete}
          onStartTechniquePick={onStartTechniquePick}
          onStartAssetPick={onStartAssetPick}
          onTextChange={onTextChange}
          renderDragHandle={() => (
            <button
              type="button"
              aria-label={`Drag ${el.kind} element to reorder`}
              className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-100"
              {...attributes}
              {...listeners}
            >
              <IconDrag />
            </button>
          )}
        />
      </div>
    );
  }

  // Show empty state if no elements
  if (ids.length === 0) {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
        <div className="text-gray-400 mb-2">
          <svg
            className="mx-auto h-12 w-12 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No elements yet</h3>
        <p className="text-sm text-gray-500 mb-4">
          Get started by adding your first element using the buttons above.
        </p>
        <div className="text-xs text-gray-400">
          <p>
            • Add an <strong>Instruction</strong> for text notes
          </p>
          <p>
            • Add a <strong>Technique</strong> to reference a training technique
          </p>
          <p>
            • Add a <strong>Reference Asset</strong> to include a video
          </p>
        </div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {ids.map((id, index) => (
            <SortableItem key={id} id={id} index={index} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
