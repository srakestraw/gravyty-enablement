/**
 * LMS Admin Validators
 * 
 * Server-side validation helpers for admin operations
 */

import type { Course, LearningPath, Lesson } from '@gravyty/domain';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
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

    // Validate lessons exist
    if (lessons.length === 0) {
      errors.push({
        field: 'lessons',
        message: 'Course must have at least one lesson',
      });
    } else {
      // Validate all lesson IDs referenced exist
      const lessonIds = new Set(lessons.map((l) => l.lesson_id));
      course.sections.forEach((section, sectionIndex) => {
        section.lesson_ids.forEach((lessonId, lessonIndex) => {
          if (!lessonIds.has(lessonId)) {
            errors.push({
              field: `sections[${sectionIndex}].lessons[${lessonIndex}]`,
              message: `Lesson ${lessonId} not found`,
            });
          }
        });
      });
    }
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
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}


