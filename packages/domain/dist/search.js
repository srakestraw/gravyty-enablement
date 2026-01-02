/**
 * Unified Search Domain Types
 *
 * Types for searching and filtering across multiple entity types
 * (Courses, Learning Paths, Role Playing, Content/Assets, Content Kits)
 */
import { z } from 'zod';
import { MediaRefSchema } from './lms/media.js';
/**
 * Unified Search Result
 *
 * Represents a search result that can be any entity type
 */
export const UnifiedSearchResultSchema = z.object({
    entity_type: z.enum(['course', 'learning_path', 'role_playing', 'content', 'content_kit']),
    entity_id: z.string(),
    title: z.string(),
    short_description: z.string().optional(),
    cover_image: MediaRefSchema.optional(),
    metadata: z.object({
        product_ids: z.array(z.string()).optional(),
        product_suite_ids: z.array(z.string()).optional(),
        topic_tag_ids: z.array(z.string()).optional(),
        audience_ids: z.array(z.string()).optional(),
        badge_ids: z.array(z.string()).optional(),
    }),
    // Entity-specific fields
    status: z.string().optional(),
    published_at: z.string().optional(),
    updated_at: z.string(),
});
/**
 * Unified Search Parameters
 */
export const UnifiedSearchParamsSchema = z.object({
    // Search query
    q: z.string().optional(),
    // Entity type filters
    entity_types: z.array(z.enum(['course', 'learning_path', 'role_playing', 'content', 'content_kit'])).optional(),
    // Metadata filters
    product_ids: z.array(z.string()).optional(),
    product_suite_ids: z.array(z.string()).optional(),
    topic_tag_ids: z.array(z.string()).optional(),
    audience_ids: z.array(z.string()).optional(),
    badge_ids: z.array(z.string()).optional(),
    // Pagination
    limit: z.number().int().min(1).max(100).optional().default(20),
    cursor: z.string().optional(),
});
//# sourceMappingURL=search.js.map