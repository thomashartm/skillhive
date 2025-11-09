## Why

Users need to associate multiple video URLs with techniques and enrich them with detailed metadata (instructors, BJJ style, quality rating, comments) to create a comprehensive video library for each technique. This enables better organization, discovery, and learning from multiple instructional sources.

## What Changes

- Extend `Asset` entity with additional metadata fields (instructors, BJJ style, quality rating, comments)
- Create API endpoints for saving video URLs and associating them with techniques
- Create UI for adding one or multiple video URLs to a technique
- Create UI form for enriching video metadata (description, tags, instructors, BJJ style, quality rating, comments)
- Support multiple video attachments per technique with different roles (Primary, Reference, Alternative)
- Integrate with existing YouTube ingestion endpoint for automatic metadata fetching
- Create video management interface for viewing and editing associated videos

## Impact

- Affected specs: New capabilities `asset-management` and `technique-association`
- Affected code: Asset entity, Attachment relationships, API routes, frontend components
- Migration: Add new fields to Asset table; existing assets will have NULL values for new fields

