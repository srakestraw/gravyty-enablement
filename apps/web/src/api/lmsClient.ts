/**
 * LMS API Client
 * 
 * Typed client for LMS v2 API endpoints
 */

import { apiFetch, isErrorResponse } from '../lib/apiClient';
import type {
  CourseSummary,
  CourseDetail,
  LessonDetail,
  LearningPathSummary,
  LearningPathDetail,
  PathSummary,
  PathDetail,
  PathProgress,
  MyLearning,
  AssignmentSummary,
  CertificateSummary,
  CourseProgress,
  EnrollmentOrigin,
} from '@gravyty/domain';

export interface ListCoursesParams {
  q?: string;
  product?: string; // Was "product_suite"
  product_suite?: string; // Was "product_concept"
  badge?: string;
  badges?: string[];
  topic?: string;
  topics?: string[];
  limit?: number;
  cursor?: string;
}

export interface ListCoursesResponse {
  courses: CourseSummary[];
  next_cursor?: string;
}

export interface ListPathsParams {
  limit?: number;
  cursor?: string;
}

export interface ListPathsResponse {
  paths: PathSummary[];
  next_cursor?: string;
}

export interface CreateEnrollmentRequest {
  course_id: string;
  origin?: EnrollmentOrigin;
}

export interface UpdateProgressRequest {
  course_id: string;
  lesson_id: string;
  position_ms?: number;
  percent_complete?: number;
  completed?: boolean;
}

/**
 * Telemetry context (optional)
 * Passed to API to enrich server-side telemetry events
 */
export interface TelemetryContext {
  source_page?: string;
  source_component?: string;
  ui_action?: string;
}

export interface LmsClientOptions {
  telemetry?: TelemetryContext;
}

/**
 * Build telemetry headers from context
 */
function buildTelemetryHeaders(telemetry?: TelemetryContext): HeadersInit {
  const headers: HeadersInit = {};
  if (telemetry?.source_page) {
    headers['x-telemetry-source-page'] = telemetry.source_page;
  }
  if (telemetry?.source_component) {
    headers['x-telemetry-source-component'] = telemetry.source_component;
  }
  if (telemetry?.ui_action) {
    headers['x-telemetry-ui-action'] = telemetry.ui_action;
  }
  return headers;
}

/**
 * LMS API Client
 */
export const lmsApi = {
  /**
   * GET /v1/lms/health
   */
  health: async (options?: LmsClientOptions) => {
    return apiFetch<{ ok: boolean; service: string; version: string }>('/v1/lms/health', {
      headers: buildTelemetryHeaders(options?.telemetry),
    });
  },

  /**
   * GET /v1/lms/courses
   */
  listCourses: async (params?: ListCoursesParams, options?: LmsClientOptions) => {
    const queryParams = new URLSearchParams();
    if (params?.q) queryParams.append('q', params.q);
    if (params?.product) queryParams.append('product', params.product);
    if (params?.product_suite) queryParams.append('product_suite', params.product_suite);
    if (params?.badge) queryParams.append('badge', params.badge);
    if (params?.badges) queryParams.append('badges', params.badges.join(','));
    if (params?.topic) queryParams.append('topic', params.topic);
    if (params?.topics) queryParams.append('topics', params.topics.join(','));
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.cursor) queryParams.append('cursor', params.cursor);

    const queryString = queryParams.toString();
    const endpoint = `/v1/lms/courses${queryString ? `?${queryString}` : ''}`;
    return apiFetch<ListCoursesResponse>(endpoint, {
      headers: buildTelemetryHeaders(options?.telemetry),
    });
  },

  /**
   * GET /v1/lms/courses/:courseId
   */
  getCourse: async (courseId: string, options?: LmsClientOptions) => {
    return apiFetch<{ course: CourseDetail; related_courses: CourseSummary[] }>(`/v1/lms/courses/${courseId}`, {
      headers: buildTelemetryHeaders(options?.telemetry),
    });
  },

  /**
   * GET /v1/lms/courses/:courseId/lessons/:lessonId
   */
  getLesson: async (courseId: string, lessonId: string, options?: LmsClientOptions) => {
    return apiFetch<{ lesson: LessonDetail }>(`/v1/lms/courses/${courseId}/lessons/${lessonId}`, {
      headers: buildTelemetryHeaders(options?.telemetry),
    });
  },

  /**
   * GET /v1/lms/paths
   */
  listPaths: async (params?: ListPathsParams, options?: LmsClientOptions) => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.cursor) queryParams.append('cursor', params.cursor);

    const queryString = queryParams.toString();
    const endpoint = `/v1/lms/paths${queryString ? `?${queryString}` : ''}`;
    return apiFetch<ListPathsResponse>(endpoint, {
      headers: buildTelemetryHeaders(options?.telemetry),
    });
  },

  /**
   * GET /v1/lms/paths/:pathId
   */
  getPath: async (pathId: string, options?: LmsClientOptions) => {
    return apiFetch<{ path: PathDetail }>(`/v1/lms/paths/${pathId}`, {
      headers: buildTelemetryHeaders(options?.telemetry),
    });
  },

  /**
   * POST /v1/lms/paths/:pathId/start
   */
  startPath: async (pathId: string, options?: LmsClientOptions) => {
    const body: { telemetry?: TelemetryContext } = {};
    if (options?.telemetry) {
      body.telemetry = options.telemetry;
    }
    return apiFetch<{ progress: PathProgress }>(`/v1/lms/paths/${pathId}/start`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: buildTelemetryHeaders(options?.telemetry),
    });
  },

  /**
   * POST /v1/lms/enrollments
   */
  createEnrollment: async (request: CreateEnrollmentRequest, options?: LmsClientOptions) => {
    const body: CreateEnrollmentRequest & { telemetry?: TelemetryContext } = {
      ...request,
    };
    if (options?.telemetry) {
      body.telemetry = options.telemetry;
    }
    return apiFetch<{ enrollment: CourseProgress }>('/v1/lms/enrollments', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  /**
   * POST /v1/lms/progress
   */
  updateProgress: async (request: UpdateProgressRequest, options?: LmsClientOptions) => {
    const body: UpdateProgressRequest & { telemetry?: TelemetryContext } = {
      ...request,
    };
    if (options?.telemetry) {
      body.telemetry = options.telemetry;
    }
    return apiFetch<{ progress: CourseProgress }>('/v1/lms/progress', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  /**
   * GET /v1/lms/me
   */
  getMyLearning: async (options?: LmsClientOptions) => {
    return apiFetch<{ learning: MyLearning }>('/v1/lms/me', {
      headers: buildTelemetryHeaders(options?.telemetry),
    });
  },

  /**
   * GET /v1/lms/assignments
   */
  listAssignments: async (options?: LmsClientOptions) => {
    return apiFetch<{ assignments: AssignmentSummary[] }>('/v1/lms/assignments', {
      headers: buildTelemetryHeaders(options?.telemetry),
    });
  },

  /**
   * GET /v1/lms/certificates
   */
  listCertificates: async (options?: LmsClientOptions) => {
    return apiFetch<{ certificates: CertificateSummary[] }>('/v1/lms/certificates', {
      headers: buildTelemetryHeaders(options?.telemetry),
    });
  },
};

