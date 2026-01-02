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
export declare const CourseAssetSchema: z.ZodObject<{
    course_asset_id: z.ZodString;
    course_id: z.ZodString;
    asset_id: z.ZodString;
    version_id: z.ZodOptional<z.ZodString>;
    display_label: z.ZodOptional<z.ZodString>;
    module_id: z.ZodOptional<z.ZodString>;
    lesson_id: z.ZodOptional<z.ZodString>;
    sort_order: z.ZodDefault<z.ZodNumber>;
    created_at: z.ZodString;
    created_by: z.ZodString;
    entity_type: z.ZodDefault<z.ZodLiteral<"COURSE_ASSET">>;
    'course_id#sort_order': z.ZodOptional<z.ZodString>;
    'asset_id#course_id': z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    created_at: string;
    created_by: string;
    course_id: string;
    entity_type: "COURSE_ASSET";
    sort_order: number;
    asset_id: string;
    course_asset_id: string;
    lesson_id?: string | undefined;
    version_id?: string | undefined;
    display_label?: string | undefined;
    module_id?: string | undefined;
    'course_id#sort_order'?: string | undefined;
    'asset_id#course_id'?: string | undefined;
}, {
    created_at: string;
    created_by: string;
    course_id: string;
    asset_id: string;
    course_asset_id: string;
    lesson_id?: string | undefined;
    entity_type?: "COURSE_ASSET" | undefined;
    sort_order?: number | undefined;
    version_id?: string | undefined;
    display_label?: string | undefined;
    module_id?: string | undefined;
    'course_id#sort_order'?: string | undefined;
    'asset_id#course_id'?: string | undefined;
}>;
export type CourseAsset = z.infer<typeof CourseAssetSchema>;
//# sourceMappingURL=courseAsset.d.ts.map