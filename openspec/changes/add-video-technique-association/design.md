## Context

The current data model has:
- `Asset` entity for external media (YouTube, Vimeo, etc.) with basic fields: url, title, description, tags JSON, attribution JSON
- `Attachment` entity linking Techniques/Units to Assets with role (Primary/Reference/Alternative) and timestamps
- `POST /assets:ingest` endpoint for YouTube URL ingestion with async metadata fetch

Users need to:
- Associate multiple videos with a single technique
- Add rich metadata: instructors, BJJ style, quality rating, comments
- Manage and edit video associations and metadata

## Goals / Non-Goals

### Goals
- Support multiple video URLs per technique
- Enrich videos with: description, tags, instructors, BJJ style, quality rating, comments
- Associate videos with techniques using existing Attachment model
- UI for managing video associations and metadata
- Integration with YouTube ingestion for automatic metadata

### Non-Goals
- Video hosting (external links only)
- Video editing or trimming (handled by startTs/endTs in Attachment)
- Video transcoding or processing
- Multiple quality ratings per video (single rating per asset)

## Decisions

### Decision: Extend Asset entity with new metadata fields
**Rationale**: 
- Keeps all video metadata in one place
- Maintains existing Asset-Attachment-Technique relationship
- No need for separate VideoMetadata entity
- Can query and filter by new fields

**New fields to add**:
```
Asset {
  ...existing fields...
  instructors: JSON (array of instructor names/IDs)
  bjjStyle: enum('Gi', 'No-Gi', 'Both') or string
  qualityRating: TINYINT (1-5 scale)
  comments: TEXT (user comments/notes about the video)
}
```

**Alternatives considered**:
- **Separate VideoMetadata entity**: Adds complexity, requires joins, harder to query
- **Store in Attachment**: Metadata is about the video itself, not the association

### Decision: Use existing Attachment model for technique-video association
**Rationale**:
- Already supports multiple attachments per technique
- Has role field (Primary/Reference/Alternative) for distinguishing video importance
- Has startTs/endTs for timestamp trimming
- No schema changes needed

### Decision: Instructors as JSON array
**Rationale**:
- Flexible for multiple instructors per video
- Can store names or references to User entities
- Easy to query and filter
- Can migrate to separate Instructor entity later if needed

**Format**: `["John Danaher", "Gordon Ryan"]` or `[{"name": "John Danaher", "userId": "uuid"}]`

### Decision: BJJ Style as enum or string
**Rationale**:
- Enum provides consistency: 'Gi', 'No-Gi', 'Both'
- String allows future flexibility for other styles
- **Decision**: Start with enum, can extend to string if needed

### Decision: Quality Rating as 1-5 scale
**Rationale**:
- Standard rating scale
- TINYINT (1 byte) is efficient
- Can display as stars in UI
- Optional field (NULL if not rated)

### Decision: Comments as TEXT field
**Rationale**:
- User notes about the video
- Can be long-form text
- Separate from description (which is about the video content)
- Optional field

### Decision: Multiple video URLs via multiple Attachments
**Rationale**:
- Each video URL creates one Asset
- Each Asset-Technique association creates one Attachment
- User can add multiple videos by creating multiple Attachments
- Role field distinguishes Primary vs Reference videos

## Risks / Trade-offs

### Risk: Asset entity becoming too large
**Mitigation**: New fields are optional, existing assets unaffected. Can normalize later if needed.

### Risk: Instructors as JSON not easily queryable
**Mitigation**: Can use JSON functions in MySQL, or migrate to separate Instructor entity later

### Risk: Quality rating subjectivity
**Mitigation**: Rating is user-specific, can add user_id later if needed for personal ratings

### Risk: Multiple videos per technique UI complexity
**Mitigation**: Use list/card view, allow filtering by role, show primary video prominently

## Migration Plan

1. Add new columns to Asset table (instructors, bjjStyle, qualityRating, comments)
2. Make all new fields nullable for backward compatibility
3. Update Asset entity in TypeORM
4. Create API endpoints for video association and metadata updates
5. Build UI components for video management
6. Migrate existing data (set defaults where appropriate)

## Open Questions

- Should instructors reference User entities or be free-form text?
  - **Decision**: Start with free-form text array, can add User references later
- Should quality rating be per-user or global?
  - **Decision**: Global per asset for now, can add user-specific ratings later
- Should comments support markdown or rich text?
  - **Decision**: Plain text initially, can add markdown support later

