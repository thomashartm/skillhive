# Technique flow diagrams

The user selected a draggable canvas and authorized implementation. Each technique can have multiple named diagrams describing how to apply it. Steps have a name, a short label, a Markdown description with a formatting editor and preview, and an optional linked video/image asset. Start, action, decision, and finish distinguish step types. Directed transitions have editable human-readable conditions; branches can rejoin and loop back, including to the same step. Conditions are instructions for the practitioner, not executable expressions.

## Approach

The alternatives discussed were a draggable canvas and a form-driven automatic layout. The user chose the canvas. Reuse Vue/PrimeVue, the existing asset library, and sanitized Markdown rendering. Add Vue Flow for dragging, connections, pan/zoom, and keyboard navigation; do not build a canvas interaction engine.

Diagrams appear on the technique detail page. Selecting a step or transition opens its fields beside the canvas. Accessible selectors and transition forms also allow editing without dragging. Explicit Save persists all diagrams; unsaved edits survive failed saves and navigation requires discard confirmation. Viewers can inspect steps and media but cannot edit. Authorization uses the technique's actual discipline.

## Persistence and safety

Store a revisioned `flows` object on the technique document, accessed through GET/PUT `/api/v1/techniques/{id}/flows`. This keeps existing technique responses unchanged, includes diagrams in existing raw document backups, and deletes diagrams with the technique. PUT updates only flows and updatedAt in a Firestore transaction. Missing techniques return 404; stale revisions return 409. Reject duplicate IDs, missing endpoints, invalid types, non-finite positions, oversized content, and new media links outside the discipline or to unavailable/non-media assets. Cycles are valid. Existing missing media links remain editable and are shown as unavailable.

Limits: 20 diagrams per technique, 200 steps and 400 transitions per diagram, 100-character names, 100-character step labels, 10,000-character Markdown descriptions, 300-character conditions, and 600,000 encoded bytes total. Incomplete diagrams may be saved while designing. Disable indexing on flows. Client Firestore rules must not allow bypassing flow validation. Automated technique merge tools must not silently discard diagrams.

## Scope and verification

No workflow execution, uploads, collaboration UI, auto-layout, or changes to the pending Cloud SQL migration. Tests cover graph validation, permissions, persistence, conflicts, media links, Markdown editing, and frontend save/read-only behavior. Verify the production build and exercise the canvas in a browser when available.
