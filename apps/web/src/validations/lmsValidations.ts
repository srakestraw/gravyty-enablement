/**
 * LMS Validation Helpers
 * 
 * Client-side validation for course and path publish readiness
 */

import type { Course, LearningPath, CourseSection, Lesson } from '@gravyty/domain';

export interface ValidationIssue {
  severity: 'error' | 'warning';
  field: string;
  message: string;
  // Structured entity information for navigation
  entityType?: 'course' | 'section' | 'lesson';
  entityId?: string;
  fieldKey?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: ValidationError[];
}

// Backward compatibility: map ValidationIssue to ValidationError
export function issueToError(issue: ValidationIssue): ValidationError {
  return { field: issue.field, message: issue.message };
}

/**
 * Validate course publish readiness
 */
export function validateCoursePublish(course: Course, lessons: Lesson[]): ValidationResult {
  const errors: ValidationError[] = [];

  // Required fields
  if (!course.title || course.title.trim() === '') {
    errors.push({ field: 'title', message: 'Course title is required' });
  }

  if (!course.short_description || course.short_description.trim() === '') {
    errors.push({ field: 'short_description', message: 'Short description is required' });
  }

  // Structure validation
  if (!course.sections || course.sections.length === 0) {
    errors.push({ field: 'sections', message: 'Course must have at least one section' });
  } else {
    // Validate sections
    course.sections.forEach((section, sectionIndex) => {
      if (!section.title || section.title.trim() === '') {
        errors.push({
          field: `sections[${sectionIndex}].title`,
          message: `Section ${sectionIndex + 1} must have a title`,
        });
      }

      if (!section.lesson_ids || section.lesson_ids.length === 0) {
        errors.push({
          field: `sections[${sectionIndex}].lessons`,
          message: `Section "${section.title || sectionIndex + 1}" must have at least one lesson`,
        });
      }
    });

    // Validate lessons
    const lessonIds = new Set<string>();
    course.sections.forEach((section, sectionIndex) => {
      section.lesson_ids.forEach((lessonId, lessonIndex) => {
        if (lessonIds.has(lessonId)) {
          errors.push({
            field: `sections[${sectionIndex}].lessons[${lessonIndex}]`,
            message: `Duplicate lesson ID: ${lessonId}`,
          });
        }
        lessonIds.add(lessonId);

        const lesson = lessons.find((l) => l.lesson_id === lessonId);
        if (!lesson) {
          errors.push({
            field: `sections[${sectionIndex}].lessons[${lessonIndex}]`,
            message: `Lesson ${lessonId} not found`,
          });
        } else {
          // Validate lesson fields
          if (!lesson.title || lesson.title.trim() === '') {
            errors.push({
              field: `lessons[${lessonId}].title`,
              message: `Lesson "${lessonId}" must have a title`,
            });
          }

          // Validate lesson content per type
          if (!lesson.content) {
            errors.push({
              field: `lessons[${lessonId}].content`,
              message: `Lesson "${lesson.title || lessonId}" must have content`,
            });
          } else {
            // Ensure type and content.kind match
            if (lesson.type !== lesson.content.kind) {
              errors.push({
                field: `lessons[${lessonId}].content`,
                message: `Lesson type "${lesson.type}" does not match content kind "${lesson.content.kind}"`,
              });
            }

            // Type-specific validation (same rules as validateCourseDraft)
            switch (lesson.content.kind) {
              case 'video':
                if (!lesson.content.video_id || lesson.content.video_id.trim() === '') {
                  errors.push({
                    field: `lessons[${lessonId}].content.video_id`,
                    message: `Video lesson "${lesson.title || lessonId}" must have a video_id`,
                  });
                }
                if (!lesson.content.duration_seconds || lesson.content.duration_seconds <= 0) {
                  errors.push({
                    field: `lessons[${lessonId}].content.duration_seconds`,
                    message: `Video lesson "${lesson.title || lessonId}" must have duration_seconds > 0`,
                  });
                }
                break;

              case 'reading':
                if (!lesson.content.markdown || lesson.content.markdown.trim() === '') {
                  errors.push({
                    field: `lessons[${lessonId}].content.markdown`,
                    message: `Reading lesson "${lesson.title || lessonId}" must have non-empty markdown`,
                  });
                }
                break;

              case 'quiz':
                if (!lesson.content.questions || lesson.content.questions.length === 0) {
                  errors.push({
                    field: `lessons[${lessonId}].content.questions`,
                    message: `Quiz lesson "${lesson.title || lessonId}" must have at least one question`,
                  });
                } else {
                  lesson.content.questions.forEach((question, qIndex) => {
                    if (!question.options || question.options.length < 2) {
                      errors.push({
                        field: `lessons[${lessonId}].content.questions[${qIndex}].options`,
                        message: `Quiz question "${question.prompt || qIndex}" must have at least 2 options`,
                      });
                    }
                    if (!question.correct_option_id) {
                      errors.push({
                        field: `lessons[${lessonId}].content.questions[${qIndex}].correct_option_id`,
                        message: `Quiz question "${question.prompt || qIndex}" must have a correct_option_id`,
                      });
                    } else {
                      const optionIds = question.options.map((opt) => opt.option_id);
                      if (!optionIds.includes(question.correct_option_id)) {
                        errors.push({
                          field: `lessons[${lessonId}].content.questions[${qIndex}].correct_option_id`,
                          message: `Quiz question "${question.prompt || qIndex}" correct_option_id must match one of the options`,
                        });
                      }
                    }
                  });
                }
                break;

              case 'assignment':
                if (!lesson.content.instructions_markdown || lesson.content.instructions_markdown.trim() === '') {
                  errors.push({
                    field: `lessons[${lessonId}].content.instructions_markdown`,
                    message: `Assignment lesson "${lesson.title || lessonId}" must have non-empty instructions_markdown`,
                  });
                }
                if (!lesson.content.submission_type) {
                  errors.push({
                    field: `lessons[${lessonId}].content.submission_type`,
                    message: `Assignment lesson "${lesson.title || lessonId}" must have a submission_type`,
                  });
                }
                break;

              case 'interactive':
                if (!lesson.content.embed_url || lesson.content.embed_url.trim() === '') {
                  errors.push({
                    field: `lessons[${lessonId}].content.embed_url`,
                    message: `Interactive lesson "${lesson.title || lessonId}" must have an embed_url`,
                  });
                } else {
                  try {
                    new URL(lesson.content.embed_url);
                  } catch {
                    errors.push({
                      field: `lessons[${lessonId}].content.embed_url`,
                      message: `Interactive lesson "${lesson.title || lessonId}" embed_url must be a valid URL`,
                    });
                  }
                }
                break;
            }
          }
        }
      });
    });

    // Validate ordering is contiguous
    course.sections.forEach((section, sectionIndex) => {
      if (section.order !== sectionIndex) {
        errors.push({
          field: `sections[${sectionIndex}].order`,
          message: `Section ordering must be contiguous (expected ${sectionIndex}, got ${section.order})`,
        });
      }
    });

    // Validate lesson ordering within sections
    course.sections.forEach((section, sectionIndex) => {
      section.lesson_ids.forEach((lessonId, lessonIndex) => {
        const lesson = lessons.find((l) => l.lesson_id === lessonId);
        if (lesson && lesson.order !== lessonIndex) {
          errors.push({
            field: `lessons[${lessonId}].order`,
            message: `Lesson ordering must be contiguous within section (expected ${lessonIndex}, got ${lesson.order})`,
          });
        }
      });
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate path publish readiness
 */
export function validatePathPublish(path: LearningPath): ValidationResult {
  const errors: ValidationError[] = [];

  // Required fields
  if (!path.title || path.title.trim() === '') {
    errors.push({ field: 'title', message: 'Path title is required' });
  }

  // Structure validation
  if (!path.courses || path.courses.length === 0) {
    errors.push({ field: 'courses', message: 'Path must have at least one course' });
  } else {
    // Validate course IDs are unique
    const courseIds = new Set<string>();
    path.courses.forEach((courseRef, index) => {
      if (courseIds.has(courseRef.course_id)) {
        errors.push({
          field: `courses[${index}].course_id`,
          message: `Duplicate course ID: ${courseRef.course_id}`,
        });
      }
      courseIds.add(courseRef.course_id);
    });

    // Validate ordering is contiguous
    path.courses.forEach((courseRef, index) => {
      if (courseRef.order !== index) {
        errors.push({
          field: `courses[${index}].order`,
          message: `Course ordering must be contiguous (expected ${index}, got ${courseRef.order})`,
        });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get a user-friendly summary of validation errors
 */
export function getValidationSummary(result: ValidationResult): string {
  if (result.valid) {
    return 'All validations passed';
  }

  if (result.errors.length === 1) {
    return result.errors[0].message;
  }

  return `${result.errors.length} validation error${result.errors.length > 1 ? 's' : ''} found`;
}

/**
 * Validate course draft (returns errors and warnings)
 */
export function validateCourseDraft(course: Course, lessons: Lesson[]): { errors: ValidationIssue[]; warnings: ValidationIssue[] } {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // Required fields
  if (!course.title || course.title.trim() === '') {
    errors.push({ 
      severity: 'error', 
      field: 'title', 
      message: 'Course title is required',
      entityType: 'course',
      entityId: course.course_id,
      fieldKey: 'title',
    });
  }

  if (!course.short_description || course.short_description.trim() === '') {
    warnings.push({ 
      severity: 'warning', 
      field: 'short_description', 
      message: 'Short description is recommended but not required',
      entityType: 'course',
      entityId: course.course_id,
      fieldKey: 'short_description',
    });
  }

  // Warnings for optional but recommended fields
  if (!course.description || course.description.trim() === '') {
    warnings.push({ 
      severity: 'warning', 
      field: 'description', 
      message: 'Description is recommended but not required',
      entityType: 'course',
      entityId: course.course_id,
      fieldKey: 'description',
    });
  }

  if (!course.cover_image) {
    warnings.push({ 
      severity: 'warning', 
      field: 'cover_image', 
      message: 'Cover image is recommended but not required',
      entityType: 'course',
      entityId: course.course_id,
      fieldKey: 'cover_image',
    });
  }

  // Structure validation
  if (!course.sections || course.sections.length === 0) {
    errors.push({ 
      severity: 'error', 
      field: 'sections', 
      message: 'Course must have at least one section',
      entityType: 'course',
      entityId: course.course_id,
      fieldKey: 'sections',
    });
  } else {
    // Validate sections
    course.sections.forEach((section, sectionIndex) => {
      if (!section.title || section.title.trim() === '') {
        errors.push({
          severity: 'error',
          field: `sections[${sectionIndex}].title`,
          message: `Section ${sectionIndex + 1} must have a title`,
          entityType: 'section',
          entityId: section.section_id,
          fieldKey: 'title',
        });
      }

      if (!section.lesson_ids || section.lesson_ids.length === 0) {
        errors.push({
          severity: 'error',
          field: `sections[${sectionIndex}].lessons`,
          message: `Section "${section.title || sectionIndex + 1}" must have at least one lesson`,
          entityType: 'section',
          entityId: section.section_id,
          fieldKey: 'lessons',
        });
      }
    });

    // Validate lessons
    const lessonIds = new Set<string>();
    course.sections.forEach((section, sectionIndex) => {
      section.lesson_ids.forEach((lessonId, lessonIndex) => {
        if (lessonIds.has(lessonId)) {
          errors.push({
            severity: 'error',
            field: `sections[${sectionIndex}].lessons[${lessonIndex}]`,
            message: `Duplicate lesson ID: ${lessonId}`,
          });
        }
        lessonIds.add(lessonId);

        const lesson = lessons.find((l) => l.lesson_id === lessonId);
        if (!lesson) {
          errors.push({
            severity: 'error',
            field: `sections[${sectionIndex}].lessons[${lessonIndex}]`,
            message: `Lesson ${lessonId} not found`,
          });
        } else {
          // Validate lesson fields
          if (!lesson.title || lesson.title.trim() === '') {
            errors.push({
              severity: 'error',
              field: `lessons[${lessonId}].title`,
              message: `Lesson "${lessonId}" must have a title`,
              entityType: 'lesson',
              entityId: lessonId,
              fieldKey: 'title',
            });
          }

          // Validate lesson content per type
          if (!lesson.content) {
            errors.push({
              severity: 'error',
              field: `lessons[${lessonId}].content`,
              message: `Lesson "${lesson.title || lessonId}" must have content`,
              entityType: 'lesson',
              entityId: lessonId,
              fieldKey: 'content',
            });
          } else {
            // Ensure type and content.kind match
            if (lesson.type !== lesson.content.kind) {
              errors.push({
                severity: 'error',
                field: `lessons[${lessonId}].content`,
                message: `Lesson type "${lesson.type}" does not match content kind "${lesson.content.kind}"`,
                entityType: 'lesson',
                entityId: lessonId,
                fieldKey: 'content',
              });
            }

            // Type-specific validation
            switch (lesson.content.kind) {
              case 'video':
                if (!lesson.content.video_id || lesson.content.video_id.trim() === '') {
                  errors.push({
                    severity: 'error',
                    field: `lessons[${lessonId}].content.video_id`,
                    message: `Video lesson "${lesson.title || lessonId}" must have a video_id`,
                    entityType: 'lesson',
                    entityId: lessonId,
                    fieldKey: 'content.video_id',
                  });
                }
                if (!lesson.content.duration_seconds || lesson.content.duration_seconds <= 0) {
                  errors.push({
                    severity: 'error',
                    field: `lessons[${lessonId}].content.duration_seconds`,
                    message: `Video lesson "${lesson.title || lessonId}" must have duration_seconds > 0`,
                    entityType: 'lesson',
                    entityId: lessonId,
                    fieldKey: 'content.duration_seconds',
                  });
                }
                break;

              case 'reading':
                if (!lesson.content.markdown || lesson.content.markdown.trim() === '') {
                  errors.push({
                    severity: 'error',
                    field: `lessons[${lessonId}].content.markdown`,
                    message: `Reading lesson "${lesson.title || lessonId}" must have non-empty markdown`,
                    entityType: 'lesson',
                    entityId: lessonId,
                    fieldKey: 'content.markdown',
                  });
                }
                break;

              case 'quiz':
                if (!lesson.content.questions || lesson.content.questions.length === 0) {
                  errors.push({
                    severity: 'error',
                    field: `lessons[${lessonId}].content.questions`,
                    message: `Quiz lesson "${lesson.title || lessonId}" must have at least one question`,
                    entityType: 'lesson',
                    entityId: lessonId,
                    fieldKey: 'content.questions',
                  });
                } else {
                  lesson.content.questions.forEach((question, qIndex) => {
                    if (!question.options || question.options.length < 2) {
                      errors.push({
                        severity: 'error',
                        field: `lessons[${lessonId}].content.questions[${qIndex}].options`,
                        message: `Quiz question "${question.prompt || qIndex}" must have at least 2 options`,
                        entityType: 'lesson',
                        entityId: lessonId,
                        fieldKey: `content.questions[${qIndex}].options`,
                      });
                    }
                    if (!question.correct_option_id) {
                      errors.push({
                        severity: 'error',
                        field: `lessons[${lessonId}].content.questions[${qIndex}].correct_option_id`,
                        message: `Quiz question "${question.prompt || qIndex}" must have a correct_option_id`,
                        entityType: 'lesson',
                        entityId: lessonId,
                        fieldKey: `content.questions[${qIndex}].correct_option_id`,
                      });
                    } else {
                      // Validate correct_option_id matches one of the options
                      const optionIds = question.options.map((opt) => opt.option_id);
                      if (!optionIds.includes(question.correct_option_id)) {
                        errors.push({
                          severity: 'error',
                          field: `lessons[${lessonId}].content.questions[${qIndex}].correct_option_id`,
                          message: `Quiz question "${question.prompt || qIndex}" correct_option_id must match one of the options`,
                          entityType: 'lesson',
                          entityId: lessonId,
                          fieldKey: `content.questions[${qIndex}].correct_option_id`,
                        });
                      }
                    }
                  });
                }
                break;

              case 'assignment':
                if (!lesson.content.instructions_markdown || lesson.content.instructions_markdown.trim() === '') {
                  errors.push({
                    severity: 'error',
                    field: `lessons[${lessonId}].content.instructions_markdown`,
                    message: `Assignment lesson "${lesson.title || lessonId}" must have non-empty instructions_markdown`,
                    entityType: 'lesson',
                    entityId: lessonId,
                    fieldKey: 'content.instructions_markdown',
                  });
                }
                if (!lesson.content.submission_type) {
                  errors.push({
                    severity: 'error',
                    field: `lessons[${lessonId}].content.submission_type`,
                    message: `Assignment lesson "${lesson.title || lessonId}" must have a submission_type`,
                    entityType: 'lesson',
                    entityId: lessonId,
                    fieldKey: 'content.submission_type',
                  });
                }
                break;

              case 'interactive':
                if (!lesson.content.embed_url || lesson.content.embed_url.trim() === '') {
                  errors.push({
                    severity: 'error',
                    field: `lessons[${lessonId}].content.embed_url`,
                    message: `Interactive lesson "${lesson.title || lessonId}" must have an embed_url`,
                    entityType: 'lesson',
                    entityId: lessonId,
                    fieldKey: 'content.embed_url',
                  });
                } else {
                  // Basic URL validation
                  try {
                    new URL(lesson.content.embed_url);
                  } catch {
                    errors.push({
                      severity: 'error',
                      field: `lessons[${lessonId}].content.embed_url`,
                      message: `Interactive lesson "${lesson.title || lessonId}" embed_url must be a valid URL`,
                      entityType: 'lesson',
                      entityId: lessonId,
                      fieldKey: 'content.embed_url',
                    });
                  }
                }
                break;
            }
          }
        }
      });
    });
  }

  return { errors, warnings };
}

/**
 * Validate path draft (returns errors and warnings)
 */
export function validatePathDraft(path: LearningPath): { errors: ValidationIssue[]; warnings: ValidationIssue[] } {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // Required fields
  if (!path.title || path.title.trim() === '') {
    errors.push({ severity: 'error', field: 'title', message: 'Path title is required' });
  }

  // Warnings for optional fields
  if (!path.description || path.description.trim() === '') {
    warnings.push({ severity: 'warning', field: 'description', message: 'Description is recommended but not required' });
  }

  // Structure validation
  if (!path.courses || path.courses.length === 0) {
    errors.push({ severity: 'error', field: 'courses', message: 'Path must have at least one course' });
  } else {
    // Validate course IDs are unique
    const courseIds = new Set<string>();
    path.courses.forEach((courseRef, index) => {
      if (courseIds.has(courseRef.course_id)) {
        errors.push({
          severity: 'error',
          field: `courses[${index}].course_id`,
          message: `Duplicate course ID: ${courseRef.course_id}`,
        });
      }
      courseIds.add(courseRef.course_id);
    });
  }

  return { errors, warnings };
}

