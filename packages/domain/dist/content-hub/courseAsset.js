/**
 * Content Hub - Course Asset Domain Model
 *
 * Join model linking courses to assets without duplication.
 */
import { z } from 'zod';
/**
 * Course Asset
 *
 * Links a course to an asset, either canonical (always latest) or version-pinned.
 */
export const CourseAssetSchema = z.object({
    // Primary key
    course_asset_id: z.string(),
    course_id: z.string(),
    asset_id: z.string(),
    // Version reference
    version_id: z.string().optional(), // Nullable - null means canonical (always latest published)
    // Display
    display_label: z.string().optional(), // Optional label for course context
    // Course structure (optional, depends on course model)
    module_id: z.string().optional(),
    lesson_id: z.string().optional(),
    // Ordering
    sort_order: z.number().int().min(0).default(0),
    // Timestamps
    created_at: z.string(), // ISO datetime
    created_by: z.string(), // User ID
    // DynamoDB discriminator
    entity_type: z.literal('COURSE_ASSET').default('COURSE_ASSET'),
    // GSI attributes
    'course_id#sort_order': z.string().optional(), // For querying course assets
    'asset_id#course_id': z.string().optional(), // For querying where asset is used
});
//# sourceMappingURL=courseAsset.js.map