## ADDED Requirements

### Requirement: Extended Video Metadata
The system SHALL support enriching video assets with additional metadata fields: instructors, BJJ style, quality rating, and comments.

#### Scenario: Create asset with metadata
- **WHEN** a user creates a video asset
- **THEN** they can provide instructors (array), BJJ style (Gi/No-Gi/Both), quality rating (1-5), and comments
- **AND** all fields are optional
- **AND** the metadata is stored with the asset

#### Scenario: Update asset metadata
- **WHEN** a user updates an existing video asset
- **THEN** they can modify instructors, BJJ style, quality rating, and comments
- **AND** existing metadata is preserved if not updated
- **AND** the updated metadata is saved to the database

### Requirement: Video URL Ingestion
The system SHALL support saving video URLs and automatically fetching metadata from YouTube when applicable.

#### Scenario: Ingest YouTube video URL
- **WHEN** a user provides a YouTube video URL
- **THEN** the system creates an Asset record
- **AND** automatically fetches metadata (title, description, thumbnails, duration) via YouTube API
- **AND** allows user to enrich with additional metadata (instructors, BJJ style, rating, comments)

#### Scenario: Ingest non-YouTube video URL
- **WHEN** a user provides a video URL from another provider (Vimeo, etc.)
- **THEN** the system creates an Asset record
- **AND** attempts to fetch available metadata
- **AND** allows user to manually enter all metadata fields

### Requirement: Asset API Endpoints
The system SHALL provide REST API endpoints for creating and updating video assets with metadata.

#### Scenario: Create asset
- **WHEN** a client sends `POST /api/v1/assets` with video URL and metadata
- **THEN** a new Asset is created
- **AND** if YouTube URL, metadata is automatically fetched
- **AND** the response includes the created asset with all metadata

#### Scenario: Update asset metadata
- **WHEN** a client sends `PATCH /api/v1/assets/:id` with updated metadata
- **THEN** the asset metadata is updated
- **AND** only provided fields are updated (partial update)
- **AND** the response includes the updated asset

#### Scenario: Get asset with metadata
- **WHEN** a client sends `GET /api/v1/assets/:id`
- **THEN** the response includes all asset metadata including instructors, BJJ style, quality rating, and comments

