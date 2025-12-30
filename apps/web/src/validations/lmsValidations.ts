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

          // If lesson type is video, it should have media_ref
          if (lesson.type === 'video' && !lesson.video_media) {
            errors.push({
              field: `lessons[${lessonId}].video_media`,
              message: `Video lesson "${lesson.title || lessonId}" must have a video media reference`,
            });
          }

          // Validate transcript if present
          if (lesson.transcript && lesson.transcript.full_text !== undefined) {
            if (lesson.transcript.full_text.trim() === '') {
              errors.push({
                field: `lessons[${lessonId}].transcript.full_text`,
                message: `Lesson "${lesson.title || lessonId}" transcript full_text cannot be empty if provided`,
              });
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
    errors.push({ severity: 'error', field: 'title', message: 'Course title is required' });
  }

  if (!course.short_description || course.short_description.trim() === '') {
    errors.push({ severity: 'error', field: 'short_description', message: 'Short description is required' });
  }

  // Warnings for optional but recommended fields
  if (!course.description || course.description.trim() === '') {
    warnings.push({ severity: 'warning', field: 'description', message: 'Description is recommended but not required' });
  }

  if (!course.cover_image) {
    warnings.push({ severity: 'warning', field: 'cover_image', message: 'Cover image is recommended but not required' });
  }

  // Structure validation
  if (!course.sections || course.sections.length === 0) {
    errors.push({ severity: 'error', field: 'sections', message: 'Course must have at least one section' });
  } else {
    // Validate sections
    course.sections.forEach((section, sectionIndex) => {
      if (!section.title || section.title.trim() === '') {
        errors.push({
          severity: 'error',
          field: `sections[${sectionIndex}].title`,
          message: `Section ${sectionIndex + 1} must have a title`,
        });
      }

      if (!section.lesson_ids || section.lesson_ids.length === 0) {
        errors.push({
          severity: 'error',
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
            });
          }

          // If lesson type is video, it should have media_ref
          if (lesson.type === 'video' && !lesson.video_media) {
            errors.push({
              severity: 'error',
              field: `lessons[${lessonId}].video_media`,
              message: `Video lesson "${lesson.title || lessonId}" must have a video media reference`,
            });
          }

          // Validate transcript if present
          if (lesson.transcript && lesson.transcript.full_text !== undefined) {
            if (lesson.transcript.full_text.trim() === '') {
              errors.push({
                severity: 'error',
                field: `lessons[${lessonId}].transcript.full_text`,
                message: `Lesson "${lesson.title || lessonId}" transcript full_text cannot be empty if provided`,
              });
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

