/**
 * LMS Media Reference
 * 
 * Represents media assets managed by the LMS (images, videos, documents).
 * MediaRef is used to reference media in courses, lessons, and other LMS entities.
 */

import { z } from 'zod';

/**
 * Media Type
 */
export const MediaTypeSchema = z.enum(['image', 'video', 'document', 'audio', 'other']);
export type MediaType = z.infer<typeof MediaTypeSchema>;

/**
 * Media Reference
 * 
 * References a media asset stored in S3 or external storage.
 * The LMS manages these references but does not own the storage layer.
 */
export const MediaRefSchema = z.object({
  media_id: z.string(),
  type: MediaTypeSchema,
  url: z.string().url(), // S3 URL or external URL
  s3_bucket: z.string().optional(),
  s3_key: z.string().optional(),
  filename: z.string().optional(),
  content_type: z.string().optional(),
  size_bytes: z.number().optional(),
  width: z.number().optional(), // For images/videos
  height: z.number().optional(), // For images/videos
  duration_ms: z.number().optional(), // For videos/audio
  thumbnail_url: z.string().url().optional(), // For videos
  created_at: z.string(), // ISO datetime
  created_by: z.string(), // User ID
});

export type MediaRef = z.infer<typeof MediaRefSchema>;



