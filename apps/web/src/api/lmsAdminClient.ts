/**
 * LMS Admin API Client
 * 
 * Client for admin-facing LMS API endpoints
 */

import { apiFetch, type ApiResponse, type ApiSuccessResponse } from '../lib/apiClient';
import type {
  Course,
  LearningPath,
  Assignment,
  CertificateTemplate,
  MediaRef,
  CourseAsset,
  Asset,
  AssetVersion,
} from '@gravyty/domain';

const BASE_URL = '/v1/lms/admin';

export interface AdminCourseSummary {
  course_id: string;
  title: string;
  short_description?: string;
  cover_image_url?: string;
  product?: string; // Was "product_suite"
  product_suite?: string; // Was "product_concept"
  topic_tags?: string[];
  estimated_duration_minutes?: number;
  estimated_minutes?: number;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  status: string;
  published_at?: string;
  version: number;
  updated_at: string;
  created_at: string;
}

export interface AdminPathSummary {
  path_id: string;
  title: string;
  status: string;
  version: number;
  updated_at: string;
  created_at: string;
  course_count: number;
}

export interface CreateCourseRequest {
  title: string;
  description?: string;
  short_description?: string;
  product?: string; // Was "product_suite"
  product_suite?: string; // Was "product_concept"
  topic_tags?: string[];
  product_id?: string; // Was "product_suite_id"
  product_suite_id?: string; // Was "product_concept_id"
  topic_tag_ids?: string[];
  badges?: Array<{ badge_id: string; name: string; description?: string; icon_url?: string }>;
  badge_ids?: string[];
}

export interface UpdateCourseRequest {
  title?: string;
  description?: string;
  short_description?: string;
  product?: string; // Was "product_suite"
  product_suite?: string; // Was "product_concept"
  topic_tags?: string[];
  product_id?: string; // Was "product_suite_id"
  product_suite_id?: string; // Was "product_concept_id"
  topic_tag_ids?: string[];
  badges?: Array<{ badge_id: string; name: string; description?: string; icon_url?: string }>;
  badge_ids?: string[];
  cover_image?: MediaRef;
}

export interface UpdateCourseLessonsRequest {
  sections: Array<{
    section_id: string;
    title: string;
    order: number;
    lesson_ids: string[];
  }>;
  lessons: Array<{
    lesson_id: string;
    section_id: string;
    title: string;
    description?: string;
    type: 'video' | 'reading' | 'quiz' | 'assignment' | 'interactive';
    order: number;
    required?: boolean;
    content: {
      kind: 'video' | 'reading' | 'quiz' | 'assignment' | 'interactive';
      [key: string]: any; // Type-specific fields
    };
    resources?: Array<{
      media_id: string;
      type: 'image' | 'video' | 'document' | 'audio' | 'other';
      url: string;
      filename?: string;
      created_at: string;
      created_by: string;
      [key: string]: any;
    }>;
  }>;
}

export interface CreatePathRequest {
  title: string;
  description?: string;
  short_description?: string;
  product_suite?: string;
  product_concept?: string;
  topic_tags?: string[];
  badges?: string[];
  courses?: Array<{
    course_id: string;
    order: number;
    required?: boolean;
    title_override?: string;
  }>;
}

export interface UpdatePathRequest {
  title?: string;
  description?: string;
  short_description?: string;
  product_suite?: string;
  product_concept?: string;
  topic_tags?: string[];
  badges?: string[];
  courses?: Array<{
    course_id: string;
    order: number;
    required?: boolean;
    title_override?: string;
  }>;
}

export interface CreateAssignmentRequest {
  assignee_user_id: string;
  target_type: 'course' | 'path';
  target_id: string;
  due_at?: string;
  assignment_reason?: 'required' | 'recommended';
  note?: string;
}

export interface CreateCertificateTemplateRequest {
  name: string;
  description?: string;
  applies_to: 'course' | 'path';
  applies_to_id: string;
  badge_text: string;
  signatory_name?: string;
  signatory_title?: string;
  issued_copy: {
    title: string;
    body: string;
  };
}

export interface UpdateCertificateTemplateRequest {
  name?: string;
  description?: string;
  applies_to?: 'course' | 'path';
  applies_to_id?: string;
  badge_text?: string;
  signatory_name?: string;
  signatory_title?: string;
  issued_copy?: {
    title: string;
    body: string;
  };
  status?: 'draft' | 'published' | 'archived';
}

export interface PresignMediaUploadRequest {
  media_type: 'cover' | 'video' | 'poster' | 'attachment';
  course_id?: string;
  lesson_id?: string;
  filename: string;
  content_type: string;
  temporary?: boolean; // Flag to mark upload as temporary (for unsaved courses)
}

export interface PresignMediaUploadResponse {
  upload_url: string;
  bucket: string;
  key: string;
  media_ref: MediaRef;
}

export const lmsAdminApi = {
  // Courses
  async listCourses(params?: { status?: string; product?: string; product_suite?: string; q?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.product_suite) query.append('product_suite', params.product_suite);
    if (params?.q) query.append('q', params.q);
    const url = `${BASE_URL}/courses${query.toString() ? `?${query.toString()}` : ''}`;
    return apiFetch<{ courses: AdminCourseSummary[] }>(url);
  },

  async getCourse(courseId: string) {
    return apiFetch<{ course: Course; is_draft: boolean }>(`${BASE_URL}/courses/${courseId}`);
  },

  async createCourse(data: CreateCourseRequest) {
    return apiFetch<{ course: Course }>(`${BASE_URL}/courses`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCourse(courseId: string, data: UpdateCourseRequest) {
    return apiFetch<{ course: Course }>(`${BASE_URL}/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteCourse(courseId: string) {
    return apiFetch<{ deleted: true }>(
      `${BASE_URL}/courses/${courseId}`,
      { method: 'DELETE' }
    );
  },

  async archiveCourse(courseId: string) {
    return apiFetch<{ course: Course }>(
      `${BASE_URL}/courses/${courseId}/archive`,
      { method: 'POST' }
    );
  },

  async restoreCourse(courseId: string) {
    return apiFetch<{ course: Course }>(
      `${BASE_URL}/courses/${courseId}/restore`,
      { method: 'POST' }
    );
  },

  async updateCourseLessons(courseId: string, data: UpdateCourseLessonsRequest) {
    return apiFetch<{ success: boolean }>(`${BASE_URL}/courses/${courseId}/lessons`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getCourseLessons(courseId: string) {
    return apiFetch<{ lessons: any[] }>(`${BASE_URL}/courses/${courseId}/lessons`);
  },

  async publishCourse(courseId: string) {
    return apiFetch<{ course: Course }>(`${BASE_URL}/courses/${courseId}/publish`, {
      method: 'POST',
    });
  },

  // Paths
  async listPaths(params?: { status?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    const url = `${BASE_URL}/paths${query.toString() ? `?${query.toString()}` : ''}`;
    return apiFetch<{ paths: AdminPathSummary[] }>(url);
  },

  async getPath(pathId: string) {
    return apiFetch<{ path: LearningPath & { courses?: Array<{ course?: any }> }; is_draft: boolean }>(`${BASE_URL}/paths/${pathId}`);
  },

  async createPath(data: CreatePathRequest) {
    return apiFetch<{ path: LearningPath }>(`${BASE_URL}/paths`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updatePath(pathId: string, data: UpdatePathRequest) {
    return apiFetch<{ path: LearningPath }>(`${BASE_URL}/paths/${pathId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async publishPath(pathId: string) {
    return apiFetch<{ path: LearningPath }>(`${BASE_URL}/paths/${pathId}/publish`, {
      method: 'POST',
    });
  },

  // Assignments
  async listAssignments(params?: { assignee_user_id?: string; status?: string }) {
    const query = new URLSearchParams();
    if (params?.assignee_user_id) query.append('assignee_user_id', params.assignee_user_id);
    if (params?.status) query.append('status', params.status);
    const url = `${BASE_URL}/assignments${query.toString() ? `?${query.toString()}` : ''}`;
    return apiFetch<{ assignments: Assignment[] }>(url);
  },

  async createAssignment(data: CreateAssignmentRequest) {
    return apiFetch<{ assignment: Assignment }>(`${BASE_URL}/assignments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async waiveAssignment(assigneeUserId: string, sk: string) {
    return apiFetch<{ assignment: Assignment }>(`${BASE_URL}/assignments/waive?assignee_user_id=${encodeURIComponent(assigneeUserId)}&sk=${encodeURIComponent(sk)}`, {
      method: 'POST',
    });
  },

  // Certificate Templates
  async listCertificateTemplates() {
    return apiFetch<{ templates: any[] }>(`${BASE_URL}/certificates/templates`);
  },

  async getCertificateTemplate(templateId: string) {
    return apiFetch<{ template: any }>(`${BASE_URL}/certificates/templates/${templateId}`);
  },

  async createCertificateTemplate(data: CreateCertificateTemplateRequest) {
    return apiFetch<{ template: any }>(`${BASE_URL}/certificates/templates`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCertificateTemplate(templateId: string, data: UpdateCertificateTemplateRequest) {
    return apiFetch<{ template: any }>(`${BASE_URL}/certificates/templates/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async publishCertificateTemplate(templateId: string) {
    return apiFetch<{ template: any }>(`${BASE_URL}/certificates/templates/${templateId}/publish`, {
      method: 'POST',
    });
  },

  async archiveCertificateTemplate(templateId: string) {
    return apiFetch<{ template: any }>(`${BASE_URL}/certificates/templates/${templateId}/archive`, {
      method: 'POST',
    });
  },

  // Media
  async listMedia(params?: { media_type?: string; course_id?: string; lesson_id?: string }) {
    const query = new URLSearchParams();
    if (params?.media_type) query.append('media_type', params.media_type);
    if (params?.course_id) query.append('course_id', params.course_id);
    if (params?.lesson_id) query.append('lesson_id', params.lesson_id);
    const url = `${BASE_URL}/media${query.toString() ? `?${query.toString()}` : ''}`;
    return apiFetch<{ media: any[] }>(url);
  },

  async presignMediaUpload(data: PresignMediaUploadRequest) {
    return apiFetch<PresignMediaUploadResponse>(`${BASE_URL}/media/presign`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteMedia(mediaId: string) {
    return apiFetch<void>(`${BASE_URL}/media/${mediaId}`, {
      method: 'DELETE',
    });
  },

  // Course Assets (Content Hub integration)
  async attachAssetToCourse(courseId: string, data: {
    asset_id: string;
    version_id?: string;
    display_label?: string;
    module_id?: string;
    lesson_id?: string;
    sort_order?: number;
  }) {
    return apiFetch<CourseAsset>(`${BASE_URL}/courses/${courseId}/assets`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async listCourseAssets(courseId: string, params?: {
    module_id?: string;
    lesson_id?: string;
    limit?: number;
    cursor?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.module_id) query.append('module_id', params.module_id);
    if (params?.lesson_id) query.append('lesson_id', params.lesson_id);
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.cursor) query.append('cursor', params.cursor);
    const url = `${BASE_URL}/courses/${courseId}/assets${query.toString() ? `?${query.toString()}` : ''}`;
    return apiFetch<{ items: Array<CourseAsset & { asset: Asset | null; version: AssetVersion | null }>; next_cursor?: string }>(url);
  },

  async updateCourseAsset(courseId: string, courseAssetId: string, data: {
    display_label?: string;
    version_id?: string | null;
    sort_order?: number;
  }) {
    return apiFetch<CourseAsset>(`${BASE_URL}/courses/${courseId}/assets/${courseAssetId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async detachAssetFromCourse(courseId: string, courseAssetId: string) {
    return apiFetch<void>(`${BASE_URL}/courses/${courseId}/assets/${courseAssetId}`, {
      method: 'DELETE',
    });
  },

  // AI Image Generation
  async suggestImagePrompt(params: {
    title: string;
    short_description?: string;
    description?: string;
    entity_type?: 'course' | 'asset' | 'role-playing';
  }) {
    return apiFetch<{ suggested_prompt: string }>(`${BASE_URL}/ai/suggest-image-prompt`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async generateImage(params: {
    prompt: string;
    provider?: 'openai' | 'gemini';
    size?: '1024x1024' | '512x512' | '256x256';
    quality?: 'standard' | 'hd';
    style?: 'vivid' | 'natural';
  }) {
    return apiFetch<{ image_url: string; revised_prompt?: string; provider: string }>(`${BASE_URL}/ai/generate-image`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async downloadAIImage(params: {
    image_url: string;
  }) {
    return apiFetch<{ data_url: string; content_type: string; size_bytes: number }>(`${BASE_URL}/ai/download-image`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async getMediaUrl(mediaId: string): Promise<ApiResponse<{ url: string; expires_in_seconds: number }>> {
    const url = `${BASE_URL}/media/${mediaId}/url`;
    return apiFetch<{ url: string; expires_in_seconds: number }>(url);
  },

  async uploadMedia(mediaId: string, file: File): Promise<ApiResponse<{ media_ref: MediaRef }>> {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
    const url = `${API_BASE_URL}${BASE_URL}/media/${mediaId}/upload?content_type=${encodeURIComponent(file.type)}`;
    
    // Get auth headers (but override Content-Type)
    const { getIdToken } = await import('../lib/auth');
    const headers: HeadersInit = {
      'Content-Type': file.type,
    };
    
    try {
      const token = await getIdToken(true);
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch {
      // Fallback to dev headers
      const devRole = import.meta.env.VITE_DEV_ROLE || 'Viewer';
      const devUserId = import.meta.env.VITE_DEV_USER_ID || 'dev-user';
      headers['x-dev-role'] = devRole;
      headers['x-dev-user-id'] = devUserId;
    }
    
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: file,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          error: {
            code: errorData.error?.code || 'HTTP_ERROR',
            message: errorData.error?.message || `HTTP ${response.status}`,
          },
          request_id: errorData.request_id || 'unknown',
        };
      }
      
      const data = await response.json();
      return data as ApiSuccessResponse<{ media_ref: MediaRef }>;
    } catch (error) {
      return {
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error',
        },
        request_id: 'unknown',
      };
    }
  },

  // Unsplash Integration
  async searchUnsplash(params?: {
    query?: string;
    page?: number;
    per_page?: number;
    orientation?: 'landscape' | 'portrait' | 'squarish';
  }) {
    const query = new URLSearchParams();
    if (params?.query) query.append('query', params.query);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.per_page) query.append('per_page', params.per_page.toString());
    if (params?.orientation) query.append('orientation', params.orientation);
    const url = `${BASE_URL}/unsplash/search${query.toString() ? `?${query.toString()}` : ''}`;
    return apiFetch<{
      results: Array<{
        id: string;
        urls: {
          raw: string;
          full: string;
          regular: string;
          small: string;
          thumb: string;
        };
        user: {
          name: string;
          username: string;
        };
        description?: string;
        width: number;
        height: number;
      }>;
      total: number;
      total_pages: number;
    }>(url);
  },

  async getTrendingUnsplash(params?: {
    page?: number;
    per_page?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.per_page) query.append('per_page', params.per_page.toString());
    const url = `${BASE_URL}/unsplash/trending${query.toString() ? `?${query.toString()}` : ''}`;
    return apiFetch<{
      results: Array<{
        id: string;
        urls: {
          raw: string;
          full: string;
          regular: string;
          small: string;
          thumb: string;
        };
        user: {
          name: string;
          username: string;
        };
        description?: string;
        width: number;
        height: number;
      }>;
      total: number;
      total_pages: number;
    }>(url);
  },
};

