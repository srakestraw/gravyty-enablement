/**
 * LMS Fixtures
 * 
 * Minimal typed mock objects for UI development.
 * These fixtures match the API contracts and can be used in placeholder pages.
 */

import {
  CourseSummary,
  CourseDetail,
  LessonDetail,
  LearningPathSummary,
  LearningPathDetail,
  MyLearning,
  AssignmentSummary,
  CertificateSummary,
  CertificateTemplateSummary,
} from './contracts.js';

/**
 * Sample Course Summaries
 */
export const sampleCourseSummaries: CourseSummary[] = [
  {
    course_id: 'course-1',
    title: 'Introduction to Sales Enablement',
    short_description: 'Learn the fundamentals of sales enablement and customer success.',
    product: 'Sales',
    product_suite: 'Enablement',
    topic_tags: ['sales', 'onboarding', 'fundamentals'],
    estimated_duration_minutes: 45,
    difficulty_level: 'beginner',
    status: 'published',
    published_at: '2024-01-15T10:00:00Z',
  },
  {
    course_id: 'course-2',
    title: 'Advanced CRM Techniques',
    short_description: 'Master advanced CRM workflows and automation.',
    product: 'Sales',
    product_suite: 'CRM',
    topic_tags: ['crm', 'automation', 'advanced'],
    estimated_duration_minutes: 90,
    difficulty_level: 'intermediate',
    status: 'published',
    published_at: '2024-01-20T10:00:00Z',
  },
];

/**
 * Sample Course Detail
 */
export const sampleCourseDetail: CourseDetail = {
  course_id: 'course-1',
  title: 'Introduction to Sales Enablement',
  description: 'A comprehensive introduction to sales enablement practices.',
  short_description: 'Learn the fundamentals of sales enablement and customer success.',
  product: 'Sales',
  product_suite: 'Enablement',
  topic_tags: ['sales', 'onboarding', 'fundamentals'],
  topic_tag_ids: [],
  related_course_ids: ['course-2'],
  badges: [],
  badge_ids: [],
  sections: [
    {
      section_id: 'section-1',
      title: 'Getting Started',
      description: 'Introduction and overview',
      order: 0,
      lesson_ids: ['lesson-1', 'lesson-2'],
      lessons: [
        {
          lesson_id: 'lesson-1',
          title: 'Welcome to Sales Enablement',
          type: 'video',
          order: 0,
          estimated_duration_minutes: 10,
          required: true,
        },
        {
          lesson_id: 'lesson-2',
          title: 'Key Concepts',
          type: 'reading',
          order: 1,
          estimated_duration_minutes: 15,
          required: true,
        },
      ],
    },
  ],
  status: 'published',
  version: 1,
  published_version: 1,
  published_at: '2024-01-15T10:00:00Z',
  published_by: 'user-1',
  estimated_duration_minutes: 45,
  difficulty_level: 'beginner',
  created_at: '2024-01-10T10:00:00Z',
  created_by: 'user-1',
  updated_at: '2024-01-15T10:00:00Z',
  updated_by: 'user-1',
};

/**
 * Sample Lesson Detail
 */
export const sampleLessonDetail: LessonDetail = {
  lesson_id: 'lesson-1',
  course_id: 'course-1',
  section_id: 'section-1',
  title: 'Welcome to Sales Enablement',
  description: 'Introduction to the course',
  type: 'video',
  order: 0,
  content: {
    kind: 'video',
    video_id: 'media-1',
    duration_seconds: 600,
    transcript: 'Welcome to the course on sales enablement.',
  },
  resources: [],
  required: true,
  created_at: '2024-01-10T10:00:00Z',
  created_by: 'user-1',
  updated_at: '2024-01-10T10:00:00Z',
  updated_by: 'user-1',
};

/**
 * Sample Learning Path Summaries
 */
export const sampleLearningPathSummaries: LearningPathSummary[] = [
  {
    path_id: 'path-1',
    title: 'Sales Fundamentals Path',
    short_description: 'Complete learning path for new sales team members.',
    product: 'Sales',
    product_suite: 'Onboarding',
    topic_tags: ['sales', 'onboarding'],
    estimated_duration_minutes: 180,
    course_count: 3,
    status: 'published',
    published_at: '2024-01-15T10:00:00Z',
  },
];

/**
 * Sample My Learning
 */
export const sampleMyLearning: MyLearning = {
  required: [
    {
      type: 'course',
      course_id: 'course-1',
      title: 'Introduction to Sales Enablement',
      due_at: '2024-02-01T00:00:00Z',
      assignment_id: 'assignment-1',
      progress_percent: 25,
    },
  ],
  in_progress: [
    {
      type: 'course',
      course_id: 'course-2',
      title: 'Advanced CRM Techniques',
      progress_percent: 60,
      last_accessed_at: '2024-01-25T14:30:00Z',
      current_lesson_id: 'lesson-5',
    },
  ],
  completed: [
    {
      type: 'path',
      path_id: 'path-1',
      title: 'Sales Fundamentals Path',
      completed_at: '2024-01-20T16:00:00Z',
    },
  ],
};

/**
 * Sample Assignment Summaries
 */
export const sampleAssignmentSummaries: AssignmentSummary[] = [
  {
    assignment_id: 'assignment-1',
    assignment_type: 'course',
    course_id: 'course-1',
    title: 'Introduction to Sales Enablement',
    status: 'started',
    due_at: '2024-02-01T00:00:00Z',
    assigned_at: '2024-01-15T10:00:00Z',
    progress_percent: 25,
    is_overdue: false,
  },
];

/**
 * Sample Certificate Summaries
 */
export const sampleCertificateSummaries: CertificateSummary[] = [
  {
    certificate_id: 'cert-1',
    template_id: 'template-1',
    template_name: 'Course Completion Certificate',
    recipient_name: 'John Doe',
    course_title: 'Introduction to Sales Enablement',
    completion_date: '2024-01-20T16:00:00Z',
    issued_at: '2024-01-20T16:05:00Z',
    badge_text: 'Course Completion',
  },
];

/**
 * Sample Certificate Template Summaries
 */
export const sampleCertificateTemplateSummaries: CertificateTemplateSummary[] = [
  {
    template_id: 'template-1',
    name: 'Course Completion Certificate',
    description: 'Standard certificate for course completion',
    status: 'published',
    applies_to: 'course',
    applies_to_id: 'course-1',
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    published_at: '2024-01-01T10:00:00Z',
  },
];

