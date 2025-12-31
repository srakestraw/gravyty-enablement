/**
 * LMS Admin API Client
 * 
 * Client for admin-facing LMS API endpoints
 */

import { apiFetch } from '../lib/apiClient';
import type {
  Course,
  LearningPath,
  Assignment,
  CertificateTemplate,
  MediaRef,
} from '@gravyty/domain';

const BASE_URL = '/v1/lms/admin';

export interface AdminCourseSummary {
  course_id: string;
  title: string;
  status: string;
  version: number;
  updated_at: string;
  created_at: string;
  product?: string; // Was "product_suite"
  product_suite?: string; // Was "product_concept"
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
};

