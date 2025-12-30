/**
 * LMS Telemetry Helper
 * 
 * Standardized telemetry emission for LMS events with consistent payloads
 */

import { Request } from 'express';
import { AuthenticatedRequest } from '../types';
import { storageRepos } from '../server';

/**
 * Telemetry context from client (optional)
 */
export interface TelemetryContext {
  source_page?: string;
  source_component?: string;
  ui_action?: string;
}

/**
 * LMS Event Payload
 */
export interface LmsEventPayload {
  // Entity identifiers
  course_id?: string;
  lesson_id?: string;
  path_id?: string;
  assignment_id?: string;
  certificate_id?: string;
  template_id?: string;
  applies_to_id?: string;
  
  // Enrollment and progress
  enrollment_origin?: string; // EnrollmentOrigin enum value
  progress_percent?: number;
  position_ms?: number;
  completed?: boolean;
  
  // Search and filters
  q?: string;
  badge_filters?: string[];
  topic_filters?: string[];
  product_suite?: string;
  product_concept?: string;
  
  // UI context
  ui_action?: string;
  
  // Additional metadata
  [key: string]: unknown;
}

/**
 * Extract telemetry context from request
 */
function extractTelemetryContext(req: Request): TelemetryContext {
  // Check headers first (preferred for GET requests)
  const sourcePage = req.headers['x-telemetry-source-page'] as string | undefined;
  const sourceComponent = req.headers['x-telemetry-source-component'] as string | undefined;
  const uiAction = req.headers['x-telemetry-ui-action'] as string | undefined;
  
  // Check body for POST requests (if provided)
  const body = req.body as { telemetry?: TelemetryContext } | undefined;
  const bodyTelemetry = body?.telemetry;
  
  return {
    source_page: sourcePage || bodyTelemetry?.source_page,
    source_component: sourceComponent || bodyTelemetry?.source_component,
    ui_action: uiAction || bodyTelemetry?.ui_action,
  };
}

/**
 * Derive source route from request
 * Normalizes to "{METHOD} {PATH}" format (no host, no querystring)
 */
function deriveSourceRoute(req: Request): { source_route: string; source_api_route: string; source_method: string } {
  // Normalize path: replace actual IDs with parameter placeholders for aggregation
  let normalizedPath = req.path;
  
  // Replace course IDs with :courseId
  normalizedPath = normalizedPath.replace(/\/courses\/[^/]+/g, '/courses/:courseId');
  
  // Replace lesson IDs with :lessonId
  normalizedPath = normalizedPath.replace(/\/lessons\/[^/]+/g, '/lessons/:lessonId');
  
  // Replace path IDs with :pathId
  normalizedPath = normalizedPath.replace(/\/paths\/[^/]+/g, '/paths/:pathId');
  
  const method = req.method.toUpperCase();
  const fullRoute = `${method} ${req.path}`;
  
  return {
    source_route: fullRoute,
    source_api_route: normalizedPath,
    source_method: method,
  };
}

/**
 * Emit an LMS telemetry event with standardized fields
 */
export async function emitLmsEvent(
  req: AuthenticatedRequest,
  eventName: string,
  payload: LmsEventPayload = {}
): Promise<void> {
  try {
    const userId = req.user?.user_id || 'unknown';
    const now = new Date().toISOString();
    const telemetryContext = extractTelemetryContext(req);
    const routeInfo = deriveSourceRoute(req);
    
    // Build standardized metadata
    const metadata: Record<string, unknown> = {
      // Source context
      source: {
        source_app: 'web',
        source_route: routeInfo.source_route,
        source_api_route: routeInfo.source_api_route,
        source_method: routeInfo.source_method,
        ...(telemetryContext.source_page && { source_page: telemetryContext.source_page }),
        ...(telemetryContext.source_component && { source_component: telemetryContext.source_component }),
      },
      // Entity identifiers
      ...(payload.course_id && { course_id: payload.course_id }),
      ...(payload.lesson_id && { lesson_id: payload.lesson_id }),
      ...(payload.path_id && { path_id: payload.path_id }),
      ...(payload.assignment_id && { assignment_id: payload.assignment_id }),
      ...(payload.certificate_id && { certificate_id: payload.certificate_id }),
      // Enrollment and progress
      ...(payload.enrollment_origin && { enrollment_origin: payload.enrollment_origin }),
      ...(payload.progress_percent !== undefined && { progress_percent: payload.progress_percent }),
      ...(payload.position_ms !== undefined && { position_ms: payload.position_ms }),
      ...(payload.completed !== undefined && { completed: payload.completed }),
      // Search and filters
      ...(payload.q && { q: payload.q }),
      ...(payload.badge_filters && { badge_filters: payload.badge_filters }),
      ...(payload.topic_filters && { topic_filters: payload.topic_filters }),
      ...(payload.product_suite && { product_suite: payload.product_suite }),
      ...(payload.product_concept && { product_concept: payload.product_concept }),
      // UI action
      ...(payload.ui_action && { ui_action: payload.ui_action }),
      // Timestamp
      occurred_at: now,
      // Any additional fields
      ...Object.fromEntries(
        Object.entries(payload).filter(
          ([key]) =>
            ![
              'course_id',
              'lesson_id',
              'path_id',
              'assignment_id',
              'certificate_id',
              'template_id',
              'applies_to_id',
              'enrollment_origin',
              'progress_percent',
              'position_ms',
              'completed',
              'q',
              'badge_filters',
              'topic_filters',
              'product_suite',
              'product_concept',
              'ui_action',
            ].includes(key)
        )
      ),
    };
    
    // Determine content_id (prefer course_id, then path_id)
    const contentId = payload.course_id || payload.path_id;
    
    // Emit event
    await storageRepos.event.create({
      event_name: eventName,
      user_id: userId,
      content_id: contentId,
      metadata,
      timestamp: now,
    });
  } catch (error) {
    // Don't fail the request if telemetry fails
    console.error(`Failed to emit LMS telemetry event ${eventName}:`, error);
  }
}

/**
 * Canonical LMS Event Names
 */
export const LMS_EVENTS = {
  // Catalog / navigation
  COURSES_LISTED: 'lms_courses_listed',
  PATHS_LISTED: 'lms_paths_listed',
  
  // Detail views
  COURSE_VIEWED: 'lms_course_viewed',
  LESSON_VIEWED: 'lms_lesson_viewed',
  PATH_VIEWED: 'lms_path_viewed',
  
  // Enrollment and progress
  ENROLLED: 'lms_enrolled',
  PROGRESS_UPDATED: 'lms_progress_updated',
  LESSON_COMPLETED: 'lms_lesson_completed',
  COURSE_COMPLETED: 'lms_course_completed',
  
  // Path lifecycle
  PATH_STARTED: 'lms_path_started',
  PATH_PROGRESS_UPDATED: 'lms_path_progress_updated',
  PATH_COMPLETED: 'lms_path_completed',
  
  // Assignments and certificates
  ASSIGNMENTS_LISTED: 'lms_assignments_listed',
  CERTIFICATES_LISTED: 'lms_certificates_listed',
  CERTIFICATE_DOWNLOADED: 'lms_certificate_downloaded',
  
  // Certificate admin events
  ADMIN_CERTIFICATE_TEMPLATE_CREATED: 'lms_admin_certificate_template_created',
  ADMIN_CERTIFICATE_TEMPLATE_UPDATED: 'lms_admin_certificate_template_updated',
  ADMIN_CERTIFICATE_TEMPLATE_PUBLISHED: 'lms_admin_certificate_template_published',
  ADMIN_CERTIFICATE_TEMPLATE_ARCHIVED: 'lms_admin_certificate_template_archived',
  CERTIFICATE_ISSUED: 'lms_certificate_issued',
  
  // Optional
  SEARCH_PERFORMED: 'lms_search_performed',
  FILTER_APPLIED: 'lms_filter_applied',
  RESUME_CLICKED: 'lms_resume_clicked',
  START_CLICKED: 'lms_start_clicked',
} as const;

