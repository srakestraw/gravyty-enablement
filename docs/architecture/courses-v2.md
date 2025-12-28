# Courses v2 Architecture

## Overview

Courses v2 is a planned module for the Enablement Portal that will provide structured learning experiences. This document outlines the goals and planned data model.

## Goals

- Provide structured, multi-step learning experiences
- Track user progress and completion
- Support various content types (documents, videos, assessments)
- Enable personalized learning paths
- Provide analytics on course completion and engagement

## Planned Data Model

### Course

A course represents a structured learning experience with multiple modules and lessons.

**Planned Fields:**
- `id` (string) - Unique course identifier
- `title` (string) - Course title
- `description` (string) - Course description
- `product_suite` (string, optional) - Product suite categorization
- `product_concept` (string, optional) - Product concept categorization
- `tags` (string[]) - Tags for categorization
- `status` (enum) - Course status (Draft, Published, Archived)
- `estimated_duration_minutes` (number, optional) - Estimated completion time
- `modules` (Module[]) - List of course modules
- `created_at` (datetime) - Creation timestamp
- `created_by` (string) - Creator user ID
- `updated_at` (datetime) - Last update timestamp

### Module

A module is a grouping of lessons within a course.

**Planned Fields:**
- `id` (string) - Unique module identifier
- `title` (string) - Module title
- `description` (string, optional) - Module description
- `order` (number) - Display order within course
- `lessons` (Lesson[]) - List of lessons in the module

### Lesson

A lesson is a single learning unit within a module.

**Planned Fields:**
- `id` (string) - Unique lesson identifier
- `title` (string) - Lesson title
- `type` (enum) - Lesson type (content, video, assessment, etc.)
- `ref_id` (string) - Reference to content item, video, or assessment
- `order` (number) - Display order within module
- `required` (boolean) - Whether lesson is required for completion
- `estimated_duration_minutes` (number, optional) - Estimated completion time

### Course Progress

Tracks user progress through courses.

**Planned Fields:**
- `user_id` (string) - User identifier
- `course_id` (string) - Course identifier
- `module_id` (string, optional) - Current module identifier
- `lesson_id` (string, optional) - Current lesson identifier
- `completed_lessons` (string[]) - List of completed lesson IDs
- `completed_at` (datetime, optional) - Course completion timestamp
- `started_at` (datetime) - Course start timestamp
- `last_accessed_at` (datetime) - Last access timestamp

## API Endpoints (Planned)

- `GET /v1/courses` - List courses
- `GET /v1/courses/:id` - Get course details
- `POST /v1/courses` - Create course (Contributor+)
- `PUT /v1/courses/:id` - Update course (Contributor+)
- `POST /v1/courses/:id/publish` - Publish course (Approver+)
- `GET /v1/courses/:id/progress` - Get user progress for a course
- `POST /v1/courses/:id/progress/complete` - Mark lesson as complete

## Implementation Status

**Status:** Not yet implemented

The Courses v2 module is currently in planning phase. This document will be updated as implementation progresses.


