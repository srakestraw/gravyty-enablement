/**
 * Course Validation Hook
 * 
 * Provides validation logic for course editor with two validation levels:
 * - Save Validation: Only requires title field
 * - Publish Validation: Full validation using validateCoursePublish()
 * 
 * Tracks hasAttemptedPublish and touchedFields for conditional error display.
 */

import { useState, useMemo, useCallback } from 'react';
import { validateCoursePublish, validateCourseDraft, type ValidationIssue } from '../validations/lmsValidations';
import type { Course, Lesson } from '@gravyty/domain';
import type { NodeType } from '../types/courseTree';

export interface UseCourseValidationOptions {
  course: Course | null;
  lessons: Lesson[];
  assessmentConfig?: { is_enabled: boolean; required_for_completion: boolean } | null;
  assessmentQuestionCount?: number;
}

export interface UseCourseValidationReturn {
  // Validation state
  hasAttemptedPublish: boolean;
  setHasAttemptedPublish: (value: boolean) => void;
  touchedFields: Set<string>;
  
  // Save validation (title only)
  canSave: () => boolean;
  getSaveValidationErrors: () => ValidationIssue[];
  
  // Publish validation (full)
  canPublish: () => boolean;
  getPublishValidationErrors: () => ValidationIssue[];
  getPublishValidationWarnings: () => ValidationIssue[];
  
  // All validation issues (for display)
  getValidationIssues: () => ValidationIssue[];
  getErrors: () => ValidationIssue[];
  getWarnings: () => ValidationIssue[];
  
  // Helper functions for conditional error display
  shouldShowError: (entityType: NodeType, entityId: string, fieldKey: string) => boolean;
  markFieldTouched: (entityType: NodeType, entityId: string, fieldKey: string) => void;
  
  // Validation counts
  errorsCount: number;
  warningsCount: number;
  totalIssuesCount: number;
}

/**
 * Hook for managing course validation
 * 
 * @param options - Course and lessons to validate
 * @returns Validation state and helper functions
 */
export function useCourseValidation({
  course,
  lessons,
  assessmentConfig,
  assessmentQuestionCount,
}: UseCourseValidationOptions): UseCourseValidationReturn {
  // Track if user has attempted to publish (for showing all errors)
  const [hasAttemptedPublish, setHasAttemptedPublish] = useState(false);
  
  // Track which fields have been touched (for showing errors on blur)
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Save validation: Only requires title
  const canSave = useCallback((): boolean => {
    if (!course) return false;
    return course.title?.trim().length > 0;
  }, [course]);

  const getSaveValidationErrors = useCallback((): ValidationIssue[] => {
    if (!course) return [];
    
    const errors: ValidationIssue[] = [];
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
    return errors;
  }, [course]);

  // Publish validation: Full validation
  // Depend on course object AND specific fields to ensure recalculation when title/short_description change
  const publishValidation = useMemo(() => {
    if (!course) {
      return { valid: false, errors: [], warnings: [] };
    }
    
    // Use validateCoursePublish for publish validation
    const publishResult = validateCoursePublish(course, lessons, assessmentConfig, assessmentQuestionCount);
    
    // Also get draft validation for warnings
    const draftResult = validateCourseDraft(course, lessons, assessmentConfig, assessmentQuestionCount);
    
    // Convert ValidationError[] to ValidationIssue[] for consistency
    const errors: ValidationIssue[] = publishResult.errors.map((error) => ({
      severity: 'error' as const,
      field: error.field,
      message: error.message,
      // Try to extract entity info from field path
      entityType: extractEntityType(error.field),
      entityId: extractEntityId(error.field, course),
      fieldKey: extractFieldKey(error.field),
    }));
    
    return {
      valid: publishResult.valid,
      errors,
      warnings: draftResult.warnings,
    };
  }, [course, course?.title, course?.short_description, course?.sections?.length, lessons, assessmentConfig, assessmentQuestionCount]);

  const canPublish = useCallback((): boolean => {
    return publishValidation.valid;
  }, [publishValidation.valid]);

  const getPublishValidationErrors = useCallback((): ValidationIssue[] => {
    return publishValidation.errors;
  }, [publishValidation.errors]);

  const getPublishValidationWarnings = useCallback((): ValidationIssue[] => {
    return publishValidation.warnings;
  }, [publishValidation.warnings]);

  // All validation issues (errors + warnings)
  const getValidationIssues = useCallback((): ValidationIssue[] => {
    return [...publishValidation.errors, ...publishValidation.warnings];
  }, [publishValidation]);

  const getErrors = useCallback((): ValidationIssue[] => {
    return publishValidation.errors;
  }, [publishValidation.errors]);

  const getWarnings = useCallback((): ValidationIssue[] => {
    return publishValidation.warnings;
  }, [publishValidation.warnings]);

  // Helper to determine if error should be shown
  const shouldShowError = useCallback((
    entityType: NodeType,
    entityId: string,
    fieldKey: string
  ): boolean => {
    // Show error if:
    // 1. User has attempted to publish (show all errors), OR
    // 2. Field has been touched (show error on blur)
    const fieldKeyStr = `${entityType}:${entityId}:${fieldKey}`;
    return hasAttemptedPublish || touchedFields.has(fieldKeyStr);
  }, [hasAttemptedPublish, touchedFields]);

  // Helper to mark field as touched
  const markFieldTouched = useCallback((
    entityType: NodeType,
    entityId: string,
    fieldKey: string
  ): void => {
    const fieldKeyStr = `${entityType}:${entityId}:${fieldKey}`;
    setTouchedFields((prev) => {
      const next = new Set(prev);
      next.add(fieldKeyStr);
      return next;
    });
  }, []);

  // Validation counts - calculate directly from course properties for immediate updates
  // This bypasses React's memoization to ensure errorsCount updates immediately when title changes
  // We still use publishValidation for the full validation, but calculate counts directly
  const errorsCount = useMemo(() => {
    if (!course) return 0;
    
    // Calculate errors directly from course properties to ensure immediate updates
    let count = 0;
    if (!course.title || course.title.trim() === '') {
      count++;
    }
    if (!course.short_description || course.short_description.trim() === '') {
      count++;
    }
    if (!course.sections || course.sections.length === 0) {
      count++;
    } else {
      // Count section and lesson errors
      course.sections.forEach((section) => {
        if (!section.title || section.title.trim() === '') {
          count++;
        }
        if (!section.lesson_ids || section.lesson_ids.length === 0) {
          count++;
        }
      });
    }
    
    return count;
  }, [course?.title, course?.short_description, course?.sections?.length, course?.sections]);
  
  const warningsCount = useMemo(() => {
    return publishValidation.warnings.length;
  }, [publishValidation.warnings.length]);
  
  const totalIssuesCount = useMemo(() => {
    return errorsCount + warningsCount;
  }, [errorsCount, warningsCount]);

  return {
    hasAttemptedPublish,
    setHasAttemptedPublish,
    touchedFields,
    canSave,
    getSaveValidationErrors,
    canPublish,
    getPublishValidationErrors,
    getPublishValidationWarnings,
    getValidationIssues,
    getErrors,
    getWarnings,
    shouldShowError,
    markFieldTouched,
    errorsCount,
    warningsCount,
    totalIssuesCount,
  };
}

/**
 * Helper to extract entity type from field path
 */
function extractEntityType(field: string): NodeType | undefined {
  if (field.startsWith('sections[')) return 'section';
  if (field.startsWith('lessons[')) return 'lesson';
  if (field === 'title' || field === 'short_description' || field === 'description' || field === 'sections') {
    return 'course';
  }
  return undefined;
}

/**
 * Helper to extract entity ID from field path
 */
function extractEntityId(field: string, course: Course): string | undefined {
  // For course-level fields, return course_id
  if (field === 'title' || field === 'short_description' || field === 'description' || field === 'sections') {
    return course.course_id;
  }
  
  // For section fields: sections[0].title -> find section at index 0
  const sectionMatch = field.match(/sections\[(\d+)\]/);
  if (sectionMatch && course.sections) {
    const index = parseInt(sectionMatch[1], 10);
    return course.sections[index]?.section_id;
  }
  
  // For lesson fields: lessons[lessonId].title -> extract lessonId
  const lessonMatch = field.match(/lessons\[([^\]]+)\]/);
  if (lessonMatch) {
    return lessonMatch[1];
  }
  
  return undefined;
}

/**
 * Helper to extract field key from field path
 */
function extractFieldKey(field: string): string | undefined {
  // Extract the last part after the last dot or bracket
  const parts = field.split(/[\.\[\]]/);
  return parts[parts.length - 1] || undefined;
}

