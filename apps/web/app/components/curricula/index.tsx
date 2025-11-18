'use client';

/**
 * Curriculum element scaffolding: containers, items, modals, and shared types.
 * This file provides lightweight, zero-dependency building blocks that can be
 * iteratively enhanced (DnD wiring, data fetching, richer previews).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

/* =========================
 * Types
 * ========================= */

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

/* =========================
 * Utilities
 * ========================= */

export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  delayMs = 300
): (...args: TArgs) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: TArgs) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

/* =========================
 * Icons (placeholders)
 * ========================= */

export function IconDrag(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" {...props} aria-hidden="true">
      <circle cx="4" cy="4" r="1.5" />
      <circle cx="4" cy="8" r="1.5" />
      <circle cx="4" cy="12" r="1.5" />
      <circle cx="12" cy="4" r="1.5" />
      <circle cx="12" cy="8" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  );
}

export function IconTechnique(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" {...props} aria-hidden="true">
      <path d="M2 4h12v2H2zM2 10h12v2H2z" />
    </svg>
  );
}

export function IconVideo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" {...props} aria-hidden="true">
      <path d="M2 3h8v10H2zM11 6l3-2v8l-3-2z" />
    </svg>
  );
}

export function IconText(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" {...props} aria-hidden="true">
      <path d="M2 3h12v2H2zM2 7h8v2H2zM2 11h6v2H2z" />
    </svg>
  );
}

export function IconTrash(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" {...props} aria-hidden="true">
      <path d="M3 4h10v1H3zM5 5h6l-.7 8H5.7L5 5zM6 2h4v1H6z" />
    </svg>
  );
}

export function IconEdit(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" {...props} aria-hidden="true">
      <path d="M2 12.5V10l7.5-7.5 2 2L4 12H2zM11 2l2 2" />
    </svg>
  );
}

/* =========================
 * Buttons / Controls
 * ========================= */

export interface AddElementButtonProps {
  onAdd(kind: ElementKind): void;
}

export function AddElementButton({ onAdd }: AddElementButtonProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
        onClick={() => onAdd('technique')}
      >
        + Technique
      </button>
      <button
        type="button"
        className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
        onClick={() => onAdd('asset')}
      >
        + Asset
      </button>
      <button
        type="button"
        className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
        onClick={() => onAdd('text')}
      >
        + Instruction
      </button>
    </div>
  );
}

/* =========================
 * Item Subcomponents
 * ========================= */

export interface DragHandleProps extends React.HTMLAttributes<HTMLButtonElement> {
  label?: string;
}

export function DragHandle({ label = 'Drag to reorder', ...rest }: DragHandleProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-100"
      {...rest}
    >
      <IconDrag />
    </button>
  );
}

export interface ElementActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ElementActions({ onEdit, onDelete }: ElementActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {onEdit && (
        <button
          type="button"
          aria-label="Edit element"
          onClick={onEdit}
          className="p-1 rounded hover:bg-gray-100"
        >
          <IconEdit />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          aria-label="Delete element"
          onClick={onDelete}
          className="p-1 rounded hover:bg-red-100 text-red-700"
        >
          <IconTrash />
        </button>
      )}
    </div>
  );
}

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

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/* =========================
 * Inline Text Editor
 * ========================= */

export interface InlineTextEditorProps {
  value: string;
  onChange?: (next: string) => void;
}

export function InlineTextEditor({ value, onChange }: InlineTextEditorProps) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const commit = useCallback(() => {
    onChange?.(local);
    setEditing(false);
  }, [local, onChange]);

  if (!editing) {
    return (
      <button
        type="button"
        className="text-left w-full px-2 py-1 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200"
        onClick={() => setEditing(true)}
        aria-label="Edit text"
      >
        {value ? (
          <span className="whitespace-pre-wrap break-words">{value}</span>
        ) : (
          <span className="text-gray-400">Click to add text…</span>
        )}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        className="w-full min-h-[80px] px-2 py-1 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setLocal(value);
            setEditing(false);
          }
        }}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
          onClick={commit}
        >
          Save
        </button>
        <button
          type="button"
          className="px-2 py-1 rounded hover:bg-gray-100"
          onClick={() => {
            setLocal(value);
            setEditing(false);
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* =========================
 * Element Panel and List
 * ========================= */

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

/**
 * NOTE: This is a static list scaffold. Drag-and-drop wiring (e.g. @dnd-kit)
 * will be added later. `onReorder` is reserved for that integration.
 */
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
          <p>• Add an <strong>Instruction</strong> for text notes</p>
          <p>• Add a <strong>Technique</strong> to reference a training technique</p>
          <p>• Add a <strong>Reference Asset</strong> to include a video</p>
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

/* =========================
 * Containers
 * ========================= */

export interface CurriculumElementsSectionProps {
  elements: CurriculumElement[];
  techniqueMap?: TechniqueMap;
  videoMap?: VideoMap;
  onAddElement(kind: ElementKind): void;
  onEditElement?(id: string): void;
  onDeleteElement?(id: string): void;
  onReorderElements?(payload: ElementReorderPayload): void;
  onPickTechnique?(elementId: string): void;
  onPickAsset?(elementId: string): void;
  onTextChange?(elementId: string, text: string): void;
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

/* =========================
 * Modals (scaffolds)
 * ========================= */

export interface TechniqueSelectionModalProps {
  open: boolean;
  onClose(): void;
  onSelect(techniqueId: number): void;
  onSearch?(q: string): void;
  results?: TechniqueSummary[];
  loading?: boolean;
  currentTechnique?: TechniqueSummary | null;
}

export function TechniqueSelectionModal({
  open,
  onClose,
  onSelect,
  onSearch,
  results = [],
  loading = false,
  currentTechnique,
}: TechniqueSelectionModalProps) {
  const [query, setQuery] = useState('');
  const debouncedSearch = useMemo(
    () => (onSearch ? debounce(onSearch, 300) : undefined),
    [onSearch]
  );

  useEffect(() => {
    if (debouncedSearch) debouncedSearch(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded shadow-lg w-full max-w-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Select Technique</div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100"
          >
            ×
          </button>
        </div>

        {currentTechnique && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
            <div className="text-xs text-blue-600 mb-1">Currently Selected:</div>
            <div className="font-medium text-blue-900">{currentTechnique.name}</div>
            {currentTechnique.description && (
              <div className="text-xs text-blue-700 mt-1 line-clamp-2">
                {currentTechnique.description}
              </div>
            )}
          </div>
        )}

        <input
          type="search"
          placeholder="Search techniques…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-2 py-1 rounded border border-gray-300 mb-3"
        />

        <div className="max-h-80 overflow-auto rounded border border-gray-200">
          {loading ? (
            <div className="p-3 text-sm text-gray-500">Loading…</div>
          ) : results.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">No results</div>
          ) : (
            <ul>
              {results.map((t) => {
                const isSelected = currentTechnique?.id === t.id;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${
                        isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                      onClick={() => onSelect(t.id)}
                    >
                      <div className={`font-medium ${isSelected ? 'text-blue-900' : ''}`}>
                        {t.name}
                        {isSelected && (
                          <span className="ml-2 text-xs text-blue-600">(Selected)</span>
                        )}
                      </div>
                      {t.description ? (
                        <div className={`text-xs line-clamp-2 ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                          {t.description}
                        </div>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-3 text-right">
          <button type="button" className="px-2 py-1 rounded hover:bg-gray-100" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export interface AssetSelectionModalProps {
  open: boolean;
  onClose(): void;
  onSelect(assetId: number): void;
  onSearch?(q: string): void;
  results?: VideoSummary[];
  loading?: boolean;
  currentAsset?: VideoSummary | null;
}

export function AssetSelectionModal({
  open,
  onClose,
  onSelect,
  onSearch,
  results = [],
  loading = false,
  currentAsset,
}: AssetSelectionModalProps) {
  const [query, setQuery] = useState('');
  const debouncedSearch = useMemo(
    () => (onSearch ? debounce(onSearch, 300) : undefined),
    [onSearch]
  );

  useEffect(() => {
    if (debouncedSearch) debouncedSearch(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded shadow-lg w-full max-w-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Select Asset</div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100"
          >
            ×
          </button>
        </div>

        {currentAsset && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
            <div className="text-xs text-blue-600 mb-1">Currently Selected:</div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-8 bg-gray-200 rounded overflow-hidden flex items-center justify-center">
                {currentAsset.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentAsset.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <IconVideo />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-blue-900 truncate">{currentAsset.title}</div>
                {typeof currentAsset.durationSeconds === 'number' && (
                  <div className="text-xs text-blue-700">
                    {formatDuration(currentAsset.durationSeconds)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <input
          type="search"
          placeholder="Search assets…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-2 py-1 rounded border border-gray-300 mb-3"
        />

        <div className="max-h-80 overflow-auto rounded border border-gray-200">
          {loading ? (
            <div className="p-3 text-sm text-gray-500">Loading…</div>
          ) : results.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">No results</div>
          ) : (
            <ul>
              {results.map((v) => {
                const isSelected = currentAsset?.id === v.id;
                return (
                  <li key={v.id}>
                    <button
                      type="button"
                      className={`w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-3 ${
                        isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                      onClick={() => onSelect(v.id)}
                    >
                      <div className="w-12 h-8 bg-gray-200 rounded overflow-hidden flex items-center justify-center">
                        {v.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <IconVideo />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className={`font-medium truncate ${isSelected ? 'text-blue-900' : ''}`}>
                          {v.title}
                          {isSelected && (
                            <span className="ml-2 text-xs text-blue-600">(Selected)</span>
                          )}
                        </div>
                        {typeof v.durationSeconds === 'number' ? (
                          <div className={`text-xs ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                            {formatDuration(v.durationSeconds)}
                          </div>
                        ) : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-3 text-right">
          <button type="button" className="px-2 py-1 rounded hover:bg-gray-100" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export interface TextElementModalProps {
  open: boolean;
  initialValue?: string;
  onClose(): void;
  onSave(next: string): void;
}

export function TextElementModal({
  open,
  initialValue = '',
  onClose,
  onSave,
}: TextElementModalProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue, open]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded shadow-lg w-full max-w-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Text Element</div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100"
          >
            ×
          </button>
        </div>

        <textarea
          className="w-full min-h-[120px] px-2 py-1 rounded border border-gray-300"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter text…"
        />

        <div className="mt-3 flex items-center justify-end gap-2">
          <button type="button" className="px-2 py-1 rounded hover:bg-gray-100" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => onSave(value)}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
