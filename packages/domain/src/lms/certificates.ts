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
export const CertificateTemplateStatusSchema = z.enum(['draft', 'published', 'archived']);
export type CertificateTemplateStatus = z.infer<typeof CertificateTemplateStatusSchema>;

/**
 * Certificate Template
 * 
 * Admin-managed template for certificates that can be issued to learners.
 * Phase 9: Minimal template with basic fields for MVP.
 */
export const CertificateTemplateSchema = z.object({
  template_id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  
  // Status
  status: CertificateTemplateStatusSchema,
  
  // Issuance rules (simplified for Phase 9)
  applies_to: z.enum(['course', 'path']),
  applies_to_id: z.string(), // course_id or path_id
  
  // Certificate content
  badge_text: z.string(), // Text displayed on certificate badge
  signatory_name: z.string().optional(), // Name of signatory
  signatory_title: z.string().optional(), // Title of signatory
  issued_copy: z.object({
    title: z.string(), // Certificate title text
    body: z.string(), // Certificate body text
  }),
  
  // Metadata
  created_at: z.string(), // ISO datetime
  created_by: z.string().optional(), // User ID
  updated_at: z.string(), // ISO datetime
  updated_by: z.string().optional(), // User ID
  published_at: z.string().optional(), // ISO datetime (when published)
});

export type CertificateTemplate = z.infer<typeof CertificateTemplateSchema>;

/**
 * Issued Certificate
 * 
 * A certificate that has been issued to a learner.
 * This is the learner-facing "My Certificates" view.
 */
export const IssuedCertificateSchema = z.object({
  certificate_id: z.string(),
  user_id: z.string(), // PK (for GSI)
  
  // Template reference
  template_id: z.string(),
  
  // Issuance details
  issued_at: z.string(), // ISO datetime (for GSI sort key)
  issued_by: z.string().optional(), // User ID (system or admin)
  
  // Completion context
  completion_type: z.enum(['course', 'path']),
  course_id: z.string().optional(), // If completion_type is 'course'
  path_id: z.string().optional(), // If completion_type is 'path'
  
  // Certificate data (snapshot at issuance)
  certificate_data: z.object({
    recipient_name: z.string(),
    course_title: z.string().optional(),
    path_title: z.string().optional(),
    completion_date: z.string(), // ISO datetime
    badge_text: z.string(), // From template at issuance
    signatory_name: z.string().optional(), // From template at issuance
    signatory_title: z.string().optional(), // From template at issuance
    issued_copy: z.object({
      title: z.string(),
      body: z.string(),
    }), // From template at issuance
  }),
  
  // Timestamps
  created_at: z.string(), // ISO datetime
});

export type IssuedCertificate = z.infer<typeof IssuedCertificateSchema>;

/**
 * Certificate Validation
 */
export function validateCertificateTemplate(template: CertificateTemplate): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (template.status === 'published') {
    // Published templates should have applies_to_id
    if (!template.applies_to_id) {
      errors.push('Published certificate templates must have applies_to_id');
    }
    
    // Required fields for published templates
    if (!template.badge_text) {
      errors.push('Published certificate templates must have badge_text');
    }
    if (!template.signatory_name) {
      errors.push('Published certificate templates must have signatory_name');
    }
    if (!template.issued_copy || !template.issued_copy.title || !template.issued_copy.body) {
      errors.push('Published certificate templates must have issued_copy with title and body');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

