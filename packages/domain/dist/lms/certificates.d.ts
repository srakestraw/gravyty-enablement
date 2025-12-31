/**
 * Certificate Domain Types
 *
 * Defines CertificateTemplate and IssuedCertificate types.
 *
 * Note: UI labels:
 * - "My Certificates" (learner-facing)
 * - "Certificate Templates" (admin-facing)
 */
import { z } from 'zod';
/**
 * Certificate Template Status
 */
export declare const CertificateTemplateStatusSchema: z.ZodEnum<["draft", "published", "archived"]>;
export type CertificateTemplateStatus = z.infer<typeof CertificateTemplateStatusSchema>;
/**
 * Certificate Template
 *
 * Admin-managed template for certificates that can be issued to learners.
 * Phase 9: Minimal template with basic fields for MVP.
 */
export declare const CertificateTemplateSchema: z.ZodObject<{
    template_id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<["draft", "published", "archived"]>;
    applies_to: z.ZodEnum<["course", "path"]>;
    applies_to_id: z.ZodString;
    badge_text: z.ZodString;
    signatory_name: z.ZodOptional<z.ZodString>;
    signatory_title: z.ZodOptional<z.ZodString>;
    issued_copy: z.ZodObject<{
        title: z.ZodString;
        body: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        title: string;
        body: string;
    }, {
        title: string;
        body: string;
    }>;
    created_at: z.ZodString;
    created_by: z.ZodOptional<z.ZodString>;
    updated_at: z.ZodString;
    updated_by: z.ZodOptional<z.ZodString>;
    published_at: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "published" | "archived";
    name: string;
    created_at: string;
    updated_at: string;
    template_id: string;
    applies_to: "path" | "course";
    applies_to_id: string;
    badge_text: string;
    issued_copy: {
        title: string;
        body: string;
    };
    created_by?: string | undefined;
    description?: string | undefined;
    published_at?: string | undefined;
    updated_by?: string | undefined;
    signatory_name?: string | undefined;
    signatory_title?: string | undefined;
}, {
    status: "draft" | "published" | "archived";
    name: string;
    created_at: string;
    updated_at: string;
    template_id: string;
    applies_to: "path" | "course";
    applies_to_id: string;
    badge_text: string;
    issued_copy: {
        title: string;
        body: string;
    };
    created_by?: string | undefined;
    description?: string | undefined;
    published_at?: string | undefined;
    updated_by?: string | undefined;
    signatory_name?: string | undefined;
    signatory_title?: string | undefined;
}>;
export type CertificateTemplate = z.infer<typeof CertificateTemplateSchema>;
/**
 * Issued Certificate
 *
 * A certificate that has been issued to a learner.
 * This is the learner-facing "My Certificates" view.
 */
export declare const IssuedCertificateSchema: z.ZodObject<{
    certificate_id: z.ZodString;
    user_id: z.ZodString;
    template_id: z.ZodString;
    issued_at: z.ZodString;
    issued_by: z.ZodOptional<z.ZodString>;
    completion_type: z.ZodEnum<["course", "path"]>;
    course_id: z.ZodOptional<z.ZodString>;
    path_id: z.ZodOptional<z.ZodString>;
    certificate_data: z.ZodObject<{
        recipient_name: z.ZodString;
        course_title: z.ZodOptional<z.ZodString>;
        path_title: z.ZodOptional<z.ZodString>;
        completion_date: z.ZodString;
        badge_text: z.ZodString;
        signatory_name: z.ZodOptional<z.ZodString>;
        signatory_title: z.ZodOptional<z.ZodString>;
        issued_copy: z.ZodObject<{
            title: z.ZodString;
            body: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            title: string;
            body: string;
        }, {
            title: string;
            body: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        badge_text: string;
        issued_copy: {
            title: string;
            body: string;
        };
        recipient_name: string;
        completion_date: string;
        signatory_name?: string | undefined;
        signatory_title?: string | undefined;
        course_title?: string | undefined;
        path_title?: string | undefined;
    }, {
        badge_text: string;
        issued_copy: {
            title: string;
            body: string;
        };
        recipient_name: string;
        completion_date: string;
        signatory_name?: string | undefined;
        signatory_title?: string | undefined;
        course_title?: string | undefined;
        path_title?: string | undefined;
    }>;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    created_at: string;
    user_id: string;
    template_id: string;
    certificate_id: string;
    issued_at: string;
    completion_type: "path" | "course";
    certificate_data: {
        badge_text: string;
        issued_copy: {
            title: string;
            body: string;
        };
        recipient_name: string;
        completion_date: string;
        signatory_name?: string | undefined;
        signatory_title?: string | undefined;
        course_title?: string | undefined;
        path_title?: string | undefined;
    };
    course_id?: string | undefined;
    path_id?: string | undefined;
    issued_by?: string | undefined;
}, {
    created_at: string;
    user_id: string;
    template_id: string;
    certificate_id: string;
    issued_at: string;
    completion_type: "path" | "course";
    certificate_data: {
        badge_text: string;
        issued_copy: {
            title: string;
            body: string;
        };
        recipient_name: string;
        completion_date: string;
        signatory_name?: string | undefined;
        signatory_title?: string | undefined;
        course_title?: string | undefined;
        path_title?: string | undefined;
    };
    course_id?: string | undefined;
    path_id?: string | undefined;
    issued_by?: string | undefined;
}>;
export type IssuedCertificate = z.infer<typeof IssuedCertificateSchema>;
/**
 * Certificate Validation
 */
export declare function validateCertificateTemplate(template: CertificateTemplate): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=certificates.d.ts.map