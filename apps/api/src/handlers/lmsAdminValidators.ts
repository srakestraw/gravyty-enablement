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
export function validateCoursePublish(
  course: Course,
  lessons: Lesson[],
  assessmentConfig?: { is_enabled: boolean; required_for_completion: boolean } | null,
  assessmentQuestionCount?: number
): ValidationResult {
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

      // Validate lesson content per type
      lessons.forEach((lesson, lessonIndex) => {
        // Ensure type and content.kind match
        if (lesson.type !== lesson.content.kind) {
          errors.push({
            field: `lessons[${lessonIndex}].content`,
            message: `Lesson type "${lesson.type}" does not match content kind "${lesson.content.kind}"`,
          });
        }

        // Type-specific validation
        switch (lesson.content.kind) {
          case 'video':
            if (!lesson.content.video_id || lesson.content.video_id.trim() === '') {
              errors.push({
                field: `lessons[${lessonIndex}].content.video_id`,
                message: `Video lesson "${lesson.title || lesson.lesson_id}" must have a video_id`,
              });
            }
            if (!lesson.content.duration_seconds || lesson.content.duration_seconds <= 0) {
              errors.push({
                field: `lessons[${lessonIndex}].content.duration_seconds`,
                message: `Video lesson "${lesson.title || lesson.lesson_id}" must have duration_seconds > 0`,
              });
            }
            break;

          case 'reading':
            if (!lesson.content.markdown || lesson.content.markdown.trim() === '') {
              errors.push({
                field: `lessons[${lessonIndex}].content.markdown`,
                message: `Reading lesson "${lesson.title || lesson.lesson_id}" must have non-empty markdown`,
              });
            }
            break;

          case 'quiz':
            if (!lesson.content.questions || lesson.content.questions.length === 0) {
              errors.push({
                field: `lessons[${lessonIndex}].content.questions`,
                message: `Quiz lesson "${lesson.title || lesson.lesson_id}" must have at least one question`,
              });
            } else {
              lesson.content.questions.forEach((question, qIndex) => {
                if (!question.options || question.options.length < 2) {
                  errors.push({
                    field: `lessons[${lessonIndex}].content.questions[${qIndex}].options`,
                    message: `Quiz question "${question.prompt || qIndex}" must have at least 2 options`,
                  });
                }
                if (!question.correct_option_id) {
                  errors.push({
                    field: `lessons[${lessonIndex}].content.questions[${qIndex}].correct_option_id`,
                    message: `Quiz question "${question.prompt || qIndex}" must have a correct_option_id`,
                  });
                } else {
                  // Validate correct_option_id matches one of the options
                  const optionIds = question.options.map((opt) => opt.option_id);
                  if (!optionIds.includes(question.correct_option_id)) {
                    errors.push({
                      field: `lessons[${lessonIndex}].content.questions[${qIndex}].correct_option_id`,
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
                field: `lessons[${lessonIndex}].content.instructions_markdown`,
                message: `Assignment lesson "${lesson.title || lesson.lesson_id}" must have non-empty instructions_markdown`,
              });
            }
            if (!lesson.content.submission_type) {
              errors.push({
                field: `lessons[${lessonIndex}].content.submission_type`,
                message: `Assignment lesson "${lesson.title || lesson.lesson_id}" must have a submission_type`,
              });
            }
            break;

          case 'interactive':
            if (!lesson.content.embed_url || lesson.content.embed_url.trim() === '') {
              errors.push({
                field: `lessons[${lessonIndex}].content.embed_url`,
                message: `Interactive lesson "${lesson.title || lesson.lesson_id}" must have an embed_url`,
              });
            } else {
              // Basic URL validation
              try {
                new URL(lesson.content.embed_url);
              } catch {
                errors.push({
                  field: `lessons[${lessonIndex}].content.embed_url`,
                  message: `Interactive lesson "${lesson.title || lesson.lesson_id}" embed_url must be a valid URL`,
                });
              }
            }
            break;
        }
      });
    }
  }

  // Assessment validation
  if (assessmentConfig?.is_enabled) {
    const questionCount = assessmentQuestionCount ?? 0;
    if (questionCount === 0) {
      errors.push({
        field: 'assessment',
        message: 'Assessment is enabled but has no questions. Add at least one question or disable the assessment.',
      });
    }
  }

  if (assessmentConfig?.required_for_completion) {
    if (!assessmentConfig.is_enabled) {
      errors.push({
        field: 'assessment.required_for_completion',
        message: 'Assessment is required for completion but is not enabled. Enable the assessment or remove the requirement.',
      });
    } else {
      const questionCount = assessmentQuestionCount ?? 0;
      if (questionCount === 0) {
        errors.push({
          field: 'assessment',
          message: 'Assessment is required for completion but has no questions. Add at least one question.',
        });
      }
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



