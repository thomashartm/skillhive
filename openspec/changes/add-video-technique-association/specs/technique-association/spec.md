## ADDED Requirements

### Requirement: Multiple Video Association
The system SHALL allow associating one or multiple video URLs with a single technique.

#### Scenario: Associate single video with technique
- **WHEN** a user associates a video URL with a technique
- **THEN** an Attachment record is created linking the Asset to the Technique
- **AND** the video appears in the technique's associated videos list
- **AND** the attachment can be assigned a role (Primary/Reference/Alternative)

#### Scenario: Associate multiple videos with technique
- **WHEN** a user associates multiple video URLs with a technique
- **THEN** multiple Attachment records are created (one per video)
- **AND** all videos appear in the technique's associated videos list
- **AND** each attachment can have a different role
- **AND** at least one video can be marked as Primary

#### Scenario: Bulk video association
- **WHEN** a user provides multiple video URLs at once
- **THEN** the system creates Assets for each URL
- **AND** creates Attachments linking all videos to the technique
- **AND** shows progress/status for each video ingestion

### Requirement: Video Association Management
The system SHALL provide UI and API for managing video associations with techniques.

#### Scenario: List videos for technique
- **WHEN** a user views a technique
- **THEN** all associated videos are displayed
- **AND** videos show thumbnails, titles, and metadata
- **AND** Primary video is prominently displayed
- **AND** videos are grouped or sorted by role

#### Scenario: Update attachment role
- **WHEN** a user changes a video's role (e.g., from Reference to Primary)
- **THEN** the Attachment record is updated
- **AND** if setting as Primary, previous Primary is updated to Reference
- **AND** the UI reflects the updated role

#### Scenario: Remove video association
- **WHEN** a user removes a video from a technique
- **THEN** the Attachment record is deleted
- **AND** the video no longer appears in the technique's video list
- **AND** the Asset itself is preserved (can be associated with other techniques)

### Requirement: Video Enrichment Workflow
The system SHALL provide a workflow for enriching video metadata when associating with techniques.

#### Scenario: Enrich video during association
- **WHEN** a user adds a video URL to a technique
- **THEN** they are presented with a form to enrich metadata
- **AND** the form includes fields for: description, tags, instructors, BJJ style, quality rating, comments
- **AND** auto-fetched metadata (from YouTube) is pre-populated where available
- **AND** user can modify or add to the metadata before saving

#### Scenario: Enrich existing video
- **WHEN** a user edits an associated video
- **THEN** they can update the video's metadata
- **AND** changes are saved to the Asset record
- **AND** updated metadata is reflected in all techniques using that video

### Requirement: Video Association API Endpoints
The system SHALL provide REST API endpoints for managing technique-video associations.

#### Scenario: Associate video with technique
- **WHEN** a client sends `POST /api/v1/techniques/:id/videos` with video URL and metadata
- **THEN** an Asset is created (or found if exists)
- **AND** an Attachment is created linking the Asset to the Technique
- **AND** the response includes the attachment with role and timestamps

#### Scenario: List videos for technique
- **WHEN** a client sends `GET /api/v1/techniques/:id/videos`
- **THEN** the system returns all associated videos
- **AND** each video includes full Asset metadata
- **AND** attachments include role and timestamp information

#### Scenario: Update attachment
- **WHEN** a client sends `PATCH /api/v1/attachments/:id` with updated role or timestamps
- **THEN** the attachment is updated
- **AND** the response includes the updated attachment

#### Scenario: Remove video association
- **WHEN** a client sends `DELETE /api/v1/attachments/:id`
- **THEN** the attachment is deleted
- **AND** the Asset remains (not deleted)
- **AND** the video is removed from the technique's video list

