/**
 * LMS Data Access Layer
 * 
 * Repository for accessing LMS DynamoDB tables.
 * Implements data access methods for courses, lessons, paths, progress, assignments, and certificates.
 */

import {
  QueryCommand,
  ScanCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient } from '../../aws/dynamoClient';
import { createHash } from 'crypto';
import { normalizeTaxonomyFieldsFromStorage } from '@gravyty/domain';
import type {
  Course,
  CourseSummary,
  Lesson,
  LearningPath,
  LearningPathSummary,
  CourseProgress,
  PathProgress,
  Assignment,
  AssignmentSummary,
  IssuedCertificate,
  CertificateSummary,
  CertificateTemplate,
  CertificateTemplateSummary,
  Transcript,
} from '@gravyty/domain';

/**
 * LMS Table Names (from environment variables)
 */
export const LMS_COURSES_TABLE = process.env.LMS_COURSES_TABLE || 'lms_courses';
export const LMS_LESSONS_TABLE = process.env.LMS_LESSONS_TABLE || 'lms_lessons';
export const LMS_PATHS_TABLE = process.env.LMS_PATHS_TABLE || 'lms_paths';
export const LMS_PROGRESS_TABLE = process.env.LMS_PROGRESS_TABLE || 'lms_progress';
export const LMS_ASSIGNMENTS_TABLE = process.env.LMS_ASSIGNMENTS_TABLE || 'lms_assignments';
export const LMS_CERTIFICATES_TABLE = process.env.LMS_CERTIFICATES_TABLE || 'lms_certificates';
export const LMS_TRANSCRIPTS_TABLE = process.env.LMS_TRANSCRIPTS_TABLE || 'lms_transcripts';

/**
 * LMS S3 Bucket Name
 */
export const LMS_MEDIA_BUCKET = process.env.LMS_MEDIA_BUCKET || 'lms-media';

/**
 * LMS Repository
 */
export class LmsRepo {
  /**
   * List published courses with optional filters
   */
  async listPublishedCourses(params: {
    query?: string;
    product_suite?: string;
    product_concept?: string;
    badge?: string;
    badges?: string[];
    topic?: string;
    topics?: string[];
    limit?: number;
    cursor?: string;
  }): Promise<{ items: CourseSummary[]; next_cursor?: string }> {
    const limit = params.limit || 50;

    // Use PublishedCatalogIndex GSI (PK=status, SK=published_at)
    const command = new QueryCommand({
      TableName: LMS_COURSES_TABLE,
      IndexName: 'PublishedCatalogIndex',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'published',
      },
      ScanIndexForward: false, // Descending order (newest first)
      Limit: limit * 2, // Fetch more to account for filtering
      ...(params.cursor && {
        ExclusiveStartKey: JSON.parse(Buffer.from(params.cursor, 'base64').toString()),
      }),
    });

    const { Items = [], LastEvaluatedKey } = await dynamoDocClient.send(command);
    // Normalize taxonomy fields before converting to summary
    let courses = (Items as Course[]).map((c) => normalizeTaxonomyFieldsFromStorage(c) as Course).map(this.toCourseSummary);

    // Apply client-side filters
    if (params.query) {
      const lowerQuery = params.query.toLowerCase();
      courses = courses.filter(
        (c) =>
          c.title.toLowerCase().includes(lowerQuery) ||
          c.short_description?.toLowerCase().includes(lowerQuery) ||
          c.topic_tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
      );
    }

    if (params.product) {
      courses = courses.filter((c) => c.product === params.product);
    }

    if (params.product_suite) {
      courses = courses.filter((c) => c.product_suite === params.product_suite);
    }

    if (params.badge || params.badges) {
      const badgeIds = params.badges || [params.badge!];
      // Filter by badge - check both legacy badges and new badge_ids
      const coursesWithBadges = (Items as Course[]).filter((c) => {
        const normalizedCourse = normalizeTaxonomyFieldsFromStorage(c) as Course;
        // Check new badge_ids first, fallback to legacy badges
        if (normalizedCourse.badge_ids && normalizedCourse.badge_ids.length > 0) {
          return normalizedCourse.badge_ids.some((id) => badgeIds.includes(id));
        }
        return c.badges?.some((badge) => badgeIds.includes(badge.badge_id));
      });
      const courseIdsWithBadges = new Set(coursesWithBadges.map((c) => c.course_id));
      courses = courses.filter((c) => courseIdsWithBadges.has(c.course_id));
    }

    if (params.topic || params.topics) {
      const topics = params.topics || [params.topic!];
      courses = courses.filter((c) =>
        c.topic_tags.some((tag) => topics.includes(tag))
      );
    }

    // Limit results
    const limitedCourses = courses.slice(0, limit);

    // Cursor: Only return cursor if we have more results AND we hit the limit
    // If filtering reduced results below limit, no cursor needed
    const hasMoreResults = courses.length > limit || (LastEvaluatedKey && limitedCourses.length === limit);
    const nextCursor = hasMoreResults && LastEvaluatedKey
      ? Buffer.from(JSON.stringify(LastEvaluatedKey)).toString('base64')
      : undefined;

    return {
      items: limitedCourses,
      ...(nextCursor && { next_cursor: nextCursor }),
    };
  }

  /**
   * Get course by ID (published only for learners)
   */
  async getCourseById(courseId: string, publishedOnly: boolean = true): Promise<Course | null> {
    const command = new GetCommand({
      TableName: LMS_COURSES_TABLE,
      Key: {
        course_id: courseId,
      },
    });

    const { Item } = await dynamoDocClient.send(command);
    if (!Item) {
      return null;
    }

    const courseRaw = Item as Course;
    if (publishedOnly && courseRaw.status !== 'published') {
      return null;
    }

    // Normalize taxonomy fields (map legacy to new names)
    const course = normalizeTaxonomyFieldsFromStorage(courseRaw) as Course;
    return course;
  }

  /**
   * Get course draft or published (for related courses hydration)
   */
  async getCourseDraftOrPublished(courseId: string): Promise<Course | null> {
    return this.getCourseById(courseId, false);
  }

  /**
   * List published paths
   */
  async listPublishedPaths(params: {
    limit?: number;
    cursor?: string;
  }): Promise<{ items: LearningPathSummary[]; next_cursor?: string }> {
    const limit = Math.min(params.limit || 50, 200); // Pagination guard

    // Use PublishedPathsIndex GSI (PK=status, SK=published_at)
    const command = new QueryCommand({
      TableName: LMS_PATHS_TABLE,
      IndexName: 'PublishedPathsIndex',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'published',
      },
      ScanIndexForward: false, // Descending order
      Limit: limit,
      ...(params.cursor && {
        ExclusiveStartKey: JSON.parse(Buffer.from(params.cursor, 'base64').toString()),
      }),
    });

    const { Items = [], LastEvaluatedKey } = await dynamoDocClient.send(command);
    // Normalize taxonomy fields before converting to summary
    const paths = (Items as LearningPath[]).map((p) => normalizeTaxonomyFieldsFromStorage(p) as LearningPath).map(this.toPathSummary);

    const nextCursor = LastEvaluatedKey
      ? Buffer.from(JSON.stringify(LastEvaluatedKey)).toString('base64')
      : undefined;

    return {
      items: paths,
      ...(nextCursor && { next_cursor: nextCursor }),
    };
  }

  /**
   * Get path by ID (published only for learners)
   */
  async getPathById(pathId: string, publishedOnly: boolean = true): Promise<LearningPath | null> {
    const command = new GetCommand({
      TableName: LMS_PATHS_TABLE,
      Key: {
        path_id: pathId,
      },
    });

    const { Item } = await dynamoDocClient.send(command);
    if (!Item) {
      return null;
    }

    const path = Item as LearningPath;
    if (publishedOnly && path.status !== 'published') {
      return null;
    }

    return path;
  }

  /**
   * Transform old lesson format to new format (backward compatibility)
   */
  private transformLesson(item: any): Lesson {
    // If already in new format (has content), ensure it's valid and return
    if (item.content && typeof item.content === 'object' && item.content.kind) {
      const lesson: Lesson = {
        lesson_id: item.lesson_id,
        course_id: item.course_id,
        section_id: item.section_id,
        title: item.title,
        description: item.description,
        type: item.type,
        order: item.order,
        required: item.required ?? true,
        content: item.content,
        resources: item.resources || [],
        created_at: item.created_at,
        created_by: item.created_by,
        updated_at: item.updated_at,
        updated_by: item.updated_by,
      };
      return lesson;
    }

    // Migrate from old format to new format
    const lessonType = item.type || 'video';
    const lesson: Lesson = {
      lesson_id: item.lesson_id,
      course_id: item.course_id,
      section_id: item.section_id,
      title: item.title,
      description: item.description,
      type: lessonType,
      order: item.order,
      required: item.required ?? true,
      created_at: item.created_at,
      created_by: item.created_by,
      updated_at: item.updated_at,
      updated_by: item.updated_by,
    };

    // Convert old video_media to new content structure
    if (item.video_media) {
      lesson.content = {
        kind: 'video',
        video_id: item.video_media.media_id || '',
        duration_seconds: item.estimated_duration_minutes ? item.estimated_duration_minutes * 60 : 0,
        transcript: item.transcript?.full_text,
      };
      // Add video_media to resources if it exists
      if (item.video_media.url) {
        lesson.resources = [{
          media_id: item.video_media.media_id,
          type: 'video',
          url: item.video_media.url,
          filename: item.video_media.filename,
          created_at: item.video_media.created_at || item.created_at,
          created_by: item.video_media.created_by || item.created_by,
        }];
      } else {
        lesson.resources = [];
      }
    } else {
      // Default content based on type
      switch (lessonType) {
        case 'reading':
          lesson.content = {
            kind: 'reading',
            format: 'markdown',
            markdown: item.markdown || '',
          };
          break;
        case 'quiz':
          lesson.content = {
            kind: 'quiz',
            questions: item.questions || [],
            passing_score_percent: item.passing_score_percent || 70,
            allow_retry: item.allow_retry || false,
            show_answers_after_submit: item.show_answers_after_submit || false,
          };
          break;
        case 'assignment':
          lesson.content = {
            kind: 'assignment',
            instructions_markdown: item.instructions_markdown || '',
            submission_type: item.submission_type || 'none',
            due_at: item.due_at,
          };
          break;
        case 'interactive':
          lesson.content = {
            kind: 'interactive',
            provider: 'embed',
            embed_url: item.embed_url || '',
            height_px: item.height_px || 600,
            allow_fullscreen: item.allow_fullscreen !== undefined ? item.allow_fullscreen : true,
          };
          break;
        default:
          lesson.content = {
            kind: 'video',
            video_id: '',
            duration_seconds: 0,
          };
      }
      lesson.resources = item.resources || [];
    }

    // Ensure resources is always an array
    if (!lesson.resources) {
      lesson.resources = [];
    }

    return lesson;
  }

  /**
   * Get lesson by course ID and lesson ID
   */
  async getLesson(courseId: string, lessonId: string): Promise<Lesson | null> {
    const command = new GetCommand({
      TableName: LMS_LESSONS_TABLE,
      Key: {
        course_id: courseId,
        lesson_id: lessonId,
      },
    });

    const { Item } = await dynamoDocClient.send(command);
    if (!Item) {
      return null;
    }
    return this.transformLesson(Item);
  }

  /**
   * Get lessons for a course
   */
  async getLessonsForCourse(courseId: string): Promise<Lesson[]> {
    const command = new QueryCommand({
      TableName: LMS_LESSONS_TABLE,
      KeyConditionExpression: 'course_id = :courseId',
      ExpressionAttributeValues: {
        ':courseId': courseId,
      },
    });

    const { Items = [] } = await dynamoDocClient.send(command);
    return Items.map((item) => this.transformLesson(item)).sort((a, b) => a.order - b.order);
  }

  /**
   * Upsert enrollment (idempotent)
   * 
   * Idempotency guarantee: Does NOT overwrite existing progress state.
   * If enrollment exists, returns existing record without modifying percent_complete, completed_at, or lesson_progress.
   */
  async upsertEnrollment(
    userId: string,
    courseId: string,
    origin: 'self_enrolled' | 'assigned' | 'required' | 'recommended'
  ): Promise<CourseProgress> {
    const now = new Date().toISOString();

    // Check if enrollment exists
    const existing = await this.getProgress(userId, courseId);

    if (existing) {
      // Idempotent: return existing enrollment WITHOUT modifying progress state
      // Only update last_accessed_at for activity tracking
      const command = new UpdateCommand({
        TableName: LMS_PROGRESS_TABLE,
        Key: {
          user_id: userId,
          SK: `COURSE#${courseId}`,
        },
        UpdateExpression: 'SET last_accessed_at = :lastAccessedAt, last_activity_at = :lastActivityAt',
        ExpressionAttributeValues: {
          ':lastAccessedAt': now,
          ':lastActivityAt': now,
        },
      });
      await dynamoDocClient.send(command);
      
      return {
        ...existing,
        last_accessed_at: now,
      };
    }

    // Create new enrollment
    const progress: CourseProgress = {
      user_id: userId,
      course_id: courseId,
      enrollment_origin: origin,
      enrolled_at: now,
      percent_complete: 0,
      completed: false,
      lesson_progress: {},
      last_accessed_at: now,
      updated_at: now,
    };

    const command = new PutCommand({
      TableName: LMS_PROGRESS_TABLE,
      Item: {
        user_id: userId,
        SK: `COURSE#${courseId}`,
        course_id: courseId,
        enrollment_origin: origin,
        enrolled_at: now,
        percent_complete: 0,
        completed: false,
        lesson_progress: {},
        last_activity_at: now,
        last_accessed_at: now,
        updated_at: now,
      },
    });

    await dynamoDocClient.send(command);
    return progress;
  }

  /**
   * Get progress for user and course
   */
  async getProgress(userId: string, courseId: string): Promise<CourseProgress | null> {
    // Query by PK=user_id, SK=COURSE#course_id
    const command = new GetCommand({
      TableName: LMS_PROGRESS_TABLE,
      Key: {
        user_id: userId,
        SK: `COURSE#${courseId}`,
      },
    });

    const { Item } = await dynamoDocClient.send(command);
    if (!Item) {
      return null;
    }

    return {
      user_id: Item.user_id,
      course_id: Item.course_id,
      enrollment_origin: Item.enrollment_origin,
      enrolled_at: Item.enrolled_at,
      percent_complete: Item.percent_complete || 0,
      completed: Item.completed || false,
      completed_at: Item.completed_at,
      lesson_progress: Item.lesson_progress || {},
      current_section_id: Item.current_section_id,
      current_lesson_id: Item.current_lesson_id,
      last_position_ms: Item.last_position_ms,
      started_at: Item.started_at,
      last_accessed_at: Item.last_accessed_at,
      updated_at: Item.updated_at,
    } as CourseProgress;
  }

  /**
   * Update progress (idempotent)
   * Returns progress, whether to emit progress event (rate-limited), and if lesson was just completed
   */
  async updateProgress(
    userId: string,
    courseId: string,
    update: {
      lesson_id: string;
      position_ms?: number;
      percent_complete?: number;
      completed?: boolean;
    }
  ): Promise<{
    progress: CourseProgress;
    shouldEmitProgressEvent: boolean;
    lessonCompleted: boolean;
  }> {
    const now = new Date().toISOString();
    const PROGRESS_EVENT_INTERVAL_MS = 30 * 1000; // 30 seconds

    // Get existing progress or create new enrollment
    let progress = await this.getProgress(userId, courseId);
    if (!progress) {
      progress = await this.upsertEnrollment(userId, courseId, 'self_enrolled');
    }

    // Update lesson progress
    const lessonProgress = progress.lesson_progress[update.lesson_id] || {
      lesson_id: update.lesson_id,
      percent_complete: 0,
      completed: false,
    };

    // Track if lesson was just completed (for telemetry)
    const wasAlreadyCompleted = lessonProgress.completed;
    let lessonCompleted = false;

    // Clamp percent 0-100 (idempotent: safe to retry)
    let percentComplete = Math.max(0, Math.min(100, update.percent_complete ?? lessonProgress.percent_complete));

    // Monotonic completion: once completed, stays completed (idempotent)
    if (update.completed === true && !lessonProgress.completed) {
      percentComplete = 100;
      lessonProgress.completed = true;
      lessonProgress.completed_at = now;
      lessonCompleted = true; // Lesson was just completed
    } else if (lessonProgress.completed) {
      // Already completed - maintain completion state
      percentComplete = 100;
      // Don't overwrite completed_at if already set
      if (!lessonProgress.completed_at) {
        lessonProgress.completed_at = now;
      }
    }

    if (update.percent_complete !== undefined) {
      // Clamp to 0-100
      lessonProgress.percent_complete = Math.max(0, Math.min(100, percentComplete));
    }

    if (update.position_ms !== undefined) {
      lessonProgress.current_position_ms = update.position_ms;
    }

    if (!lessonProgress.started_at) {
      lessonProgress.started_at = now;
    }

    lessonProgress.last_accessed_at = now;

    // Rate-limit progress telemetry: emit only if enough time has passed since last event
    // Track last_progress_event_at in lesson progress metadata (using a custom field)
    const lastProgressEventAt = (lessonProgress as any).last_progress_event_at as string | undefined;
    const shouldEmitProgressEvent =
      !lastProgressEventAt ||
      Date.now() - new Date(lastProgressEventAt).getTime() >= PROGRESS_EVENT_INTERVAL_MS ||
      lessonCompleted; // Always emit on completion

    if (shouldEmitProgressEvent) {
      // Store timestamp of this progress event
      (lessonProgress as any).last_progress_event_at = now;
    }

    // Update course-level progress
    progress.lesson_progress[update.lesson_id] = lessonProgress;
    progress.current_lesson_id = update.lesson_id;
    progress.last_position_ms = update.position_ms;
    progress.last_accessed_at = now;
    progress.updated_at = now;

    // Calculate course percent complete (average of lesson progress)
    const lessonProgresses = Object.values(progress.lesson_progress);
    if (lessonProgresses.length > 0) {
      const totalPercent = lessonProgresses.reduce(
        (sum, lp) => sum + (lp.percent_complete || 0),
        0
      );
      progress.percent_complete = Math.round(totalPercent / lessonProgresses.length);
    }

    // Check if course is completed (monotonic: once completed, stays completed)
    if (progress.percent_complete === 100 && !progress.completed) {
      progress.completed = true;
      progress.completed_at = now;
    } else if (progress.completed && !progress.completed_at) {
      // Ensure completed_at is set if already marked as completed
      progress.completed_at = now;
    }
    // Note: completed_at is never cleared once set (monotonic)

    // Update in DynamoDB
    // Build UpdateExpression conditionally to preserve completed_at if already set
    const updateExpressions: string[] = [
      'SET lesson_progress = :lessonProgress',
      'percent_complete = :percentComplete',
      'completed = :completed',
      'current_lesson_id = :currentLessonId',
      'last_position_ms = :lastPositionMs',
      'last_activity_at = :lastActivityAt',
      'last_accessed_at = :lastAccessedAt',
      'updated_at = :updatedAt',
    ];

    const expressionValues: Record<string, any> = {
      ':lessonProgress': progress.lesson_progress,
      ':percentComplete': progress.percent_complete,
      ':completed': progress.completed,
      ':currentLessonId': progress.current_lesson_id || null,
      ':lastPositionMs': progress.last_position_ms || null,
      ':lastActivityAt': progress.last_accessed_at,
      ':lastAccessedAt': progress.last_accessed_at,
      ':updatedAt': progress.updated_at,
    };

    // Only set completed_at if it's being set for the first time (monotonic)
    if (progress.completed_at && !progress.lesson_progress[update.lesson_id]?.completed_at) {
      updateExpressions.push('completed_at = :completedAt');
      expressionValues[':completedAt'] = progress.completed_at;
    }

    const command = new UpdateCommand({
      TableName: LMS_PROGRESS_TABLE,
      Key: {
        user_id: userId,
        SK: `COURSE#${courseId}`,
      },
      UpdateExpression: updateExpressions.join(', '),
      ExpressionAttributeValues: expressionValues,
    });

    await dynamoDocClient.send(command);
    return {
      progress,
      shouldEmitProgressEvent,
      lessonCompleted,
    };
  }

  /**
   * List user assignments
   */
  async listUserAssignments(userId: string): Promise<AssignmentSummary[]> {
    const command = new QueryCommand({
      TableName: LMS_ASSIGNMENTS_TABLE,
      KeyConditionExpression: 'assignee_user_id = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      ScanIndexForward: false, // Descending order
    });

    const { Items = [] } = await dynamoDocClient.send(command);
    return (Items as Assignment[]).map(this.toAssignmentSummary);
  }

  /**
   * List user issued certificates
   * Uses IssuedCertificatesByUserIndex GSI for efficient querying
   */
  async listUserIssuedCertificates(userId: string): Promise<CertificateSummary[]> {
    // Use IssuedCertificatesByUserIndex GSI (PK=user_id, SK=issued_at)
    const command = new QueryCommand({
      TableName: LMS_CERTIFICATES_TABLE,
      IndexName: 'IssuedCertificatesByUserIndex',
      KeyConditionExpression: 'user_id = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      ScanIndexForward: false, // Descending order (newest first)
      Limit: 200, // Pagination guard for MVP
    });

    const { Items = [] } = await dynamoDocClient.send(command);
    return (Items as IssuedCertificate[]).map(this.toCertificateSummary);
  }

  /**
   * Convert Course to CourseSummary
   */
  private toCourseSummary(course: Course): CourseSummary {
    return {
      course_id: course.course_id,
      title: course.title,
      short_description: course.short_description,
      cover_image_url: course.cover_image?.url,
      product: course.product, // Was product_suite
      product_suite: course.product_suite, // Was product_concept
      topic_tags: course.topic_tags || [],
      estimated_duration_minutes: course.estimated_duration_minutes,
      estimated_minutes: course.estimated_minutes,
      difficulty_level: course.difficulty_level,
      status: course.status,
      published_at: course.published_at,
    };
  }

  /**
   * Convert LearningPath to LearningPathSummary
   */
  private toPathSummary(path: LearningPath): LearningPathSummary {
    return {
      path_id: path.path_id,
      title: path.title,
      short_description: path.short_description,
      product: path.product, // Was product_suite
      product_suite: path.product_suite, // Was product_concept
      topic_tags: path.topic_tags || [],
      estimated_duration_minutes: path.estimated_duration_minutes,
      course_count: path.courses?.length || 0,
      status: path.status,
      published_at: path.published_at,
    };
  }

  /**
   * Convert Assignment to AssignmentSummary
   * Maps DynamoDB item (with assignee_user_id) to domain AssignmentSummary
   * Overdue is computed: due_at < now && status not in [completed, waived]
   */
  private toAssignmentSummary(item: any): AssignmentSummary {
    // Compute overdue: due_at < now && status not completed/waived
    const terminalStates = ['completed', 'waived'];
    const isOverdue = item.due_at 
      ? new Date(item.due_at) < new Date() && !terminalStates.includes(item.status)
      : false;

    return {
      assignment_id: item.assignment_id,
      assignment_type: item.assignment_type,
      course_id: item.course_id,
      path_id: item.path_id,
      title: '', // Will be hydrated by handler
      status: item.status,
      due_at: item.due_at,
      assigned_at: item.assigned_at,
      progress_percent: 0, // Will be hydrated by handler
      is_overdue: isOverdue,
    };
  }

  /**
   * Convert IssuedCertificate to CertificateSummary
   */
  private toCertificateSummary(cert: IssuedCertificate): CertificateSummary {
    return {
      certificate_id: cert.certificate_id,
      template_id: cert.template_id,
      template_name: cert.template_id, // Will be hydrated with template name if available
      recipient_name: cert.certificate_data.recipient_name,
      course_title: cert.certificate_data.course_title,
      path_title: cert.certificate_data.path_title,
      completion_date: cert.certificate_data.completion_date,
      issued_at: cert.issued_at,
      badge_text: cert.certificate_data.badge_text,
    };
  }

  // ============================================================================
  // CERTIFICATE TEMPLATE METHODS
  // ============================================================================

  /**
   * List certificate templates
   * Uses TemplatesByUpdatedIndex GSI for efficient querying
   */
  async listCertificateTemplates(): Promise<CertificateTemplateSummary[]> {
    // Query TEMPLATE entity_type using TemplatesByUpdatedIndex GSI
    const command = new QueryCommand({
      TableName: LMS_CERTIFICATES_TABLE,
      IndexName: 'TemplatesByUpdatedIndex',
      KeyConditionExpression: 'entity_type = :entityType',
      ExpressionAttributeValues: {
        ':entityType': 'TEMPLATE',
      },
      ScanIndexForward: false, // Descending order (newest first)
      Limit: 200, // Pagination guard for MVP
    });

    const { Items = [] } = await dynamoDocClient.send(command);
    return (Items as any[]).map(this.toCertificateTemplateSummary);
  }

  /**
   * Get certificate template by ID
   */
  async getCertificateTemplate(templateId: string): Promise<CertificateTemplate | null> {
    const command = new GetCommand({
      TableName: LMS_CERTIFICATES_TABLE,
      Key: {
        entity_type: 'TEMPLATE',
        SK: templateId,
      },
    });

    const { Item } = await dynamoDocClient.send(command);
    if (!Item) {
      return null;
    }

    return this.fromDynamoCertificateTemplate(Item);
  }

  /**
   * Create certificate template
   */
  async createCertificateTemplate(template: CertificateTemplate): Promise<void> {
    const item = this.toDynamoCertificateTemplate(template);
    const command = new PutCommand({
      TableName: LMS_CERTIFICATES_TABLE,
      Item: item,
    });
    await dynamoDocClient.send(command);
  }

  /**
   * Update certificate template
   */
  async updateCertificateTemplate(
    templateId: string,
    updates: Partial<CertificateTemplate>
  ): Promise<CertificateTemplate> {
    const now = new Date().toISOString();
    
    // Get existing template
    const existing = await this.getCertificateTemplate(templateId);
    if (!existing) {
      throw new Error(`Certificate template ${templateId} not found`);
    }

    // Merge updates
    const updated: CertificateTemplate = {
      ...existing,
      ...updates,
      updated_at: now,
    };

    // Save updated template
    const item = this.toDynamoCertificateTemplate(updated);
    const command = new PutCommand({
      TableName: LMS_CERTIFICATES_TABLE,
      Item: item,
    });
    await dynamoDocClient.send(command);

    return updated;
  }

  /**
   * Publish certificate template
   */
  async publishCertificateTemplate(templateId: string): Promise<CertificateTemplate> {
    const now = new Date().toISOString();
    return this.updateCertificateTemplate(templateId, {
      status: 'published',
      published_at: now,
    });
  }

  /**
   * Archive certificate template
   */
  async archiveCertificateTemplate(templateId: string): Promise<CertificateTemplate> {
    return this.updateCertificateTemplate(templateId, {
      status: 'archived',
    });
  }

  /**
   * Get published certificate templates for a course or path
   */
  async getPublishedTemplatesForTarget(
    appliesTo: 'course' | 'path',
    appliesToId: string
  ): Promise<CertificateTemplate[]> {
    // Query all published templates and filter client-side (MVP approach)
    // In production, could add GSI with applies_to + applies_to_id
    const command = new QueryCommand({
      TableName: LMS_CERTIFICATES_TABLE,
      IndexName: 'TemplatesByUpdatedIndex',
      KeyConditionExpression: 'entity_type = :entityType',
      FilterExpression: '#status = :status AND applies_to = :appliesTo AND applies_to_id = :appliesToId',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':entityType': 'TEMPLATE',
        ':status': 'published',
        ':appliesTo': appliesTo,
        ':appliesToId': appliesToId,
      },
    });

    const { Items = [] } = await dynamoDocClient.send(command);
    return Items.map((item: any) => this.fromDynamoCertificateTemplate(item));
  }

  /**
   * Convert CertificateTemplate to DynamoDB item
   */
  private toDynamoCertificateTemplate(template: CertificateTemplate): any {
    return {
      entity_type: 'TEMPLATE',
      SK: template.template_id,
      ...template,
      updated_at: template.updated_at, // For GSI sort key
    };
  }

  /**
   * Convert DynamoDB item to CertificateTemplate
   */
  private fromDynamoCertificateTemplate(item: any): CertificateTemplate {
    const { entity_type, SK, ...template } = item;
    return template as CertificateTemplate;
  }

  /**
   * Convert CertificateTemplate to CertificateTemplateSummary
   */
  private toCertificateTemplateSummary(item: any): CertificateTemplateSummary {
    const template = this.fromDynamoCertificateTemplate(item);
    return {
      template_id: template.template_id,
      name: template.name,
      description: template.description,
      status: template.status,
      applies_to: template.applies_to,
      applies_to_id: template.applies_to_id,
      created_at: template.created_at,
      updated_at: template.updated_at,
      published_at: template.published_at,
    };
  }

  // ============================================================================
  // ISSUED CERTIFICATE METHODS
  // ============================================================================

  /**
   * Get issued certificate by ID
   */
  async getIssuedCertificate(certificateId: string, userId: string): Promise<IssuedCertificate | null> {
    // Certificate ID format: issued_at#certificate_id
    // We need to query by user_id first, then filter by certificate_id
    const command = new QueryCommand({
      TableName: LMS_CERTIFICATES_TABLE,
      IndexName: 'IssuedCertificatesByUserIndex',
      KeyConditionExpression: 'user_id = :userId',
      FilterExpression: 'contains(SK, :certId)',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':certId': certificateId,
      },
    });

    const { Items = [] } = await dynamoDocClient.send(command);
    if (Items.length === 0) {
      return null;
    }

    return this.fromDynamoIssuedCertificate(Items[0]);
  }

  /**
   * Issue certificate (idempotent)
   * Returns the certificate if it already exists, or creates a new one
   */
  async issueCertificate(
    userId: string,
    templateId: string,
    completionType: 'course' | 'path',
    courseId: string | undefined,
    pathId: string | undefined,
    certificateData: {
      recipient_name: string;
      course_title?: string;
      path_title?: string;
      completion_date: string;
      badge_text: string;
      signatory_name?: string;
      signatory_title?: string;
      issued_copy: {
        title: string;
        body: string;
      };
    }
  ): Promise<{ certificate: IssuedCertificate; isNew: boolean }> {
    const now = new Date().toISOString();
    
    // Generate deterministic certificate_id for idempotency using hash
    // Hash ensures consistent length and avoids special characters
    const targetId = completionType === 'course' ? courseId : pathId;
    if (!targetId) {
      throw new Error(`targetId required for completionType ${completionType}`);
    }
    const idString = `${userId}|${templateId}|${completionType}|${targetId}`;
    const hash = createHash('sha256').update(idString).digest('hex').substring(0, 16);
    const certificateId = `cert_${hash}`;
    
    // Check if certificate already exists (optimistic check before conditional put)
    const existing = await this.getIssuedCertificate(certificateId, userId);
    if (existing) {
      return { certificate: existing, isNew: false };
    }

    // Create new certificate
    const certificate: IssuedCertificate = {
      certificate_id: certificateId,
      user_id: userId,
      template_id: templateId,
      issued_at: now,
      issued_by: 'system',
      completion_type: completionType,
      course_id: courseId,
      path_id: pathId,
      certificate_data: certificateData,
      created_at: now,
    };

    const item = this.toDynamoIssuedCertificate(certificate);
    const command = new PutCommand({
      TableName: LMS_CERTIFICATES_TABLE,
      Item: item,
      ConditionExpression: 'attribute_not_exists(entity_type) AND attribute_not_exists(SK)', // Idempotency check on PK+SK
    });

    try {
      await dynamoDocClient.send(command);
      return { certificate, isNew: true };
    } catch (error: any) {
      // If certificate already exists (ConditionalCheckFailedException), fetch and return it
      if (error.name === 'ConditionalCheckFailedException') {
        const existingCert = await this.getIssuedCertificate(certificateId, userId);
        if (existingCert) {
          return { certificate: existingCert, isNew: false };
        }
      }
      throw error;
    }
  }

  /**
   * Convert IssuedCertificate to DynamoDB item
   */
  private toDynamoIssuedCertificate(cert: IssuedCertificate): any {
    return {
      entity_type: `ISSUED#${cert.user_id}`,
      SK: `${cert.issued_at}#${cert.certificate_id}`,
      ...cert,
      // Ensure GSI attributes are present
      user_id: cert.user_id,
      issued_at: cert.issued_at,
    };
  }

  /**
   * Convert DynamoDB item to IssuedCertificate
   */
  private fromDynamoIssuedCertificate(item: any): IssuedCertificate {
    const { entity_type, SK, ...cert } = item;
    return cert as IssuedCertificate;
  }

  // ============================================================================
  // ADMIN METHODS
  // ============================================================================

  /**
   * Create a course draft
   */
  async createCourseDraft(course: Course): Promise<void> {
    const command = new PutCommand({
      TableName: LMS_COURSES_TABLE,
      Item: course,
    });
    await dynamoDocClient.send(command);
  }

  /**
   * Update course draft
   */
  async updateCourseDraft(
    courseId: string,
    userId: string,
    updates: Partial<Pick<Course, 'title' | 'description' | 'short_description' | 'product' | 'product_suite' | 'topic_tags' | 'product_id' | 'product_suite_id' | 'topic_tag_ids' | 'badges' | 'badge_ids' | 'cover_image' | 'estimated_minutes'>>
  ): Promise<Course> {
    const now = new Date().toISOString();
    
    // Get existing course
    const existing = await this.getCourseDraftOrPublished(courseId);
    if (!existing) {
      throw new Error(`Course ${courseId} not found`);
    }
    
    if (existing.status === 'published') {
      throw new Error('Cannot update published course. Edit the draft instead.');
    }
    
    // Merge updates
    const updated: Course = {
      ...existing,
      ...updates,
      updated_at: now,
      updated_by: userId,
    };
    
    const command = new PutCommand({
      TableName: LMS_COURSES_TABLE,
      Item: updated,
    });
    await dynamoDocClient.send(command);
    
    return updated;
  }

  /**
   * Update course lessons and sections (bulk)
   */
  async updateCourseLessons(
    courseId: string,
    userId: string,
    sections: Array<{ section_id: string; title: string; order: number; lesson_ids: string[] }>,
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
        [key: string]: any; // Allow type-specific fields
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
    }>
  ): Promise<void> {
    const now = new Date().toISOString();
    
    // Get existing course
    const course = await this.getCourseDraftOrPublished(courseId);
    if (!course) {
      throw new Error(`Course ${courseId} not found`);
    }
    
    if (course.status === 'published') {
      throw new Error('Cannot update published course lessons. Edit the draft instead.');
    }
    
    // Update course sections
    course.sections = sections.map((s) => ({
      section_id: s.section_id,
      title: s.title,
      order: s.order,
      lesson_ids: s.lesson_ids,
    }));
    
    // Save course with updated sections
    course.updated_at = now;
    course.updated_by = userId;
    const courseCommand = new PutCommand({
      TableName: LMS_COURSES_TABLE,
      Item: course,
    });
    await dynamoDocClient.send(courseCommand);
    
    // Save/update lessons
    for (const lessonData of lessons) {
      const lesson: Lesson = {
        lesson_id: lessonData.lesson_id,
        course_id: courseId,
        section_id: lessonData.section_id,
        title: lessonData.title,
        description: lessonData.description,
        type: lessonData.type,
        order: lessonData.order,
        required: lessonData.required ?? true,
        content: lessonData.content as any, // Type assertion needed due to discriminated union
        resources: lessonData.resources?.map((r) => ({
          media_id: r.media_id,
          type: r.type,
          url: r.url,
          filename: r.filename,
          created_at: r.created_at,
          created_by: r.created_by,
        })),
        created_at: now,
        created_by: userId,
        updated_at: now,
        updated_by: userId,
      };
      
      const lessonCommand = new PutCommand({
        TableName: LMS_LESSONS_TABLE,
        Item: lesson,
      });
      await dynamoDocClient.send(lessonCommand);
    }
  }

  /**
   * Publish course draft (create immutable published snapshot)
   */
  async publishCourse(courseId: string, userId: string): Promise<Course> {
    const now = new Date().toISOString();
    
    // Get draft
    const draft = await this.getCourseDraftOrPublished(courseId);
    if (!draft) {
      throw new Error(`Course ${courseId} not found`);
    }
    
    if (draft.status === 'published') {
      throw new Error('Course is already published');
    }
    
    // Create published snapshot
    const published: Course = {
      ...draft,
      status: 'published',
      version: (draft.version || 0) + 1,
      published_at: now,
      published_by: userId,
      updated_at: now,
      updated_by: userId,
    };
    
    // Save published version (overwrites draft with published status)
    // For MVP, we store latest published in same item
    // Future: could archive previous versions
    const command = new PutCommand({
      TableName: LMS_COURSES_TABLE,
      Item: published,
    });
    await dynamoDocClient.send(command);
    
    return published;
  }

  /**
   * Create a path draft
   */
  async createPathDraft(path: LearningPath): Promise<void> {
    const command = new PutCommand({
      TableName: LMS_PATHS_TABLE,
      Item: path,
    });
    await dynamoDocClient.send(command);
  }

  /**
   * Update path draft
   */
  async updatePathDraft(
    pathId: string,
    userId: string,
    updates: Partial<Pick<LearningPath, 'title' | 'description' | 'short_description' | 'product' | 'product_suite' | 'topic_tags' | 'badges'>> & {
      courses?: Array<{ course_id: string; order: number; required?: boolean; title_override?: string }>;
    }
  ): Promise<LearningPath> {
    const now = new Date().toISOString();
    
    // Get existing path
    const existing = await this.getPathById(pathId, false);
    if (!existing) {
      throw new Error(`Path ${pathId} not found`);
    }
    
    if (existing.status === 'published') {
      throw new Error('Cannot update published path. Edit the draft instead.');
    }
    
    // Merge updates
    const updated: LearningPath = {
      ...existing,
      title: updates.title ?? existing.title,
      description: updates.description ?? existing.description,
      short_description: updates.short_description ?? existing.short_description,
      product: updates.product ?? existing.product,
      product_suite: updates.product_suite ?? existing.product_suite,
      topic_tags: updates.topic_tags ?? existing.topic_tags,
      badges: updates.badges ?? existing.badges,
      courses: updates.courses 
        ? updates.courses.map((c) => ({
            course_id: c.course_id,
            order: c.order,
            required: c.required ?? true,
            title_override: c.title_override,
          }))
        : existing.courses,
      updated_at: now,
      updated_by: userId,
    };
    
    const command = new PutCommand({
      TableName: LMS_PATHS_TABLE,
      Item: updated,
    });
    await dynamoDocClient.send(command);
    
    return updated;
  }

  /**
   * Publish path draft (create immutable published snapshot)
   */
  async publishPath(pathId: string, userId: string): Promise<LearningPath> {
    const now = new Date().toISOString();
    
    // Get draft
    const draft = await this.getPathById(pathId, false);
    if (!draft) {
      throw new Error(`Path ${pathId} not found`);
    }
    
    if (draft.status === 'published') {
      throw new Error('Path is already published');
    }
    
    // Create published snapshot
    const published: LearningPath = {
      ...draft,
      status: 'published',
      version: (draft.version || 0) + 1,
      published_at: now,
      published_by: userId,
      updated_at: now,
      updated_by: userId,
    };
    
    // Save published version
    const command = new PutCommand({
      TableName: LMS_PATHS_TABLE,
      Item: published,
    });
    await dynamoDocClient.send(command);
    
    // Sync reverse index: course_id -> paths mapping
    const courseIds = (published.courses || []).map((c) => c.course_id);
    await this.syncCoursePathMappingsForPublishedPath(pathId, courseIds);
    
    return published;
  }

  /**
   * Upsert a course-to-path mapping item
   * Used for reverse index: course_id -> path_id lookup
   */
  async upsertCoursePathMapping(
    courseId: string,
    pathId: string,
    status: 'published' | 'draft' = 'published',
    nowIso?: string
  ): Promise<void> {
    const now = nowIso || new Date().toISOString();
    const SYSTEM_USER_ID = '__SYSTEM__';
    
    const mappingItem = {
      user_id: SYSTEM_USER_ID,
      SK: `COURSEPATH#COURSE#${courseId}#PATH#${pathId}`,
      entity_type: 'lms_course_paths',
      course_id: courseId, // For GSI partition key
      last_activity_at: now, // For GSI sort key (required)
      path_id: pathId,
      path_status: status,
      updated_at: now,
    };
    
    const putCommand = new PutCommand({
      TableName: LMS_PROGRESS_TABLE,
      Item: mappingItem,
    });
    await dynamoDocClient.send(putCommand);
  }

  /**
   * Delete a course-to-path mapping item
   */
  async deleteCoursePathMapping(courseId: string, pathId: string): Promise<void> {
    const SYSTEM_USER_ID = '__SYSTEM__';
    
    const deleteCommand = new DeleteCommand({
      TableName: LMS_PROGRESS_TABLE,
      Key: {
        user_id: SYSTEM_USER_ID,
        SK: `COURSEPATH#COURSE#${courseId}#PATH#${pathId}`,
      },
    });
    
    try {
      await dynamoDocClient.send(deleteCommand);
    } catch (error: any) {
      // Log but don't fail if item doesn't exist
      console.warn(`Failed to delete course-path mapping: ${error.message}`);
    }
  }

  /**
   * Sync course-to-path reverse index mappings
   * Creates/deletes mapping items when path is published or course_refs change
   * Mapping items stored in LMS_PROGRESS_TABLE (reusing existing GSI) with:
   * - user_id: SYSTEM (special system user)
   * - SK: COURSEPATH#COURSE#{course_id}#PATH#{path_id}
   * - course_id: for GSI lookup
   */
  async syncCoursePathMappingsForPublishedPath(
    pathId: string,
    newCourseIds: string[]
  ): Promise<void> {
    const now = new Date().toISOString();
    
    // Get existing mappings for this path
    const existingMappings = await this.listCoursePathMappingsForPath(pathId);
    const existingCourseIds = new Set(existingMappings.map((m) => m.course_id));
    const newCourseIdsSet = new Set(newCourseIds);
    
    // Delete mappings for courses no longer in path
    for (const mapping of existingMappings) {
      if (!newCourseIdsSet.has(mapping.course_id)) {
        await this.deleteCoursePathMapping(mapping.course_id, pathId);
      }
    }
    
    // Create/update mappings for courses in path
    for (const courseId of newCourseIds) {
      await this.upsertCoursePathMapping(courseId, pathId, 'published', now);
    }
  }

  /**
   * List course-to-path mappings for a specific path (helper for sync)
   * Only called during publish operation (not hot path)
   */
  private async listCoursePathMappingsForPath(pathId: string): Promise<Array<{ course_id: string; path_id: string }>> {
    const SYSTEM_USER_ID = '__SYSTEM__';
    const mappings: Array<{ course_id: string; path_id: string }> = [];
    
    // Get path to know which courses to check
    const path = await this.getPathById(pathId, false);
    if (!path) return mappings;
    
    // Query mappings for each course in path (bounded by number of courses in path)
    for (const courseRef of path.courses || []) {
      const mappingCommand = new GetCommand({
        TableName: LMS_PROGRESS_TABLE,
        Key: {
          user_id: SYSTEM_USER_ID,
          SK: `COURSEPATH#COURSE#${courseRef.course_id}#PATH#${pathId}`,
        },
      });
      
      try {
        const { Item } = await dynamoDocClient.send(mappingCommand);
        if (Item && Item.entity_type === 'lms_course_paths' && Item.path_id === pathId) {
          mappings.push({
            course_id: Item.course_id,
            path_id: Item.path_id,
          });
        }
      } catch (error) {
        // Item doesn't exist, skip
      }
    }
    
    return mappings;
  }

  /**
   * List published path IDs for a course (using reverse index via GSI, no scan)
   */
  async listPublishedPathIdsForCourse(
    courseId: string,
    limit: number = 200
  ): Promise<string[]> {
    const guardLimit = Math.min(limit, 200); // Pagination guard
    const SYSTEM_USER_ID = '__SYSTEM__';
    
    // Use CourseProgressByCourseIndex GSI to query by course_id
    const command = new QueryCommand({
      TableName: LMS_PROGRESS_TABLE,
      IndexName: 'CourseProgressByCourseIndex',
      KeyConditionExpression: 'course_id = :courseId',
      FilterExpression: 'entity_type = :entityType AND #pathStatus = :pathStatus',
      ExpressionAttributeNames: {
        '#pathStatus': 'path_status',
      },
      ExpressionAttributeValues: {
        ':courseId': courseId,
        ':entityType': 'lms_course_paths',
        ':pathStatus': 'published',
      },
      Limit: guardLimit,
    });
    
    const { Items = [] } = await dynamoDocClient.send(command);
    return Items.map((item: any) => item.path_id).filter(Boolean);
  }

  /**
   * Get published paths that contain a course (using reverse index, no scan)
   */
  async getPublishedPathsForCourse(courseId: string): Promise<LearningPath[]> {
    const pathIds = await this.listPublishedPathIdsForCourse(courseId);
    
    const paths: LearningPath[] = [];
    for (const pathId of pathIds) {
      const path = await this.getPathById(pathId, true);
      if (path && path.status === 'published') {
        paths.push(path);
      }
    }
    
    return paths;
  }

  // ============================================================================
  // PATH PROGRESS METHODS
  // ============================================================================

  /**
   * Get path progress for user
   */
  async getUserPathProgress(userId: string, pathId: string): Promise<PathProgress | null> {
    const command = new GetCommand({
      TableName: LMS_PROGRESS_TABLE,
      Key: {
        user_id: userId,
        SK: `PATH#${pathId}`,
      },
    });

    const { Item } = await dynamoDocClient.send(command);
    if (!Item) {
      return null;
    }

    return {
      user_id: Item.user_id,
      path_id: Item.path_id,
      enrollment_origin: Item.enrollment_origin,
      enrolled_at: Item.enrolled_at,
      total_courses: Item.total_courses || 0,
      completed_courses: Item.completed_courses || 0,
      percent_complete: Item.percent_complete || 0,
      status: Item.status || 'not_started',
      completed: Item.completed || false,
      completed_at: Item.completed_at,
      next_course_id: Item.next_course_id,
      started_at: Item.started_at,
      last_activity_at: Item.last_activity_at,
      updated_at: Item.updated_at,
    } as PathProgress;
  }

  /**
   * List user's path progress
   */
  async listUserPathProgress(
    userId: string,
    params: { limit?: number; cursor?: string }
  ): Promise<{ items: PathProgress[]; next_cursor?: string }> {
    const limit = Math.min(params.limit || 50, 200); // Pagination guard

    const command = new QueryCommand({
      TableName: LMS_PROGRESS_TABLE,
      KeyConditionExpression: 'user_id = :userId AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':skPrefix': 'PATH#',
      },
      Limit: limit,
      ...(params.cursor && {
        ExclusiveStartKey: JSON.parse(Buffer.from(params.cursor, 'base64').toString()),
      }),
    });

    const { Items = [], LastEvaluatedKey } = await dynamoDocClient.send(command);
    const progressItems = Items.map((Item: any) => ({
      user_id: Item.user_id,
      path_id: Item.path_id,
      enrollment_origin: Item.enrollment_origin,
      enrolled_at: Item.enrolled_at,
      total_courses: Item.total_courses || 0,
      completed_courses: Item.completed_courses || 0,
      percent_complete: Item.percent_complete || 0,
      status: Item.status || 'not_started',
      completed: Item.completed || false,
      completed_at: Item.completed_at,
      next_course_id: Item.next_course_id,
      started_at: Item.started_at,
      last_activity_at: Item.last_activity_at,
      updated_at: Item.updated_at,
    })) as PathProgress[];

    const nextCursor = LastEvaluatedKey
      ? Buffer.from(JSON.stringify(LastEvaluatedKey)).toString('base64')
      : undefined;

    return {
      items: progressItems,
      ...(nextCursor && { next_cursor: nextCursor }),
    };
  }

  /**
   * Upsert path progress (idempotent)
   */
  async upsertUserPathProgress(progress: PathProgress): Promise<void> {
    const command = new PutCommand({
      TableName: LMS_PROGRESS_TABLE,
      Item: {
        user_id: progress.user_id,
        SK: `PATH#${progress.path_id}`,
        path_id: progress.path_id,
        enrollment_origin: progress.enrollment_origin,
        enrolled_at: progress.enrolled_at,
        total_courses: progress.total_courses,
        completed_courses: progress.completed_courses,
        percent_complete: progress.percent_complete,
        status: progress.status,
        completed: progress.completed,
        completed_at: progress.completed_at,
        next_course_id: progress.next_course_id,
        started_at: progress.started_at,
        last_activity_at: progress.last_activity_at,
        updated_at: progress.updated_at,
      },
    });

    await dynamoDocClient.send(command);
  }

  /**
   * Create assignment
   */
  async createAssignment(assignment: Assignment): Promise<void> {
    const command = new PutCommand({
      TableName: LMS_ASSIGNMENTS_TABLE,
      Item: {
        assignee_user_id: assignment.user_id,
        SK: `ASSIGNMENT#${assignment.assigned_at}#${assignment.assignment_id}`,
        ...assignment,
      },
    });
    await dynamoDocClient.send(command);
  }

  /**
   * List assignments (admin)
   */
  async listAdminAssignments(params: {
    assignee_user_id?: string;
    status?: string;
  }): Promise<Assignment[]> {
    if (params.assignee_user_id) {
      // Query by user
      const command = new QueryCommand({
        TableName: LMS_ASSIGNMENTS_TABLE,
        KeyConditionExpression: 'assignee_user_id = :userId',
        ExpressionAttributeValues: {
          ':userId': params.assignee_user_id,
        },
        ...(params.status && {
          FilterExpression: '#status = :status',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':userId': params.assignee_user_id,
            ':status': params.status,
          },
        }),
        ScanIndexForward: false,
      });
      
      const { Items = [] } = await dynamoDocClient.send(command);
      return Items.map((item: any) => ({
        assignment_id: item.assignment_id,
        user_id: item.user_id || item.assignee_user_id,
        assignment_type: item.assignment_type,
        course_id: item.course_id,
        path_id: item.path_id,
        status: item.status,
        due_at: item.due_at,
        assigned_by: item.assigned_by || item.assigned_by_user_id,
        assigned_at: item.assigned_at,
        waived_by: item.waived_by,
        waived_at: item.waived_at,
        started_at: item.started_at,
        completed_at: item.completed_at,
        updated_at: item.updated_at,
        // Include SK for waive operations
        _sk: item.SK,
        _assignee_user_id: item.assignee_user_id,
      })) as Assignment[];
    }
    
    // Scan all (for MVP)
    const command = new ScanCommand({
      TableName: LMS_ASSIGNMENTS_TABLE,
      ...(params.status && {
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': params.status },
      }),
    });
    
    const { Items = [] } = await dynamoDocClient.send(command);
    return Items.map((item: any) => ({
      assignment_id: item.assignment_id,
      user_id: item.user_id || item.assignee_user_id,
      assignment_type: item.assignment_type,
      course_id: item.course_id,
      path_id: item.path_id,
      status: item.status,
      due_at: item.due_at,
      assigned_by: item.assigned_by || item.assigned_by_user_id,
      assigned_at: item.assigned_at,
      waived_by: item.waived_by,
      waived_at: item.waived_at,
      started_at: item.started_at,
      completed_at: item.completed_at,
      updated_at: item.updated_at,
    })) as Assignment[];
  }

  /**
   * Waive assignment by PK+SK (efficient lookup)
   */
  async waiveAssignment(assigneeUserId: string, sk: string, userId: string): Promise<Assignment> {
    const now = new Date().toISOString();
    
    // Get existing assignment
    const getCommand = new GetCommand({
      TableName: LMS_ASSIGNMENTS_TABLE,
      Key: {
        assignee_user_id: assigneeUserId,
        SK: sk,
      },
    });
    
    const { Item } = await dynamoDocClient.send(getCommand);
    if (!Item) {
      throw new Error(`Assignment not found for user ${assigneeUserId} with SK ${sk}`);
    }
    
    const item = Item as any;
    const assignment: Assignment = {
      assignment_id: item.assignment_id,
      user_id: item.user_id || item.assignee_user_id,
      assignment_type: item.assignment_type,
      course_id: item.course_id,
      path_id: item.path_id,
      status: 'waived',
      due_at: item.due_at,
      assigned_by: item.assigned_by || item.assigned_by_user_id,
      assigned_at: item.assigned_at,
      waived_by: userId,
      waived_at: now,
      started_at: item.started_at,
      completed_at: item.completed_at,
      updated_at: now,
    };
    
    // Update assignment
    const updateCommand = new PutCommand({
      TableName: LMS_ASSIGNMENTS_TABLE,
      Item: {
        assignee_user_id: assigneeUserId,
        SK: sk,
        ...assignment,
      },
    });
    await dynamoDocClient.send(updateCommand);
    
    return assignment;
  }

  /**
   * Update lesson transcript
   * Updates only the transcript field in lesson content, preserving other data
   */
  async updateLessonTranscript(lessonId: string, transcript: string): Promise<void> {
    // First, get the lesson to preserve all other fields
    const lesson = await this.getLesson('', lessonId); // courseId not needed for GetItem
    if (!lesson) {
      throw new Error(`Lesson not found: ${lessonId}`);
    }

    // Update only the transcript field in content
    if (lesson.content.kind === 'video') {
      lesson.content.transcript = transcript;
      lesson.content.transcript_status = 'complete';
    } else {
      throw new Error(`Lesson ${lessonId} is not a video lesson`);
    }

    // Save updated lesson
    const command = new PutCommand({
      TableName: LMS_LESSONS_TABLE,
      Item: lesson,
    });
    await dynamoDocClient.send(command);
  }

  /**
   * Create transcript record
   */
  async createTranscript(transcript: Transcript): Promise<void> {
    const command = new PutCommand({
      TableName: LMS_TRANSCRIPTS_TABLE,
      Item: {
        transcript_id: transcript.transcript_id,
        lesson_id: transcript.lesson_id,
        video_media_id: transcript.video_media_id,
        segments: transcript.segments,
        full_text: transcript.full_text,
        language: transcript.language || 'en',
        created_at: transcript.created_at,
        created_by: transcript.created_by,
        updated_at: transcript.updated_at,
        // GSI key
        'lesson_id#created_at': `${transcript.lesson_id}#${transcript.created_at}`,
      },
    });
    await dynamoDocClient.send(command);
  }

  /**
   * Get transcript by lesson ID
   * Returns the most recent transcript for a lesson
   */
  async getTranscriptByLessonId(lessonId: string): Promise<Transcript | null> {
    const command = new QueryCommand({
      TableName: LMS_TRANSCRIPTS_TABLE,
      IndexName: 'by_lesson_id',
      KeyConditionExpression: 'lesson_id = :lessonId',
      ExpressionAttributeValues: {
        ':lessonId': lessonId,
      },
      ScanIndexForward: false, // Descending order (most recent first)
      Limit: 1,
    });

    const { Items = [] } = await dynamoDocClient.send(command);
    if (Items.length === 0) {
      return null;
    }

    const item = Items[0] as any;
    return {
      transcript_id: item.transcript_id,
      lesson_id: item.lesson_id,
      video_media_id: item.video_media_id,
      segments: item.segments,
      full_text: item.full_text,
      language: item.language || 'en',
      created_at: item.created_at,
      created_by: item.created_by,
      updated_at: item.updated_at,
    };
  }
}

// Export singleton instance
export const lmsRepo = new LmsRepo();
