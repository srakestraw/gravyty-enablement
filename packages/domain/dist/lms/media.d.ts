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
export declare const MediaTypeSchema: z.ZodEnum<["image", "video", "document", "audio", "other"]>;
export type MediaType = z.infer<typeof MediaTypeSchema>;
/**
 * Media Reference
 *
 * References a media asset stored in S3 or external storage.
 * The LMS manages these references but does not own the storage layer.
 */
export declare const MediaRefSchema: z.ZodObject<{
    media_id: z.ZodString;
    type: z.ZodEnum<["image", "video", "document", "audio", "other"]>;
    url: z.ZodString;
    s3_bucket: z.ZodOptional<z.ZodString>;
    s3_key: z.ZodOptional<z.ZodString>;
    filename: z.ZodOptional<z.ZodString>;
    content_type: z.ZodOptional<z.ZodString>;
    size_bytes: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    duration_ms: z.ZodOptional<z.ZodNumber>;
    thumbnail_url: z.ZodOptional<z.ZodString>;
    transcription_job_id: z.ZodOptional<z.ZodString>;
    transcription_status: z.ZodOptional<z.ZodEnum<["queued", "processing", "complete", "failed"]>>;
    transcription_language: z.ZodOptional<z.ZodString>;
    transcription_error: z.ZodOptional<z.ZodString>;
    created_at: z.ZodString;
    created_by: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "image" | "video" | "document" | "audio" | "other";
    created_at: string;
    media_id: string;
    url: string;
    created_by: string;
    content_type?: string | undefined;
    size_bytes?: number | undefined;
    s3_bucket?: string | undefined;
    s3_key?: string | undefined;
    filename?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
    duration_ms?: number | undefined;
    thumbnail_url?: string | undefined;
    transcription_job_id?: string | undefined;
    transcription_status?: "queued" | "processing" | "complete" | "failed" | undefined;
    transcription_language?: string | undefined;
    transcription_error?: string | undefined;
}, {
    type: "image" | "video" | "document" | "audio" | "other";
    created_at: string;
    media_id: string;
    url: string;
    created_by: string;
    content_type?: string | undefined;
    size_bytes?: number | undefined;
    s3_bucket?: string | undefined;
    s3_key?: string | undefined;
    filename?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
    duration_ms?: number | undefined;
    thumbnail_url?: string | undefined;
    transcription_job_id?: string | undefined;
    transcription_status?: "queued" | "processing" | "complete" | "failed" | undefined;
    transcription_language?: string | undefined;
    transcription_error?: string | undefined;
}>;
export type MediaRef = z.infer<typeof MediaRefSchema>;
//# sourceMappingURL=media.d.ts.map