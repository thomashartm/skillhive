## 1. Database Schema Updates
- [ ] 1.1 Add `instructors` JSON column to Asset table
- [ ] 1.2 Add `bjjStyle` enum column to Asset table ('Gi', 'No-Gi', 'Both')
- [ ] 1.3 Add `qualityRating` TINYINT column to Asset table (1-5, nullable)
- [ ] 1.4 Add `comments` TEXT column to Asset table (nullable)
- [ ] 1.5 Create TypeORM migration for Asset table updates
- [ ] 1.6 Update Asset entity class with new fields
- [ ] 1.7 Add validation for new fields (rating 1-5, enum values)

## 2. API Endpoints - Asset Creation and Update
- [ ] 2.1 Extend `POST /api/v1/assets:ingest` to accept additional metadata
- [ ] 2.2 Create `POST /api/v1/assets` endpoint for manual asset creation
- [ ] 2.3 Create `PATCH /api/v1/assets/:id` endpoint for updating metadata
- [ ] 2.4 Add zod schemas for asset DTOs including new fields
- [ ] 2.5 Update YouTube ingestion to populate available metadata
- [ ] 2.6 Add validation for instructors array, BJJ style enum, quality rating range

## 3. API Endpoints - Technique-Video Association
- [ ] 3.1 Create `POST /api/v1/techniques/:id/videos` endpoint for associating videos
- [ ] 3.2 Create `GET /api/v1/techniques/:id/videos` endpoint for listing associated videos
- [ ] 3.3 Create `PATCH /api/v1/attachments/:id` endpoint for updating attachment role/timestamps
- [ ] 3.4 Create `DELETE /api/v1/attachments/:id` endpoint for removing associations
- [ ] 3.5 Support bulk video association (multiple URLs at once)
- [ ] 3.6 Add attachment role assignment (Primary/Reference/Alternative)

## 4. UI Components - Video URL Input
- [ ] 4.1 Create `VideoUrlInput` component for entering video URLs
- [ ] 4.2 Add URL validation (YouTube, Vimeo formats)
- [ ] 4.3 Support multiple URL input (add/remove URLs)
- [ ] 4.4 Show URL preview/validation feedback
- [ ] 4.5 Integrate with YouTube ingestion for automatic metadata fetch

## 5. UI Components - Video Metadata Form
- [ ] 5.1 Create `VideoMetadataForm` component for enriching video data
- [ ] 5.2 Add description textarea field
- [ ] 5.3 Add tags input (multiselect or comma-separated)
- [ ] 5.4 Add instructors input (array of names)
- [ ] 5.5 Add BJJ style dropdown (Gi/No-Gi/Both)
- [ ] 5.6 Add quality rating component (1-5 stars)
- [ ] 5.7 Add comments textarea field
- [ ] 5.8 Add form validation and error handling

## 6. UI Components - Video Association Management
- [ ] 6.1 Create `TechniqueVideoList` component for displaying associated videos
- [ ] 6.2 Show video thumbnails, titles, and metadata
- [ ] 6.3 Display attachment role badges (Primary/Reference/Alternative)
- [ ] 6.4 Add "Add Video" button/action
- [ ] 6.5 Add edit/delete actions for each video
- [ ] 6.6 Show video count and primary video indicator

## 7. UI Components - Video Association Workflow
- [ ] 7.1 Create page/route for associating videos with technique (`/techniques/:id/videos`)
- [ ] 7.2 Implement workflow: Enter URLs → Auto-fetch metadata → Enrich metadata → Associate
- [ ] 7.3 Add bulk association support (multiple URLs at once)
- [ ] 7.4 Add role assignment during association
- [ ] 7.5 Show loading states during YouTube ingestion

## 8. Integration
- [ ] 8.1 Integrate video association UI into technique detail/edit pages
- [ ] 8.2 Add navigation to video management from technique pages
- [ ] 8.3 Update technique detail view to show associated videos
- [ ] 8.4 Test full workflow: Add URLs → Enrich → Associate → View

## 9. Testing
- [ ] 9.1 Write unit tests for Asset entity with new fields
- [ ] 9.2 Write unit tests for asset DTO validation
- [ ] 9.3 Write integration tests for video association endpoints
- [ ] 9.4 Write integration tests for metadata update endpoints
- [ ] 9.5 Write E2E tests for video association workflow
- [ ] 9.6 Test YouTube URL ingestion with new metadata fields

## 10. Documentation
- [ ] 10.1 Document new Asset fields in entity comments
- [ ] 10.2 Document API endpoints for video association
- [ ] 10.3 Update API documentation with new endpoints
- [ ] 10.4 Document video metadata enrichment workflow

